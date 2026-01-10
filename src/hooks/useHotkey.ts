import { useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useTauriEvent } from './useTauriEvents';
import { useRecordingStore } from '../stores/recordingStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useErrorStore } from '../stores/errorStore';
import { 
  startRecording, stopRecording, transcribeAndPolish,
  setTrayRecording, setTrayProcessing, setTrayIdle, dbAddHistory,
  dbGetDictionaryPrompt, dbProcessSnippets
} from '../lib/tauri';
import { perfMonitor } from '../lib/performance';

export function useHotkey() {
  const { state, setState, setTranscript, setError, reset } = useRecordingStore();
  const { apiKey, language, shouldPolish, hotkey, autoPaste, apiProvider } = useSettingsStore();
  const { addError } = useErrorStore();

  useEffect(() => {
    const registerHotkey = async () => {
      try {
        await invoke('set_global_hotkey', { hotkey });
        console.log('Hotkey registered:', hotkey);
      } catch (err) {
        console.error('Failed to register hotkey:', err);
      }
    };

    registerHotkey();

    return () => {
      invoke('clear_global_hotkey').catch(console.error);
    };
  }, [hotkey]);

  const handleHotkeyPress = useCallback(async () => {
    if (state === 'processing') return;

    if (state === 'idle') {
      if (!apiKey) {
        addError({ 
          message: `Please configure your ${apiProvider === 'groq' ? 'Groq' : 'OpenAI'} API key`, 
          type: 'warning',
          action: { label: 'Open Settings', onClick: () => {} }
        });
        return;
      }

      try {
        perfMonitor.start('recording');
        setTranscript(null);
        setError(null);
        await startRecording();
        await setTrayRecording();
        setState('recording');
      } catch (err) {
        const errorMsg = String(err);
        setError(errorMsg);
        addError({ message: `Recording failed: ${errorMsg}`, type: 'error' });
      }
    } else if (state === 'recording') {
      setState('processing');
      await setTrayProcessing();
      perfMonitor.end('recording');

      perfMonitor.start('transcription');

      try {
        const audioData = await stopRecording();
        
        if (audioData.length === 0) {
          throw new Error('No audio recorded. Please speak into your microphone.');
        }

        // Get dictionary prompt for better recognition
        await dbGetDictionaryPrompt(); // TODO: Pass to transcribe API when prompt parameter is added
        
        const result = await transcribeAndPolish(
          audioData,
          apiKey,
          language,
          shouldPolish,
          apiProvider
        );

        // Process snippets (replace trigger phrases with content)
        let finalText = result.polished_text || result.raw_text;
        const snippetResult = await dbProcessSnippets(finalText);
        finalText = snippetResult.text;
        
        perfMonitor.end('transcription');
        const recordingDuration = perfMonitor.getMetric('recording')?.duration || 0;

        setTranscript(finalText);

        // Save to history
        await dbAddHistory({
          raw_text: result.raw_text,
          polished_text: result.polished_text || undefined,
          duration_seconds: recordingDuration / 1000,
          language,
        });

        if (autoPaste && finalText) {
          await invoke('paste', { text: finalText, restoreClipboard: true });
        }

        setState('done');
        await setTrayIdle();

        setTimeout(() => {
          reset();
        }, 2000);
      } catch (err) {
        const errorMsg = String(err);
        setError(errorMsg);
        
        // Show user-friendly error toast
        if (errorMsg.includes('API key') || errorMsg.includes('401')) {
          addError({ 
            message: 'Invalid API key. Please check your settings.', 
            type: 'error',
            action: { label: 'Open Settings', onClick: () => {} }
          });
        } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
          addError({ message: 'Rate limit exceeded. Please wait and try again.', type: 'warning' });
        } else if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          addError({ message: 'Network error. Check your connection.', type: 'error' });
        } else {
          addError({ message: errorMsg, type: 'error' });
        }
        
        setState('idle');
        await setTrayIdle();
      }
    } else if (state === 'done') {
      reset();
    }
  }, [state, apiKey, language, shouldPolish, autoPaste, setState, setTranscript, setError, reset, addError]);

  useTauriEvent('hotkey_pressed', handleHotkeyPress);
  useTauriEvent('toggle_recording', handleHotkeyPress);

  return { handleHotkeyPress };
}
