import type { Locale } from '../i18n';
import type { LanguageStorage } from './store';

/** Every key the app writes starts with this; nothing else is ever removed. */
export const STORAGE_PREFIX = 'elections-simulator.';
export const LANGUAGE_KEY = `${STORAGE_PREFIX}language`;

function defaultArea(): Storage {
  return window.localStorage;
}

/**
 * Local storage behind the store's contract. `area` is a function because
 * merely reading `window.localStorage` throws when the browser blocks storage.
 */
export function browserStorage(
  area: () => Storage = defaultArea,
): LanguageStorage {
  return {
    load() {
      try {
        return area().getItem(LANGUAGE_KEY);
      } catch {
        return null;
      }
    },
    save(locale: Locale) {
      try {
        area().setItem(LANGUAGE_KEY, locale);
      } catch {
        // Storage may be disabled (private mode, file:// policies).
      }
    },
    clear() {
      try {
        const store = area();
        const owned: string[] = [];
        for (let index = 0; index < store.length; index += 1) {
          const key = store.key(index);
          if (key !== null && key.startsWith(STORAGE_PREFIX)) {
            owned.push(key);
          }
        }
        // Other sites can share this origin (file://, <user>.github.io).
        for (const key of owned) {
          store.removeItem(key);
        }
        return true;
      } catch {
        return false;
      }
    },
  };
}
