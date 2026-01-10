import { useState } from 'react';
import { RecordButton } from './components/RecordButton';
import { TranscriptDisplay } from './components/TranscriptDisplay';
import { FloatingWindow } from './components/FloatingWindow';
import { SettingsModal } from './components/Settings/SettingsModal';
import { HistoryPanel } from './components/History/HistoryPanel';
import { DictionaryPanel } from './components/Dictionary/DictionaryPanel';
import { SnippetsPanel } from './components/Snippets/SnippetsPanel';
import { ErrorToastContainer } from './components/ErrorToastContainer';
import { OfflineIndicator } from './components/OfflineIndicator';
import { useRecordingStore } from './stores/recordingStore';
import { useSettingsStore } from './stores/settingsStore';
import { useHotkey } from './hooks/useHotkey';
import { useTauriEvent } from './hooks/useTauriEvents';
import './styles/globals.css';

function App() {
  const { state, error } = useRecordingStore();
  const { hotkey } = useSettingsStore();
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showDictionary, setShowDictionary] = useState(false);
  const [showSnippets, setShowSnippets] = useState(false);

  useHotkey();
  
  useTauriEvent('open_settings', () => setShowSettings(true));
  useTauriEvent('open_history', () => setShowHistory(true));

  const formatHotkey = (hk: string) => {
    return hk
      .replace('CommandOrControl', 'Cmd')
      .replace('Control', 'Ctrl')
      .replace('Alt', 'Opt')
      .replace(/\+/g, ' + ');
  };

  return (
    <>
      <OfflineIndicator />
      <ErrorToastContainer />
      <FloatingWindow />
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <HistoryPanel isOpen={showHistory} onClose={() => setShowHistory(false)} />
      <DictionaryPanel isOpen={showDictionary} onClose={() => setShowDictionary(false)} />
      <SnippetsPanel isOpen={showSnippets} onClose={() => setShowSnippets(false)} />

      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-3xl shadow-2xl p-6 max-w-sm w-full border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Wishper</h1>
                <p className="text-white/50 text-xs">Voice to text</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => setShowDictionary(true)}
                className="p-2 text-white/50 hover:text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                title="Dictionary"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </button>
              <button
                onClick={() => setShowSnippets(true)}
                className="p-2 text-white/50 hover:text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                title="Snippets"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </button>
              <button
                onClick={() => setShowHistory(true)}
                className="p-2 text-white/50 hover:text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                title="History"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-white/50 hover:text-white/80 hover:bg-white/10 rounded-lg transition-colors"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex justify-center py-6">
              <RecordButton />
            </div>

            {state === 'recording' && (
              <div className="flex items-center justify-center gap-3">
                <div className="flex gap-1">
                  <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
                  <div className="w-1 h-6 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                  <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  <div className="w-1 h-8 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '450ms' }} />
                  <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: '600ms' }} />
                </div>
                <span className="text-white/80 text-sm font-medium">Listening...</span>
              </div>
            )}

            <TranscriptDisplay />

            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-300 p-3 rounded-xl text-sm">
                {error}
              </div>
            )}

            <p className="text-center text-xs text-white/40">
              Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white/60 font-mono">{formatHotkey(hotkey)}</kbd> anywhere to record
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default App;
