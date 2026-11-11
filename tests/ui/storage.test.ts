import { describe, expect, it, vi } from 'vitest';
import {
  browserStorage,
  LANGUAGE_KEY,
  STORAGE_PREFIX,
} from '../../src/ui/storage';

const sources = import.meta.glob(['../../src/**/*.{ts,tsx}'], {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Behaves like the browser's storage: keys are re-indexed after a removal. */
class FakeStorage implements Storage {
  private readonly entries = new Map<string, string>();
  readonly clear = vi.fn(() => {
    this.entries.clear();
  });

  constructor(initial: Record<string, string> = {}) {
    for (const [key, value] of Object.entries(initial)) {
      this.entries.set(key, value);
    }
  }

  get length(): number {
    return this.entries.size;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  keys(): string[] {
    return [...this.entries.keys()];
  }
}

function blocked(): never {
  throw new Error('storage blocked');
}

describe('storage keys', () => {
  it('keeps the language under the earlier key, inside the app prefix', () => {
    expect(STORAGE_PREFIX).toBe('elections-simulator.');
    expect(LANGUAGE_KEY).toBe('elections-simulator.language');
    expect(LANGUAGE_KEY.startsWith(STORAGE_PREFIX)).toBe(true);
  });
});

describe('browserStorage', () => {
  it('loads the stored language and null when there is none', () => {
    expect(browserStorage(() => new FakeStorage()).load()).toBeNull();
    const area = new FakeStorage({ [LANGUAGE_KEY]: 'he' });
    expect(browserStorage(() => area).load()).toBe('he');
  });

  it('saves the language under its key', () => {
    const area = new FakeStorage();
    browserStorage(() => area).save('en');
    expect(area.getItem(LANGUAGE_KEY)).toBe('en');
    expect(area.keys()).toEqual([LANGUAGE_KEY]);
  });

  it('clears every app key and keeps every other key', () => {
    const area = new FakeStorage({
      'another-site.language': 'de',
      [LANGUAGE_KEY]: 'he',
      'elections-simulator.future-a': '1',
      'elections-simulator.future-b': '2',
      'elections-simulatorX': 'kept',
      'Elections-simulator.language': 'kept',
      theme: 'dark',
    });
    expect(browserStorage(() => area).clear()).toBe(true);
    expect(area.keys()).toEqual([
      'another-site.language',
      'elections-simulatorX',
      'Elections-simulator.language',
      'theme',
    ]);
    expect(area.clear).not.toHaveBeenCalled();
  });

  it('reports cleared when nothing was stored', () => {
    const area = new FakeStorage({ theme: 'dark' });
    expect(browserStorage(() => area).clear()).toBe(true);
    expect(area.keys()).toEqual(['theme']);
  });

  it('lets a later save write the language again', () => {
    const area = new FakeStorage({ [LANGUAGE_KEY]: 'he' });
    const storage = browserStorage(() => area);
    storage.clear();
    expect(storage.load()).toBeNull();
    storage.save('ru');
    expect(storage.load()).toBe('ru');
  });

  it('survives blocked storage and reports that it could not clear', () => {
    const storage = browserStorage(blocked);
    expect(storage.load()).toBeNull();
    expect(() => storage.save('en')).not.toThrow();
    expect(storage.clear()).toBe(false);
  });

  it('survives failing reads and writes', () => {
    const area = new FakeStorage({ [LANGUAGE_KEY]: 'he' });
    area.getItem = blocked;
    area.setItem = blocked;
    const storage = browserStorage(() => area);
    expect(storage.load()).toBeNull();
    expect(() => storage.save('en')).not.toThrow();
  });

  it('reports a failed removal', () => {
    const area = new FakeStorage({ [LANGUAGE_KEY]: 'he', theme: 'dark' });
    area.removeItem = blocked;
    expect(browserStorage(() => area).clear()).toBe(false);
  });
});

describe('local storage access', () => {
  const entries = Object.entries(sources) as [string, string][];

  it('scans the entry point and the adapter', () => {
    const paths = entries.map(([path]) => path);
    expect(paths).toContain('../../src/main.tsx');
    expect(paths).toContain('../../src/ui/storage.ts');
  });

  it.each(entries.filter(([path]) => path !== '../../src/ui/storage.ts'))(
    '%s leaves local storage to the adapter',
    (_path, source) => {
      expect(source).not.toMatch(/localStorage|sessionStorage/);
      expect(source).not.toContain(STORAGE_PREFIX);
    },
  );

  it('never clears the whole origin', () => {
    const adapter = sources['../../src/ui/storage.ts'];
    expect(adapter).toBeDefined();
    expect(adapter).not.toMatch(/\.clear\(\s*\)/);
  });
});
