import { useRecordingStore } from '../stores/recordingStore';
import { useSettingsStore } from '../stores/settingsStore';
import { startRecording, stopRecording, transcribeAndPolish } from '../lib/tauri';

export const RecordButton = () => {
  const { state, setState, setTranscript, setError } = useRecordingStore();
  const { getTranscriptionApiKey, getPolishingApiKey, language, shouldPolish, transcriptionProvider, polishingProvider } = useSettingsStore();

  const handleToggleRecording = async () => {
    try {
      if (state === 'idle') {
        const transcriptionKey = getTranscriptionApiKey();
        if (!transcriptionKey) {
          setError(`Please enter your ${transcriptionProvider === 'groq' ? 'Groq' : 'OpenAI'} API key first`);
          return;
        }
        setTranscript(null);
        setError(null);
        await startRecording();
        setState('recording');
      } else if (state === 'recording') {
        setState('processing');
        
        const audioData = await stopRecording();
        
        const transcriptionKey = getTranscriptionApiKey();
        const polishingKey = getPolishingApiKey();
        const result = await transcribeAndPolish(
          audioData,
          transcriptionKey,
          polishingKey,
          language,
          shouldPolish,
          transcriptionProvider,
          polishingProvider
        );
        
        const finalText = result.polished_text || result.raw_text;
        setTranscript(finalText);
        setState('done');
        
        setTimeout(() => {
          setState('idle');
        }, 3000);
      }
    } catch (err) {
      console.error('Recording error:', err);
      setError(err as string);
      setState('idle');
    }
  };

  const isRecording = state === 'recording';
  const isProcessing = state === 'processing';
  const isDone = state === 'done';

  return (
    <button
      onClick={handleToggleRecording}
      disabled={isProcessing}
      className="group relative"
    >
      <div className={`
        w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300
        ${isRecording 
          ? 'bg-red-500 shadow-lg shadow-red-500/50 scale-110' 
          : isDone 
            ? 'bg-green-500 shadow-lg shadow-green-500/50'
            : 'bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:scale-105'
        }
        ${isProcessing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
      `}>
        {isRecording ? (
          <div className="w-6 h-6 bg-white rounded-sm" />
        ) : isDone ? (
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        )}
      </div>
      
      {isRecording && (
        <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-30" />
      )}
    </button>
  );
};
