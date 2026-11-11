import { describe, expect, it, vi } from 'vitest';
import { nearestCoalitions } from '../../src/engine/coalitionVariants';
import {
  blockedMajorities,
  DEFAULT_NODE_BUDGET,
  pivotalParties,
} from '../../src/engine/coalitions';
import { runScenario, runSeats } from '../../src/engine/run';
import { validateScenario, type Scenario } from '../../src/engine/schema';
import {
  connectBaselineRunner,
  connectRunner,
  createCoalitionRunner,
  DEBOUNCE_MS,
  runCoalitionRequest,
  LISTED_COALITIONS,
  type CoalitionMessage,
  type CoalitionRequest,
  type CoalitionRunner,
  type Schedule,
  type WorkerLike,
} from '../../src/ui/coalitionRunner';
import { baselineInput, presetInput } from '../../src/ui/presets';
import { largeInput } from '../e2e/scenarios';
import { createStore } from '../../src/ui/store';

function scenarioOf(input: unknown): Scenario {
  const validation = validateScenario(input);
  if (!validation.ok) {
    throw new Error('expected a valid scenario');
  }
  return validation.scenario;
}

type DoneMessage = Extract<CoalitionMessage, { type: 'done' }>;

/** The done message the worker body posts for a scenario. */
function doneOf(scenario: Scenario): DoneMessage {
  const done: DoneMessage[] = [];
  runCoalitionRequest({ id: 0, scenario }, (message) => {
    if (message.type === 'done') {
      done.push(message);
    }
  });
  if (done[0] === undefined) {
    throw new Error('expected a done message');
  }
  return done[0];
}

function doneRun(scenario: Scenario, inPage: boolean) {
  const done = doneOf(scenario);
  return {
    state: 'done',
    analysis: done.analysis,
    inPage,
    minimalWinningTotal: done.minimalWinningTotal,
    extras: done.extras,
  };
}

class FakeWorker implements WorkerLike {
  readonly posted: CoalitionRequest[] = [];
  terminated = false;
  onmessage: ((event: { readonly data: CoalitionMessage }) => void) | null =
    null;
  onerror: ((event: unknown) => void) | null = null;

