import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ApiProvider } from '../lib/tauri';

interface SettingsStore {
  openaiApiKey: string;
  groqApiKey: string;
  language: string;
  shouldPolish: boolean;
  hotkey: string;
  autoPaste: boolean;
  restoreClipboard: boolean;
  apiProvider: ApiProvider;
  setOpenaiApiKey: (key: string) => void;
  setGroqApiKey: (key: string) => void;
  setLanguage: (lang: string) => void;
  setShouldPolish: (polish: boolean) => void;
  setHotkey: (hotkey: string) => void;
  setAutoPaste: (autoPaste: boolean) => void;
  setRestoreClipboard: (restore: boolean) => void;
  setApiProvider: (provider: ApiProvider) => void;
  // Helper to get current provider's key
  getCurrentApiKey: () => string;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      openaiApiKey: '',
      groqApiKey: '',
      language: 'en',
      shouldPolish: true,
      hotkey: 'CommandOrControl+Shift+Space',
      autoPaste: true,
      restoreClipboard: true,
      apiProvider: 'groq',
      setOpenaiApiKey: (openaiApiKey) => set({ openaiApiKey }),
      setGroqApiKey: (groqApiKey) => set({ groqApiKey }),
      setLanguage: (language) => set({ language }),
      setShouldPolish: (shouldPolish) => set({ shouldPolish }),
      setHotkey: (hotkey) => set({ hotkey }),
      setAutoPaste: (autoPaste) => set({ autoPaste }),
      setRestoreClipboard: (restoreClipboard) => set({ restoreClipboard }),
      setApiProvider: (apiProvider) => set({ apiProvider }),
      getCurrentApiKey: () => {
        const state = get();
        return state.apiProvider === 'groq' ? state.groqApiKey : state.openaiApiKey;
      },
    }),
    {
      name: 'wishper-settings',
    }
  )
);
