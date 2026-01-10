import { useState } from 'react';
import { useSettingsStore } from '../../stores/settingsStore';
import type { ApiProvider } from '../../lib/tauri';

const PROVIDERS: { value: ApiProvider; name: string; description: string }[] = [
  { value: 'groq', name: 'Groq (Free)', description: 'Fast & free tier available' },
  { value: 'openai', name: 'OpenAI', description: 'GPT-4o + Whisper' },
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
    apiKey, setApiKey,
    language, setLanguage,
    shouldPolish, setShouldPolish,
    autoPaste, setAutoPaste,
    hotkey, setHotkey,
    apiProvider, setApiProvider,
  } = useSettingsStore();

  const [showKey, setShowKey] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);

  const handleSaveKey = () => {
    setApiKey(tempKey);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wider">API Provider</label>
        <div className="grid grid-cols-2 gap-2">
          {PROVIDERS.map((provider) => (
            <button
              key={provider.value}
              onClick={() => setApiProvider(provider.value)}
              className={`px-4 py-3 rounded-xl border text-left transition-all ${
                apiProvider === provider.value
                  ? 'bg-purple-500/20 border-purple-500 text-white'
                  : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
              }`}
            >
              <div className="text-sm font-medium">{provider.name}</div>
              <div className="text-xs text-white/50">{provider.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-white/60 uppercase tracking-wider">
          {apiProvider === 'groq' ? 'Groq' : 'OpenAI'} API Key
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <input
              type={showKey ? 'text' : 'password'}
              value={tempKey}
              onChange={(e) => setTempKey(e.target.value)}
              placeholder={apiProvider === 'groq' ? 'gsk_...' : 'sk-...'}
              className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showKey ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
              </svg>
            </button>
          </div>
          <button
            onClick={handleSaveKey}
            disabled={tempKey === apiKey}
            className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-white/10 disabled:text-white/30 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Save
          </button>
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
