import { describe, expect, it, vi } from 'vitest';
import { runSeats, serializeResult } from '../../src/engine/run';
import {
  LIMITS,
  parseScenarioJson,
  SCHEMA_VERSION,
  serializeScenario,
  validateScenario,
} from '../../src/engine/schema';
import { LOCALES } from '../../src/i18n';
import {
  downloadText,
  exportFileName,
  exportScenario,
  importFile,
  readScenarioFile,
  type DownloadLink,
  type DownloadTarget,
  type ScenarioFile,
} from '../../src/ui/fileTransfer';
import { baselineInput, presetInput, PRESETS } from '../../src/ui/presets';
import { createStore } from '../../src/ui/store';

function fakeFile(
  text: string,
  size = new Blob([text]).size,
): ScenarioFile & {
  readonly text: ReturnType<typeof vi.fn>;
} {
  return { size, text: vi.fn(() => Promise.resolve(text)) };
}

function failingFile(): ScenarioFile {
  return {
    size: 10,
    text: () => Promise.reject(new Error('permission denied')),
  };
}

interface Recorded {
  readonly target: DownloadTarget;
  readonly blobs: Blob[];
  readonly links: DownloadLink[];
  readonly calls: string[];
}

function fakeTarget(): Recorded {
  const blobs: Blob[] = [];
  const links: DownloadLink[] = [];
  const calls: string[] = [];
  const target: DownloadTarget = {
    createObjectURL(blob) {
      blobs.push(blob);
      calls.push('create');
      return 'blob:fake-1';
    },
    revokeObjectURL(url) {
      calls.push(`revoke ${url}`);
    },
    createLink() {
      const link: DownloadLink = {
        href: '',
        download: '',
        click() {
          calls.push(`click ${link.href} ${link.download}`);
        },
      };
      links.push(link);
      return link;
    },
  };
  return { target, blobs, links, calls };
}

function exported(input: unknown): string {
  const validation = validateScenario(input);
  if (!validation.ok) {
    throw new Error('expected a valid scenario');
  }
  return serializeScenario(validation.scenario);
}

describe('file name', () => {
  it('names the export after the scenario ID', () => {
    expect(exportFileName('baseline')).toBe('baseline.json');
    expect(exportFileName('my_case-2')).toBe('my_case-2.json');
  });
});

describe('reading a chosen file', () => {
  it('returns the text of a file within the limit', async () => {
    const file = fakeFile('{"a":1}');
    await expect(readScenarioFile(file)).resolves.toEqual({
      ok: true,
      text: '{"a":1}',
    });
    expect(file.text).toHaveBeenCalledTimes(1);
  });

  it('accepts a file of exactly the limit', async () => {
    const file = fakeFile('{}', LIMITS.jsonBytes);
    const result = await readScenarioFile(file);
    expect(result.ok).toBe(true);
  });

  it('refuses an oversize file without reading it', async () => {
    const file = fakeFile('{}', LIMITS.jsonBytes + 1);
    await expect(readScenarioFile(file)).resolves.toEqual({
      ok: false,
      code: 'too-large',
    });
    expect(file.text).not.toHaveBeenCalled();
  });

  it('reports a read failure as unreadable', async () => {
    await expect(readScenarioFile(failingFile())).resolves.toEqual({
      ok: false,
      code: 'unreadable',
    });
  });
});

describe('importing a file into the store', () => {
  it('loads a valid exported file', async () => {
    const store = createStore();
    const text = exported(presetInput('split'));
    await expect(importFile(store, fakeFile(text))).resolves.toBe(true);
    expect(exported(store.getState().input)).toBe(text);
  });

  it('records an oversize file and keeps the input', async () => {
    const store = createStore();
    const input = store.getState().input;
    const file = fakeFile('{}', LIMITS.jsonBytes + 1);
    await expect(importFile(store, file)).resolves.toBe(false);
    expect(store.getState().input).toBe(input);
    expect(store.getState().importIssues?.map((issue) => issue.code)).toEqual([
      'too-large',
    ]);
  });

  it('records an unreadable file and keeps the input', async () => {
    const store = createStore();
    const input = store.getState().input;
    await expect(importFile(store, failingFile())).resolves.toBe(false);
    expect(store.getState().input).toBe(input);
    expect(store.getState().importIssues?.map((issue) => issue.code)).toEqual([
      'unreadable',
    ]);
  });

  it('records the validator issues of an invalid file', async () => {
    const store = createStore();
    const text = JSON.stringify({
      ...baselineInput(),
      schemaVersion: SCHEMA_VERSION + 1,
    });
    await expect(importFile(store, fakeFile(text))).resolves.toBe(false);
    expect(store.getState().importIssues?.map((issue) => issue.code)).toEqual([
      'unsupported-version',
    ]);
  });
});

