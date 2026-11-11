import {
  scanCriticalSets,
  type CriticalSets,
  type FutureRangeResult,
} from '../engine/futureRange';
import type { Scenario } from '../engine/schema';
import { DEBOUNCE_MS, type Schedule } from './coalitionRunner';
import type { Store } from './store';

export interface FutureScanRequest {
  readonly id: number;
  readonly scenario: Scenario;
  readonly sets: CriticalSets;
}

export type FutureScanMessage =
  | { readonly id: number; readonly type: 'progress'; readonly year: number }
  | {
      readonly id: number;
      readonly type: 'done';
      readonly result: FutureRangeResult;
    }
  | { readonly id: number; readonly type: 'error'; readonly message: string };

export interface FutureScanWorker {
  postMessage(request: FutureScanRequest): void;
  terminate(): void;
  onmessage: ((event: { readonly data: FutureScanMessage }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

export type FutureScanRun =
  | { readonly state: 'idle' }
  | { readonly state: 'running'; readonly year: number }
  | { readonly state: 'done'; readonly result: FutureRangeResult }
  | { readonly state: 'cancelled' }
  | {
      readonly state: 'failed';
      readonly message: string;
      readonly reason?: 'worker-unavailable';
    };

export interface FutureScanRunner {
  getRun(): FutureScanRun;
  subscribe(listener: () => void): () => void;
  update(scenario: Scenario | null, sets: CriticalSets): void;
  cancel(): void;
  rerun(): void;
  dispose(): void;
}

export interface FutureScanRunnerOptions {
  readonly createWorker: (() => FutureScanWorker) | null;
  readonly schedule?: Schedule;
}

export function runFutureScanRequest(
  request: FutureScanRequest,
  post: (message: FutureScanMessage) => void,
): void {
  try {
    const result = scanCriticalSets(request.scenario, request.sets, (year) =>
      post({ id: request.id, type: 'progress', year }),
    );
    post({ id: request.id, type: 'done', result });
  } catch (error) {
    post({ id: request.id, type: 'error', message: errorMessage(error) });
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof error.message === 'string'
      ? error.message
      : 'Future scan failed';
}

export function createFutureScanRunner(
  options: FutureScanRunnerOptions,
): FutureScanRunner {
  const schedule =
    options.schedule ??
    ((task, delay) => {
      const timer = setTimeout(task, delay);
      return () => clearTimeout(timer);
    });
  let scenario: Scenario | null = null;
  let sets: CriticalSets = { red: [], orange: [] };
  let key = '';
  let run: FutureScanRun = { state: 'idle' };
  let worker: FutureScanWorker | null = null;
  let pending: (() => void) | null = null;
  let sequence = 0;
  let active: number | null = null;
  let disposed = false;
  const listeners = new Set<() => void>();
  const set = (next: FutureScanRun): void => {
    run = next;
    for (const listener of [...listeners]) listener();
  };
  const stop = (): void => {
    active = null;
    pending?.();
    pending = null;
    worker?.terminate();
    worker = null;
  };
  const start = (): void => {
    pending = null;
    if (
      disposed ||
      scenario === null ||
      (sets.red.length === 0 && sets.orange.length === 0)
    )
      return;
    const id = ++sequence;
    active = id;
    set({ state: 'running', year: 0 });
    if (options.createWorker === null) {
      stop();
      set({
        state: 'failed',
        reason: 'worker-unavailable',
        message: 'A worker is required for the future scan',
      });
      return;
    }
    try {
      worker = options.createWorker();
    } catch (error) {
      stop();
      set({
        state: 'failed',
        reason: 'worker-unavailable',
        message: errorMessage(error),
      });
      return;
    }
    worker.onmessage = ({ data }) => {
      if (disposed || id !== active || data.id !== active) return;
      if (data.type === 'progress') {
        set({ state: 'running', year: data.year });
      } else {
        stop();
        set(
          data.type === 'done'
            ? { state: 'done', result: data.result }
            : { state: 'failed', message: data.message },
        );
      }
    };
    worker.onerror = (error) => {
      if (disposed || id !== active) return;
      stop();
      set({ state: 'failed', message: errorMessage(error) });
    };
    try {
      worker.postMessage({ id, scenario, sets });
    } catch (error) {
      stop();
      set({ state: 'failed', message: errorMessage(error) });
    }
  };
  return {
    getRun: () => run,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(next, nextSets) {
      const nextKey = JSON.stringify([
        [...new Set(nextSets.red)].sort(),
        [...new Set(nextSets.orange)].sort(),
      ]);
      if (disposed || (next === scenario && nextKey === key)) return;
      stop();
      scenario = next;
      sets = { red: [...nextSets.red], orange: [...nextSets.orange] };
      key = nextKey;
      if (
        next === null ||
        (sets.red.length === 0 && sets.orange.length === 0)
      ) {
        set({ state: 'idle' });
      } else {
        set({ state: 'running', year: 0 });
        pending = schedule(start, DEBOUNCE_MS);
      }
    },
    cancel() {
      if (disposed || run.state !== 'running') return;
      stop();
      set({ state: 'cancelled' });
    },
    rerun() {
      if (disposed) return;
      stop();
      start();
    },
    dispose() {
      disposed = true;
      stop();
      listeners.clear();
    },
  };
}

export function connectFutureScanRunner(
  store: Store,
  runner: FutureScanRunner,
): () => void {
  let previous: Scenario | null | undefined;
  let previousSets: CriticalSets | undefined;
  const push = (): void => {
    const state = store.getState();
    if (state.screen !== 'app' || state.view !== 'future') {
      runner.cancel();
      runner.update(null, state.criticalSets);
      previous = undefined;
      previousSets = undefined;
      return;
    }
    const scenario = store.getProjectionSource();
    if (scenario === previous && state.criticalSets === previousSets) return;
    previous = scenario;
    previousSets = state.criticalSets;
    runner.update(scenario, state.criticalSets);
  };
  push();
  const unsubscribe = store.subscribe(push);
  return () => {
    unsubscribe();
    runner.cancel();
    runner.update(null, { red: [], orange: [] });
  };
}
