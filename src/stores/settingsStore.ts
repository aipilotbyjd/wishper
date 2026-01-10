import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApiProvider } from '../lib/tauri';

interface SettingsStore {
  openaiApiKey: string;
  groqApiKey: string;
  geminiApiKey: string;
  language: string;
  shouldPolish: boolean;
  hotkey: string;
  autoPaste: boolean;
  restoreClipboard: boolean;
  transcriptionProvider: ApiProvider;
  polishingProvider: ApiProvider;
  setOpenaiApiKey: (key: string) => void;
  setGroqApiKey: (key: string) => void;
  setGeminiApiKey: (key: string) => void;
  setLanguage: (lang: string) => void;
  setShouldPolish: (polish: boolean) => void;
  setHotkey: (hotkey: string) => void;
  setAutoPaste: (autoPaste: boolean) => void;
  setRestoreClipboard: (restore: boolean) => void;
  setTranscriptionProvider: (provider: ApiProvider) => void;
  setPolishingProvider: (provider: ApiProvider) => void;
  getTranscriptionApiKey: () => string;
  getPolishingApiKey: () => string;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      openaiApiKey: '',
      groqApiKey: '',
      geminiApiKey: '',
      language: 'en',
      shouldPolish: true,
      hotkey: 'CommandOrControl+Shift+Space',
      autoPaste: true,
      restoreClipboard: true,
      transcriptionProvider: 'groq',
      polishingProvider: 'groq',
      setOpenaiApiKey: (openaiApiKey) => set({ openaiApiKey }),
      setGroqApiKey: (groqApiKey) => set({ groqApiKey }),
      setGeminiApiKey: (geminiApiKey) => set({ geminiApiKey }),
      setLanguage: (language) => set({ language }),
      setShouldPolish: (shouldPolish) => set({ shouldPolish }),
      setHotkey: (hotkey) => set({ hotkey }),
      setAutoPaste: (autoPaste) => set({ autoPaste }),
      setRestoreClipboard: (restoreClipboard) => set({ restoreClipboard }),
      setTranscriptionProvider: (transcriptionProvider) => set({ transcriptionProvider }),
      setPolishingProvider: (polishingProvider) => set({ polishingProvider }),
      getTranscriptionApiKey: () => {
        const state = get();
        if (state.transcriptionProvider === 'groq') return state.groqApiKey;
        if (state.transcriptionProvider === 'gemini') return state.groqApiKey; // Gemini uses Groq for transcription
        return state.openaiApiKey;
      },
      getPolishingApiKey: () => {
        const state = get();
        if (state.polishingProvider === 'groq') return state.groqApiKey;
        if (state.polishingProvider === 'gemini') return state.geminiApiKey;
        return state.openaiApiKey;
      },
    }),
    {
      name: 'wishper-settings',
    }
  )
);
