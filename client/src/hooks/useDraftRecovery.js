import { useState, useEffect, useCallback } from 'react';

/**
 * useDraftRecovery — persists form drafts to localStorage and restores them on mount.
 *
 * Limitations:
 *  - Data survives page refresh but NOT browser tab close if the tab was force-killed.
 *  - Max ~5MB per origin (shared with other keys).
 *  - Circular references in state will throw on JSON.stringify.
 *  - Drafts are per-key, not per-user — shared if multiple users on same browser.
 *
 * @param {string} key - Unique localStorage key (e.g. 'draft:result:examId')
 * @param {any} initialValue - Default value if no draft is found
 * @returns [value, setValue, clearDraft, hasDraft]
 */
export function useDraftRecovery(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : initialValue;
    } catch {
      return initialValue;
    }
  });

  const [hasDraft, setHasDraft] = useState(() => {
    return !!localStorage.getItem(key);
  });

  useEffect(() => {
    try {
      if (value === null || value === undefined || value === initialValue) return;
      localStorage.setItem(key, JSON.stringify(value));
      setHasDraft(true);
    } catch {
      // Quota exceeded or circular ref — fail silently
    }
  }, [key, value, initialValue]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(key);
    setValue(initialValue);
    setHasDraft(false);
  }, [key, initialValue]);

  return [value, setValue, clearDraft, hasDraft];
}
