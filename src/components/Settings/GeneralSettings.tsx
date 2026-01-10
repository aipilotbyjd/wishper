import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import type { ApiProvider } from '../../lib/tauri';

const TRANSCRIPTION_PROVIDERS: { value: ApiProvider; name: string }[] = [
  { value: 'groq', name: 'Groq (Free)' },
  { value: 'openai', name: 'OpenAI (Paid)' },
];

const POLISHING_PROVIDERS: { value: ApiProvider; name: string }[] = [
  { value: 'groq', name: 'Groq - Llama 3.3 (Free)' },
  { value: 'gemini', name: 'Gemini 1.5 Flash (Free)' },
  { value: 'openai', name: 'GPT-4o-mini (Paid)' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
];

export const GeneralSettings = () => {
  const {
    openaiApiKey, setOpenaiApiKey,
    groqApiKey, setGroqApiKey,
    geminiApiKey, setGeminiApiKey,
    language, setLanguage,
    shouldPolish, setShouldPolish,
    autoPaste, setAutoPaste,
    hotkey, setHotkey,
    transcriptionProvider, setTranscriptionProvider,
    polishingProvider, setPolishingProvider,
  } = useSettingsStore();

  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [tempGroqKey, setTempGroqKey] = useState(groqApiKey);
  const [tempGeminiKey, setTempGeminiKey] = useState(geminiApiKey);
  const [tempOpenAIKey, setTempOpenAIKey] = useState(openaiApiKey);

  return (
    <div className="space-y-6">
      {/* Transcription Provider */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Transcription (Speech-to-Text)</label>
        <select
          value={transcriptionProvider}
          onChange={(e) => setTranscriptionProvider(e.target.value as ApiProvider)}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
        >
          {TRANSCRIPTION_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value} className="bg-slate-800">{p.name}</option>
          ))}
        </select>
      </div>

      {/* Polishing Provider */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Polishing (Text Cleanup)</label>
        <select
          value={polishingProvider}
          onChange={(e) => setPolishingProvider(e.target.value as ApiProvider)}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
        >
          {POLISHING_PROVIDERS.map((p) => (
            <option key={p.value} value={p.value} className="bg-slate-800">{p.name}</option>
          ))}
        </select>
      </div>

      {/* API Keys Section */}
      <div className="space-y-4 pt-4 border-t border-white/10">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wider">API Keys</label>
        
        {/* Groq Key */}
        <div className="space-y-1">
          <label className="text-xs text-white/50">
            Groq API Key {transcriptionProvider === 'groq' && '(for transcription)'} {polishingProvider === 'groq' && '(for polishing)'}
          </label>
          <div className="flex gap-2">
            <input
              type={showGroqKey ? 'text' : 'password'}
              value={tempGroqKey}
              onChange={(e) => setTempGroqKey(e.target.value)}
              placeholder="gsk_..."
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
            />
            <button onClick={() => setShowGroqKey(!showGroqKey)} className="px-3 text-white/40 hover:text-white/70 text-sm">
              {showGroqKey ? 'Hide' : 'Show'}
            </button>
            <button
              onClick={() => setGroqApiKey(tempGroqKey)}
              disabled={tempGroqKey === groqApiKey}
              className="px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-white/10 disabled:text-white/30 text-white text-xs rounded-lg"
            >
              Save
            </button>
          </div>
        </div>

        {/* Gemini Key */}
        <div className="space-y-1">
          <label className="text-xs text-white/50">
            Gemini API Key {polishingProvider === 'gemini' && '(for polishing)'}
          </label>
          <div className="flex gap-2">
            <input
              type={showGeminiKey ? 'text' : 'password'}
              value={tempGeminiKey}
              onChange={(e) => setTempGeminiKey(e.target.value)}
              placeholder="AIza..."
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
            />
            <button onClick={() => setShowGeminiKey(!showGeminiKey)} className="px-3 text-white/40 hover:text-white/70 text-sm">
              {showGeminiKey ? 'Hide' : 'Show'}
            </button>
            <button
              onClick={() => setGeminiApiKey(tempGeminiKey)}
              disabled={tempGeminiKey === geminiApiKey}
              className="px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-white/10 disabled:text-white/30 text-white text-xs rounded-lg"
            >
              Save
            </button>
          </div>
        </div>

        {/* OpenAI Key */}
        <div className="space-y-1">
          <label className="text-xs text-white/50">
            OpenAI API Key {transcriptionProvider === 'openai' && '(for transcription)'} {polishingProvider === 'openai' && '(for polishing)'}
          </label>
          <div className="flex gap-2">
            <input
              type={showOpenAIKey ? 'text' : 'password'}
              value={tempOpenAIKey}
              onChange={(e) => setTempOpenAIKey(e.target.value)}
              placeholder="sk-..."
              className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
            />
            <button onClick={() => setShowOpenAIKey(!showOpenAIKey)} className="px-3 text-white/40 hover:text-white/70 text-sm">
              {showOpenAIKey ? 'Hide' : 'Show'}
            </button>
            <button
              onClick={() => setOpenaiApiKey(tempOpenAIKey)}
              disabled={tempOpenAIKey === openaiApiKey}
              className="px-3 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-white/10 disabled:text-white/30 text-white text-xs rounded-lg"
            >
              Save
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Language</label>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
        >
          {LANGUAGES.map((lang) => (
            <option key={lang.code} value={lang.code} className="bg-slate-800">{lang.name}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wider">Hotkey</label>
        <select
          value={hotkey}
          onChange={(e) => setHotkey(e.target.value)}
          className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none"
        >
          <option value="CommandOrControl+Shift+Space" className="bg-slate-800">Cmd+Shift+Space</option>
          <option value="CommandOrControl+Shift+D" className="bg-slate-800">Cmd+Shift+D</option>
          <option value="CommandOrControl+Alt+Space" className="bg-slate-800">Cmd+Option+Space</option>
        </select>
      </div>

      <div className="space-y-3 pt-2">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={shouldPolish}
            onChange={(e) => setShouldPolish(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
          />
          <div>
            <span className="text-sm text-white">Polish text with AI</span>
            <p className="text-xs text-white/50">Remove filler words, fix grammar</p>
          </div>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={autoPaste}
            onChange={(e) => setAutoPaste(e.target.checked)}
            className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/50"
          />
          <div>
            <span className="text-sm text-white">Auto-paste result</span>
            <p className="text-xs text-white/50">Paste text into active app</p>
          </div>
        </label>
      </div>
    </div>
  );
};
