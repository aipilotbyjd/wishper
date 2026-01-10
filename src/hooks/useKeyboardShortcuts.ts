import { useEffect, useCallback } from 'react';

interface KeyboardShortcuts {
  onEscape?: () => void;
  onEnter?: () => void;
  onSpace?: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts, enabled = true) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;
      
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (event.key !== 'Escape') return;
      }

      switch (event.key) {
        case 'Escape':
          shortcuts.onEscape?.();
          break;
        case 'Enter':
          shortcuts.onEnter?.();
          break;
        case ' ':
          if (target.tagName !== 'BUTTON') {
            shortcuts.onSpace?.();
          }
          break;
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
