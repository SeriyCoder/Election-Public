import {
  analyzeCoalitions,
  blockedMajorities,
  DEFAULT_NODE_BUDGET,
  largerCoalitions,
  pivotalParties,
  type BlockedMajority,
  type Coalition,
  type CoalitionAnalysis,
  type PivotalParty,
} from '../engine/coalitions';
import { runSeats } from '../engine/run';
import { nearestCoalitions } from '../engine/coalitionVariants';
import type { Scenario } from '../engine/schema';
import type { Store } from './store';

/** Wait after the last change before a new search starts. */
export const DEBOUNCE_MS = 300;

/**
 * Most minimal winning coalitions a finished search hands to the page. A search
 * can find hundreds of thousands; copying them out of the worker and comparing
 * them would freeze the page for about a second.
 */
export const LISTED_COALITIONS = 200;

/** Lists shown on request, each capped at LISTED_COALITIONS with its full count. */
export interface CoalitionExtras {
  readonly variants?: ReturnType<typeof nearestCoalitions>;
  readonly larger: readonly Coalition[];
  readonly largerTotal: number;
  /** False when the larger list was built from an incomplete or capped minimal list. */
  readonly largerComplete: boolean;
  readonly blocked: readonly BlockedMajority[];
  readonly blockedTotal: number;
  readonly blockedComplete: boolean;
  /** Counted over the full minimal winning list, before it is capped. */
  readonly pivotal: readonly PivotalParty[];
  /** False when the search was incomplete, so counts are lower bounds. */
  readonly pivotalComplete: boolean;
}

export type CoalitionRun =
  | { readonly state: 'idle' }
  | {
      readonly state: 'running';
      readonly nodesVisited: number;
      readonly budget: number;
    }
  | {
      readonly state: 'done';
      readonly analysis: CoalitionAnalysis;
      /** True when the search ran in the page because no worker was available. */
      readonly inPage: boolean;
      /** How many minimal winning coalitions were found; absent means all are listed. */
      readonly minimalWinningTotal?: number;
      readonly extras?: CoalitionExtras;
    }
  | { readonly state: 'cancelled' }
  | {
      readonly state: 'failed';
      readonly message: string;
      readonly reason?: 'worker-unavailable';
    };

export interface CoalitionRequest {
  readonly id: number;
  readonly scenario: Scenario;
}

export type CoalitionMessage =
  | {
      readonly id: number;
      readonly type: 'progress';
      readonly nodesVisited: number;
    }
  | {
      readonly id: number;
      readonly type: 'done';
      /** `minimalWinning` holds at most LISTED_COALITIONS entries. */
      readonly analysis: CoalitionAnalysis;
      readonly minimalWinningTotal: number;
      readonly extras?: CoalitionExtras;
    }
  | { readonly id: number; readonly type: 'error'; readonly message: string };

/** The part of a Web Worker the runner uses, so tests can supply a fake. */
export interface WorkerLike {
  postMessage(request: CoalitionRequest): void;
  terminate(): void;
  onmessage: ((event: { readonly data: CoalitionMessage }) => void) | null;
  onerror: ((event: unknown) => void) | null;
}

/** Runs a task after a delay and returns a function that cancels it. */
export type Schedule = (task: () => void, delayMs: number) => () => void;

export interface CoalitionRunnerOptions {
  /** Null, or a factory that throws, makes the runner search in the page. */
  readonly createWorker: (() => WorkerLike) | null;
  readonly schedule?: Schedule;
  /** A preview can require a worker to avoid blocking the interface. */
  readonly allowInPage?: boolean;
}

export interface CoalitionRunner {
  getRun(): CoalitionRun;
  subscribe(listener: () => void): () => void;
  /** A new valid scenario restarts the search after the debounce; null clears it. */
  update(scenario: Scenario | null): void;
  cancel(): void;
  rerun(): void;
  dispose(): void;
}

/** Worker body: the seats-only run, then the search with progress reports. */
export function runCoalitionRequest(
  request: CoalitionRequest,
  post: (message: CoalitionMessage) => void,
): void {
  const { id, scenario } = request;
  let analysis: CoalitionAnalysis;
  let extras: CoalitionExtras;
  try {
    const seats = runSeats(scenario);
    analysis = analyzeCoalitions(scenario, seats.allocation, {
      onProgress: (nodesVisited) =>
        post({ id, type: 'progress', nodesVisited }),
    });
    const larger = largerCoalitions(
      scenario,
      seats.allocation,
      analysis.minimalWinning.slice(0, LISTED_COALITIONS),
    );
    const blocked = blockedMajorities(scenario, seats.allocation);
    extras = {
      variants: nearestCoalitions(scenario, seats.allocation),
      larger: larger.slice(0, LISTED_COALITIONS),
      largerTotal: larger.length,
      largerComplete:
        analysis.complete &&
        analysis.minimalWinning.length <= LISTED_COALITIONS,
      blocked: blocked.blocked.slice(0, LISTED_COALITIONS),
      blockedTotal: blocked.blocked.length,
      blockedComplete: blocked.complete,
      pivotal: pivotalParties(analysis),
      pivotalComplete: analysis.complete,
    };
  } catch (error) {
    post({ id, type: 'error', message: errorMessage(error) });
    return;
  }
  post({
    id,
    type: 'done',
    analysis: {
      ...analysis,
      minimalWinning: analysis.minimalWinning.slice(0, LISTED_COALITIONS),
    },
    minimalWinningTotal: analysis.minimalWinning.length,
    extras,
  });
}

function errorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as { message: unknown };
    if (typeof message === 'string' && message !== '') {
      return message;
    }
  }
  return 'Coalition search failed';
}

const defaultSchedule: Schedule = (task, delayMs) => {
  const handle = setTimeout(task, delayMs);
  return () => clearTimeout(handle);
};

export function createCoalitionRunner(
  options: CoalitionRunnerOptions,
): CoalitionRunner {
  const schedule = options.schedule ?? defaultSchedule;
  let createWorker = options.createWorker;
  let run: CoalitionRun = { state: 'idle' };
  let scenario: Scenario | null = null;
  let worker: WorkerLike | null = null;
  let pending: (() => void) | null = null;
  let lastId = 0;
  let activeId: number | null = null;
  let disposed = false;
  const listeners = new Set<() => void>();

  function set(next: CoalitionRun): void {
    run = next;
    for (const listener of [...listeners]) {
      listener();
    }
  }

  function receive(message: CoalitionMessage, inPage: boolean): void {
    if (disposed || message.id !== activeId) {
      return;
    }
    if (message.type === 'progress') {
      set({
        state: 'running',
        nodesVisited: message.nodesVisited,
        budget: DEFAULT_NODE_BUDGET,
      });
      return;
    }
    activeId = null;
    set(
      message.type === 'done'
        ? {
            state: 'done',
            analysis: message.analysis,
            inPage,
            minimalWinningTotal: message.minimalWinningTotal,
            extras: message.extras,
          }
        : { state: 'failed', message: message.message },
    );
  }

  function ensureWorker(): WorkerLike | null {
    if (worker !== null || createWorker === null) {
      return worker;
    }
    let created: WorkerLike;
    try {
      created = createWorker();
    } catch {
      createWorker = null;
      return null;
    }
    created.onmessage = (event) => receive(event.data, false);
    created.onerror = (event) => {
      if (disposed || worker !== created) {
        return;
      }
      created.terminate();
      worker = null;
      activeId = null;
      set({ state: 'failed', message: errorMessage(event) });
    };
    worker = created;
    return created;
  }

  /** Drops the pending start and any search in flight. */
  function stop(): void {
    pending?.();
    pending = null;
    if (activeId !== null && worker !== null) {
      worker.terminate();
      worker = null;
    }
    activeId = null;
  }

  function start(): void {
    pending = null;
    if (scenario === null) {
      return;
    }
    lastId += 1;
    const request: CoalitionRequest = { id: lastId, scenario };
    activeId = request.id;
    set({ state: 'running', nodesVisited: 0, budget: DEFAULT_NODE_BUDGET });
    const target = ensureWorker();
    if (target !== null) {
      try {
        target.postMessage(request);
      } catch (error) {
        target.terminate();
        worker = null;
        activeId = null;
        set({ state: 'failed', message: errorMessage(error) });
      }
      return;
    }
    if (options.allowInPage === false) {
      activeId = null;
      set({
        state: 'failed',
        message: 'A worker is required for the preview coalition search.',
        reason: 'worker-unavailable',
      });
      return;
    }
    pending = schedule(() => {
      pending = null;
      runCoalitionRequest(request, (message) => receive(message, true));
    }, 0);
  }

  return {
    getRun: () => run,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(next) {
      if (disposed || next === scenario) {
        return;
      }
      scenario = next;
      stop();
      if (next === null) {
        set({ state: 'idle' });
        return;
      }
      set({ state: 'running', nodesVisited: 0, budget: DEFAULT_NODE_BUDGET });
      pending = schedule(start, DEBOUNCE_MS);
    },
    cancel() {
      if (disposed || run.state !== 'running') {
        return;
      }
      stop();
      set({ state: 'cancelled' });
    },
    rerun() {
      if (disposed || scenario === null) {
        return;
      }
      stop();
      start();
    },
    dispose() {
      stop();
      worker?.terminate();
      worker = null;
      disposed = true;
      listeners.clear();
    },
  };
}

/** Feeds the store's validated scenario to the runner; returns a disconnect. */
export function connectRunner(
  store: Store,
  runner: CoalitionRunner,
): () => void {
  const push = (): void => {
    const { validation } = store.getDerived();
    runner.update(validation.ok ? validation.scenario : null);
  };
  push();
  return store.subscribe(push);
}

/** Feeds the store's saved baseline to a second runner; returns a disconnect. */
export function connectBaselineRunner(
  store: Store,
  runner: CoalitionRunner,
): () => void {
  const push = (): void => {
    const validation = store.getBaseline()?.validation;
    runner.update(validation?.ok === true ? validation.scenario : null);
  };
  push();
  return store.subscribe(push);
}

/** A dismissed or stale preview cancels its separate candidate search. */
export function connectPreviewRunner(
  store: Store,
  runner: CoalitionRunner,
): () => void {
  const push = (): void => {
    runner.update(store.getState().legacyPreview?.after ?? null);
  };
  push();
  return store.subscribe(push);
}
