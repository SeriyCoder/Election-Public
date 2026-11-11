import { LIMITS, serializeScenario, validateScenario } from '../engine/schema';
import type { ImportFailure, Store } from './store';

/** The part of a browser `File` the import needs. */
export interface ScenarioFile {
  readonly size: number;
  text(): Promise<string>;
}

export type FileReadResult =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly code: ImportFailure };

export interface DownloadLink {
  href: string;
  download: string;
  click(): void;
}

/** The browser parts a download needs; injectable so tests need no DOM. */
export interface DownloadTarget {
  createObjectURL(blob: Blob): string;
  revokeObjectURL(url: string): void;
  createLink(): DownloadLink;
}

export function exportFileName(scenarioId: string): string {
  return `${scenarioId}.json`;
}

/** Refuses an oversize file without reading it. */
export async function readScenarioFile(
  file: ScenarioFile,
): Promise<FileReadResult> {
  if (file.size > LIMITS.jsonBytes) {
    return { ok: false, code: 'too-large' };
  }
  try {
    return { ok: true, text: await file.text() };
  } catch {
    return { ok: false, code: 'unreadable' };
  }
}

export function downloadText(
  fileName: string,
  text: string,
  target: DownloadTarget,
): void {
  const url = target.createObjectURL(
    new Blob([text], { type: 'application/json' }),
  );
  try {
    const link = target.createLink();
    link.href = url;
    link.download = fileName;
    link.click();
  } finally {
    target.revokeObjectURL(url);
  }
}

/** Reads a chosen file into the store; true when the scenario loaded. */
export async function importFile(
  store: Store,
  file: ScenarioFile,
): Promise<boolean> {
  const read = await readScenarioFile(file);
  if (!read.ok) {
    store.rejectImport(read.code);
    return false;
  }
  return store.importScenario(read.text);
}

/** Downloads the current scenario; false while the input is invalid. */
export function exportScenario(store: Store, target: DownloadTarget): boolean {
  const { validation } = store.getDerived();
  if (!validation.ok) {
    return false;
  }
  const { scenario } = validation;
  downloadText(
    exportFileName(scenario.id),
    serializeScenario(scenario),
    target,
  );
  return true;
}

/** Downloads the independent pre-conversion copy, never the source file. */
export function exportLegacyOriginal(
  store: Store,
  target: DownloadTarget,
): boolean {
  const validation = validateScenario(store.getLegacyOriginal());
  if (!validation.ok) return false;
  downloadText(
    `${validation.scenario.id}-original.json`,
    serializeScenario(validation.scenario),
    target,
  );
  return true;
}

/** Revocation waits a moment so that every browser has started the download. */
const REVOKE_DELAY_MS = 1000;

export function browserDownloadTarget(): DownloadTarget {
  return {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL(url) {
      setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
    },
    createLink: () => document.createElement('a'),
  };
}
