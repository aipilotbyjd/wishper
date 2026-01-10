import { create } from 'zustand';

export type RecordingState = 'idle' | 'recording' | 'processing' | 'done';

interface RecordingStore {
  state: RecordingState;
  transcript: string | null;
  error: string | null;
  setState: (state: RecordingState) => void;
  setTranscript: (transcript: string | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useRecordingStore = create<RecordingStore>((set) => ({
  state: 'idle',
  transcript: null,
  error: null,
  setState: (state) => set({ state }),
  setTranscript: (transcript) => set({ transcript }),
  setError: (error) => set({ error }),
  reset: () => set({ state: 'idle', transcript: null, error: null }),
}));