describe('downloading text', () => {
  it('clicks a temporary link to an object URL and then revokes it', async () => {
    const { target, blobs, links, calls } = fakeTarget();
    downloadText('case.json', '{"a":"\u05d0"}\n', target);
    expect(calls).toEqual([
      'create',
      'click blob:fake-1 case.json',
      'revoke blob:fake-1',
    ]);
    expect(links).toHaveLength(1);
    expect(blobs).toHaveLength(1);
    expect(blobs[0]!.type).toBe('application/json');
    await expect(blobs[0]!.text()).resolves.toBe('{"a":"\u05d0"}\n');
  });
});

describe('exporting the current scenario', () => {
  it('downloads the serialised scenario named after its ID', async () => {
    const store = createStore();
    const { target, blobs, calls } = fakeTarget();
    expect(exportScenario(store, target)).toBe(true);
    expect(calls[1]).toBe('click blob:fake-1 baseline.json');
    await expect(blobs[0]!.text()).resolves.toBe(
      exported(store.getState().input),
    );
  });

  it('refuses to export an invalid input', () => {
    const store = createStore();
    store.setInput('not a scenario');
    const { target, calls } = fakeTarget();
    expect(exportScenario(store, target)).toBe(false);
    expect(calls).toEqual([]);
  });

  it('does not export the saved baseline', async () => {
    const store = createStore();
    store.saveBaseline();
    store.loadPreset('split');
    const { target, blobs } = fakeTarget();
    exportScenario(store, target);
    const text = await blobs[0]!.text();
    expect(text).toBe(exported(store.getState().input));
    expect(text).not.toBe(exported(store.getState().baseline));
    expect(Object.keys(JSON.parse(text) as object)).not.toContain('baseline');
  });

  it('writes the same text under every language', async () => {
    const texts: string[] = [];
    for (const language of LOCALES) {
      const store = createStore({ language });
      store.importScenario(exported(presetInput('multiBlock')));
      const { target, blobs } = fakeTarget();
      exportScenario(store, target);
      texts.push(await blobs[0]!.text());
    }
    expect(new Set(texts).size).toBe(1);
  });

  it.each(PRESETS)(
    'exports the loaded %s preset identically under every language',
    async (id) => {
      const texts: string[] = [];
      for (const language of LOCALES) {
        const store = createStore({ language });
        store.loadPreset(id);
        const { target, blobs } = fakeTarget();
        exportScenario(store, target);
        texts.push(await blobs[0]!.text());
      }
      expect(new Set(texts).size).toBe(1);
      expect(texts[0]).not.toMatch(/[\u0400-\u04ff\u0590-\u05ff]/);
    },
  );

  it.each(LOCALES)(
    'exports the startup scenario without interface text in %s',
    async (language) => {
      const store = createStore({ language });
      const { target, blobs } = fakeTarget();
      exportScenario(store, target);
      const text = await blobs[0]!.text();
      expect(text).toBe(exported(baselineInput()));
      expect(text).not.toMatch(/[\u0400-\u04ff\u0590-\u05ff]/);
    },
  );

  it.each(PRESETS)(
    'round-trips the %s preset through export and import',
    async (id) => {
      const source = createStore();
      source.loadPreset(id);
      const { target, blobs } = fakeTarget();
      exportScenario(source, target);
      const text = await blobs[0]!.text();

      const destination = createStore();
      await expect(importFile(destination, fakeFile(text))).resolves.toBe(true);
      const { target: again, blobs: second } = fakeTarget();
      exportScenario(destination, again);
      await expect(second[0]!.text()).resolves.toBe(text);

      const parsed = parseScenarioJson(text);
      if (!parsed.ok) {
        throw new Error('expected a valid export');
      }
      const imported = destination.getDerived().result;
      expect(imported).not.toBeNull();
      expect(serializeResult(imported!)).toBe(
        serializeResult(runSeats(parsed.scenario)),
      );
      expect(serializeResult(imported!)).toBe(
        serializeResult(source.getDerived().result!),
      );
    },
  );
});
