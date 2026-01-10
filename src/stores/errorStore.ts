import { create } from 'zustand';

interface AppError {
  id: string;
  message: string;
  type: 'error' | 'warning' | 'info';
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
}

interface ErrorStore {
  errors: AppError[];
  addError: (error: Omit<AppError, 'id'>) => void;
  removeError: (id: string) => void;
  clearErrors: () => void;
}

export const useErrorStore = create<ErrorStore>((set) => ({
  errors: [],
  addError: (error) =>
    set((state) => ({
      errors: [
        ...state.errors,
        { ...error, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ],
    })),
  removeError: (id) =>
    set((state) => ({
      errors: state.errors.filter((e) => e.id !== id),
    })),
  clearErrors: () => set({ errors: [] }),
}));
