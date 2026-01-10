import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsStore {
  apiKey: string;
  language: string;
  shouldPolish: boolean;
  hotkey: string;
  autoPaste: boolean;
  restoreClipboard: boolean;
  setApiKey: (key: string) => void;
  setLanguage: (lang: string) => void;
  setShouldPolish: (polish: boolean) => void;
  setHotkey: (hotkey: string) => void;
  setAutoPaste: (autoPaste: boolean) => void;
  setRestoreClipboard: (restore: boolean) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      apiKey: '',
      language: 'en',
      shouldPolish: true,
      hotkey: 'CommandOrControl+Shift+Space',
      autoPaste: true,
      restoreClipboard: true,
      setApiKey: (apiKey) => set({ apiKey }),
      setLanguage: (language) => set({ language }),
      setShouldPolish: (shouldPolish) => set({ shouldPolish }),
      setHotkey: (hotkey) => set({ hotkey }),
      setAutoPaste: (autoPaste) => set({ autoPaste }),
      setRestoreClipboard: (restoreClipboard) => set({ restoreClipboard }),
    }),
    {
      name: 'wishper-settings',
    }
  )
);