  postMessage(request: CoalitionRequest): void {
    this.posted.push(request);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(message: CoalitionMessage): void {
    this.onmessage?.({ data: message });
  }

  /** Answers the last request the way the real worker would. */
  answerLast(): void {
    const request = this.posted[this.posted.length - 1];
    if (request === undefined) {
      throw new Error('nothing posted');
    }
    runCoalitionRequest(request, (message) => this.emit(message));
  }
}

interface Task {
  readonly task: () => void;
  readonly delayMs: number;
  cancelled: boolean;
}

function manualClock(): { schedule: Schedule; tasks: Task[]; flush(): void } {
  const tasks: Task[] = [];
  return {
    tasks,
    schedule(task, delayMs) {
      const entry: Task = { task, delayMs, cancelled: false };
      tasks.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    flush() {
      while (tasks.length > 0) {
        const entry = tasks.shift() as Task;
        if (!entry.cancelled) {
          entry.task();
        }
      }
    },
  };
}

function setup(createWorker: (() => WorkerLike) | null = null) {
  const workers: FakeWorker[] = [];
  const clock = manualClock();
  const factory =
    createWorker ??
    (() => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    });
  const runner = createCoalitionRunner({
    createWorker: factory,
    schedule: clock.schedule,
  });
  return { runner, workers, clock };
}

describe('preview worker safety', () => {
  it('reports an unavailable worker without starting a main-thread search', () => {
    const clock = manualClock();
    const runner = createCoalitionRunner({
      createWorker: null,
      schedule: clock.schedule,
      allowInPage: false,
    });
    runner.update(scenarioOf(baselineInput()));
    clock.flush();
    expect(runner.getRun()).toMatchObject({
      state: 'failed',
      reason: 'worker-unavailable',
    });
    expect(clock.tasks).toHaveLength(0);
    runner.dispose();
  });

  it('reports a worker post failure instead of leaving a search running', () => {
    const clock = manualClock();
    const worker = new FakeWorker();
    worker.postMessage = () => {
      throw new Error('transfer failed');
    };
    const runner = createCoalitionRunner({
      createWorker: () => worker,
      schedule: clock.schedule,
      allowInPage: false,
    });
    runner.update(scenarioOf(baselineInput()));
    expect(() => clock.flush()).not.toThrow();
    expect(runner.getRun()).toEqual({
      state: 'failed',
      message: 'transfer failed',
    });
    expect(worker.terminated).toBe(true);
    runner.dispose();
  });

  it('ignores a queued success after the preview worker fails', () => {
    const clock = manualClock();
    const worker = new FakeWorker();
    const runner = createCoalitionRunner({
      createWorker: () => worker,
      schedule: clock.schedule,
      allowInPage: false,
    });
    runner.update(scenarioOf(baselineInput()));
    clock.flush();
    worker.onerror?.(new Error('worker failed'));
    worker.answerLast();
    expect(runner.getRun()).toEqual({
      state: 'failed',
      message: 'worker failed',
    });
    runner.dispose();
  });
});

describe('worker request body', () => {
  it('posts the analysis of the full run with the lists on request', () => {
    const scenario = scenarioOf(baselineInput());
    const messages: CoalitionMessage[] = [];
    runCoalitionRequest({ id: 7, scenario }, (message) =>
      messages.push(message),
    );
    const blocked = blockedMajorities(
      scenario,
      runSeats(scenario).allocation,
    ).blocked;
    expect(blocked).toHaveLength(3);
    expect(messages).toEqual([
      {
        id: 7,
        type: 'done',
        analysis: runScenario(scenario).coalitions,
        minimalWinningTotal:
          runScenario(scenario).coalitions.minimalWinning.length,
        extras: {
          variants: nearestCoalitions(scenario, runSeats(scenario).allocation),
          larger: [],
          largerTotal: 0,
          largerComplete: true,
          blocked,
          blockedTotal: 3,
          blockedComplete: true,
          pivotal: [
            { partyId: 'P1', coalitions: 0, indispensable: false },
            { partyId: 'P2', coalitions: 0, indispensable: false },
            { partyId: 'P4', coalitions: 0, indispensable: false },
          ],
          pivotalComplete: true,
        },
      },
    ]);
  });

  it('lists at most LISTED_COALITIONS coalitions and reports how many were found', () => {
    const scenario = scenarioOf(largeInput({ eligible: 20 }));
    const full = runScenario(scenario).coalitions;
    expect(full.minimalWinning.length).toBeGreaterThan(LISTED_COALITIONS);
    const messages: CoalitionMessage[] = [];
    runCoalitionRequest({ id: 9, scenario }, (message) => {
      if (message.type !== 'progress') {
        messages.push(message);
      }
    });
    expect(messages).toEqual([
      {
        id: 9,
        type: 'done',
        analysis: {
          ...full,
          minimalWinning: full.minimalWinning.slice(0, LISTED_COALITIONS),
        },
        minimalWinningTotal: full.minimalWinning.length,
        extras: expect.any(Object),
      },
    ]);
  });

  it('caps both lists on request at LISTED_COALITIONS and reports their totals', () => {
    const scenario = scenarioOf(largeInput({ eligible: 20 }));
    const extras = doneOf(scenario).extras;
    if (extras === undefined) {
      throw new Error('expected the lists on request');
    }
    expect(extras.larger).toHaveLength(LISTED_COALITIONS);
    expect(extras.largerTotal).toBeGreaterThan(LISTED_COALITIONS);
    expect(extras.largerComplete).toBe(false);
    expect(extras.blocked).toHaveLength(LISTED_COALITIONS);
    expect(extras.blockedTotal).toBeGreaterThan(LISTED_COALITIONS);
    expect(extras.blockedComplete).toBe(false);
  });

  it('counts pivotal parties over the full list, not the listed rows', () => {
    const scenario = scenarioOf(largeInput({ eligible: 20 }));
    const full = runScenario(scenario).coalitions;
    expect(full.complete).toBe(true);
    expect(full.minimalWinning.length).toBeGreaterThan(LISTED_COALITIONS);
    const extras = doneOf(scenario).extras;
    if (extras === undefined) {
      throw new Error('expected the lists on request');
    }
    expect(extras.pivotal).toEqual(pivotalParties(full));
    expect(extras.pivotal).not.toEqual(
      pivotalParties({
        ...full,
        minimalWinning: full.minimalWinning.slice(0, LISTED_COALITIONS),
      }),
    );
    const memberships = full.minimalWinning.reduce(
      (sum, coalition) => sum + coalition.partyIds.length,
      0,
    );
    expect(extras.pivotal.reduce((sum, row) => sum + row.coalitions, 0)).toBe(
      memberships,
    );
    expect(extras.pivotalComplete).toBe(true);
  });

  it('marks the pivotal rows of an incomplete search', () => {
    const scenario = scenarioOf(largeInput({ eligible: 21 }));
    const full = runScenario(scenario).coalitions;
    expect(full.complete).toBe(false);
    const extras = doneOf(scenario).extras;
    if (extras === undefined) {
      throw new Error('expected the lists on request');
    }
    expect(extras.pivotal).toEqual(pivotalParties(full));
    expect(extras.pivotal).toHaveLength(21);
    expect(extras.pivotalComplete).toBe(false);
  });

  it('posts an error message instead of throwing', () => {
    const messages: CoalitionMessage[] = [];
    runCoalitionRequest(
      { id: 3, scenario: { broken: true } as unknown as Scenario },
      (message) => messages.push(message),
    );
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({ id: 3, type: 'error' });
    expect((messages[0] as { message: string }).message).not.toBe('');
  });
});

describe('coalition runner', () => {
  it('starts idle and posts nothing until the debounce ends', () => {
    const { runner, workers, clock } = setup();
    expect(runner.getRun()).toEqual({ state: 'idle' });
    runner.update(scenarioOf(baselineInput()));
    expect(runner.getRun()).toEqual({
      state: 'running',
      nodesVisited: 0,
      budget: DEFAULT_NODE_BUDGET,
    });
    expect(clock.tasks.map((task) => task.delayMs)).toEqual([DEBOUNCE_MS]);
    expect(workers.flatMap((worker) => worker.posted)).toEqual([]);
    clock.flush();
    expect(workers).toHaveLength(1);
    expect(workers[0]?.posted).toHaveLength(1);
  });

  it('reports progress and the finished analysis', () => {
    const { runner, workers, clock } = setup();
    const scenario = scenarioOf(baselineInput());
    const states: string[] = [];
    runner.subscribe(() => states.push(runner.getRun().state));
    runner.update(scenario);
    clock.flush();
    const worker = workers[0] as FakeWorker;
    const id = (worker.posted[0] as CoalitionRequest).id;
    worker.emit({ id, type: 'progress', nodesVisited: 20_000 });
    expect(runner.getRun()).toEqual({
      state: 'running',
      nodesVisited: 20_000,
      budget: DEFAULT_NODE_BUDGET,
    });
    worker.answerLast();
    expect(runner.getRun()).toEqual(doneRun(scenario, false));
    expect(states[states.length - 1]).toBe('done');
  });

  it('collapses rapid updates into one search of the last scenario', () => {
    const { runner, workers, clock } = setup();
    const last = scenarioOf(presetInput('split'));
    runner.update(scenarioOf(baselineInput()));
    runner.update(scenarioOf(presetInput('multiBlock')));
    runner.update(last);
    clock.flush();
    const posted = workers.flatMap((worker) => worker.posted);
    expect(posted).toHaveLength(1);
    expect(posted[0]?.scenario).toBe(last);
  });

  it('ignores the same scenario object', () => {
    const { runner, workers, clock } = setup();
    const scenario = scenarioOf(baselineInput());
    runner.update(scenario);
    clock.flush();
    workers[0]?.answerLast();
    const done = runner.getRun();
    runner.update(scenario);
    expect(runner.getRun()).toBe(done);
    expect(clock.tasks).toEqual([]);
  });

  it('drops messages from a stale search', () => {
    const { runner, workers, clock } = setup();
    runner.update(scenarioOf(baselineInput()));
    clock.flush();
    const stale = workers[0] as FakeWorker;
    const staleId = (stale.posted[0] as CoalitionRequest).id;
    runner.update(scenarioOf(presetInput('split')));
    expect(stale.terminated).toBe(true);
    clock.flush();
    stale.emit({ id: staleId, type: 'progress', nodesVisited: 40_000 });
    expect(runner.getRun()).toMatchObject({
      state: 'running',
      nodesVisited: 0,
    });
    const fresh = workers[workers.length - 1] as FakeWorker;
    const freshId = (fresh.posted[fresh.posted.length - 1] as CoalitionRequest)
      .id;
    expect(freshId).not.toBe(staleId);
  });

  it('cancels a running search and runs it again on request', () => {
    const { runner, workers, clock } = setup();
    const scenario = scenarioOf(baselineInput());
    runner.update(scenario);
    clock.flush();
    runner.cancel();
    expect(runner.getRun()).toEqual({ state: 'cancelled' });
    expect(workers[0]?.terminated).toBe(true);
    runner.rerun();
    expect(runner.getRun()).toMatchObject({ state: 'running' });
    const latest = workers[workers.length - 1] as FakeWorker;
    expect(latest.posted[latest.posted.length - 1]?.scenario).toBe(scenario);
    latest.answerLast();
    expect(runner.getRun()).toMatchObject({ state: 'done', inPage: false });
  });

  it('reports a worker failure', () => {
    const { runner, workers, clock } = setup();
    runner.update(scenarioOf(baselineInput()));
    clock.flush();
    workers[0]?.onerror?.(new Error('boom'));
    expect(runner.getRun()).toEqual({ state: 'failed', message: 'boom' });
    expect(workers[0]?.terminated).toBe(true);
    runner.rerun();
    const worker = workers[1] as FakeWorker;
    const id = (worker.posted[0] as CoalitionRequest).id;
    worker.emit({ id, type: 'error', message: 'bad' });
    expect(runner.getRun()).toEqual({ state: 'failed', message: 'bad' });
  });

  it('returns to idle when the scenario becomes invalid', () => {
    const { runner, workers, clock } = setup();
    runner.update(scenarioOf(baselineInput()));
    clock.flush();
    runner.update(null);
    expect(runner.getRun()).toEqual({ state: 'idle' });
    expect(workers[0]?.terminated).toBe(true);
    expect(clock.tasks).toEqual([]);
  });

  it.each([
    ['no worker factory', null],
    [
      'a factory that throws',
      () => {
        throw new Error('blocked');
      },
    ],
  ] as const)('searches in the page with %s', (_label, factory) => {
    const clock = manualClock();
    const runner = createCoalitionRunner({
      createWorker: factory,
      schedule: clock.schedule,
    });
    const scenario = scenarioOf(baselineInput());
    runner.update(scenario);
    clock.flush();
    expect(runner.getRun()).toEqual(doneRun(scenario, true));
  });

  it('stops notifying after dispose', () => {
    const { runner, workers, clock } = setup();
    let calls = 0;
    runner.subscribe(() => {
      calls += 1;
    });
    runner.update(scenarioOf(baselineInput()));
    clock.flush();
    runner.dispose();
    const before = calls;
    workers[0]?.answerLast();
    expect(calls).toBe(before);
    expect(workers[0]?.terminated).toBe(true);
  });
});

describe('store connection', () => {
  it('pushes the validated scenario and ignores view changes', () => {
    const store = createStore();
    const { runner, workers, clock } = setup();
    const disconnect = connectRunner(store, runner);
    clock.flush();
    expect(workers.flatMap((worker) => worker.posted)).toHaveLength(1);
    store.setView('seats');
    clock.flush();
    expect(workers.flatMap((worker) => worker.posted)).toHaveLength(1);
    store.loadPreset('split');
    clock.flush();
    expect(workers.flatMap((worker) => worker.posted)).toHaveLength(2);
    disconnect();
    store.loadPreset('baseline');
    clock.flush();
    expect(workers.flatMap((worker) => worker.posted)).toHaveLength(2);
  });

  it('sends null for an invalid scenario', () => {
    const store = createStore({ input: 'not a scenario' });
    const { runner } = setup();
    connectRunner(store, runner);
    expect(runner.getRun()).toEqual({ state: 'idle' });
  });
});

describe('baseline connection', () => {
  function spyRunner(): {
    runner: CoalitionRunner;
    pushed: (Scenario | null)[];
  } {
    const pushed: (Scenario | null)[] = [];
    const runner: CoalitionRunner = {
      getRun: () => ({ state: 'idle' }),
      subscribe: () => () => undefined,
      update: vi.fn((scenario: Scenario | null) => {
        pushed.push(scenario);
      }),
      cancel: vi.fn(),
      rerun: vi.fn(),
      dispose: vi.fn(),
    };
    return { runner, pushed };
  }

  it('pushes null while no baseline is saved', () => {
    const store = createStore();
    const { runner, pushed } = spyRunner();
    connectBaselineRunner(store, runner);
    expect(pushed).toEqual([null]);
  });

  it('pushes the saved baseline and the same object until it changes', () => {
    const store = createStore();
    const { runner, pushed } = spyRunner();
    connectBaselineRunner(store, runner);
    store.saveBaseline();
    const saved = pushed[pushed.length - 1];
    expect(saved).toEqual(scenarioOf(baselineInput()));
    store.loadPreset('split');
    store.setView('compare');
    for (const scenario of pushed.slice(1)) {
      expect(scenario).toBe(saved);
    }
    store.saveBaseline();
    const replaced = pushed[pushed.length - 1];
    expect(replaced).not.toBe(saved);
    expect(replaced).toEqual(scenarioOf(presetInput('split')));
    store.clearBaseline();
    expect(pushed[pushed.length - 1]).toBeNull();
  });

  it('starts one baseline search per save with a real runner', () => {
    const store = createStore();
    const { runner, workers, clock } = setup();
    connectBaselineRunner(store, runner);
    clock.flush();
    expect(workers.flatMap((worker) => worker.posted)).toHaveLength(0);
    store.saveBaseline();
    clock.flush();
    store.loadPreset('split');
    store.loadPreset('multiBlock');
    clock.flush();
    const posted = workers.flatMap((worker) => worker.posted);
    expect(posted).toHaveLength(1);
    expect(posted[0]?.scenario).toEqual(scenarioOf(baselineInput()));
  });

  it('stops pushing after disconnect', () => {
    const store = createStore();
    const { runner, pushed } = spyRunner();
    const disconnect = connectBaselineRunner(store, runner);
    disconnect();
    store.saveBaseline();
    expect(pushed).toEqual([null]);
  });
});
