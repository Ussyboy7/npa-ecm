"use client";

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

/**
 * Hook for managing keyboard shortcuts
 * 
 * @example
 * useKeyboardShortcuts([
 *   {
 *     key: 's',
 *     ctrl: true,
 *     action: () => handleSave(),
 *     description: 'Save (Ctrl+S)'
 *   },
 *   {
 *     key: 'Escape',
 *     action: () => handleClose(),
 *     description: 'Close (Esc)'
 *   }
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[] = []) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!shortcuts || !Array.isArray(shortcuts)) {
        return;
      }
      for (const shortcut of shortcuts) {
        const keyMatches = event.key === shortcut.key || event.code === shortcut.key;
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;

        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          if (shortcut.preventDefault !== false) {
            event.preventDefault();
          }
          shortcut.action();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}

/**
 * Common keyboard shortcuts for modals
 */
export const MODAL_SHORTCUTS = {
  CLOSE: {
    key: 'Escape',
    action: () => {},
    description: 'Close modal',
  },
  SAVE: {
    key: 's',
    ctrl: true,
    action: () => {},
    description: 'Save (Ctrl+S)',
  },
  SUBMIT: {
    key: 'Enter',
    ctrl: true,
    action: () => {},
    description: 'Submit (Ctrl+Enter)',
  },
} as const;

