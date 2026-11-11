import { describe, expect, it, vi } from 'vitest';
import type {
  CriticalSets,
  FutureRangeResult,
} from '../../src/engine/futureRange';
import { validateScenario, type Scenario } from '../../src/engine/schema';
import type { Schedule } from '../../src/ui/coalitionRunner';
import {
  connectFutureScanRunner,
  createFutureScanRunner,
  runFutureScanRequest,
  type FutureScanMessage,
  type FutureScanRequest,
  type FutureScanRunner,
  type FutureScanWorker,
} from '../../src/ui/futureScanRunner';
import { createStore, type Store } from '../../src/ui/store';
import { nonMonotoneFutureInput } from '../engine/helpers/futureFixtures';
import type { Json } from '../engine/helpers/scenarios';

const SETS: CriticalSets = { red: ['X'], orange: ['Y'] };

function scenarioOf(input: unknown): Scenario {
  const validation = validateScenario(input);
  if (!validation.ok) throw new Error('Expected a valid fixture');
  return validation.scenario;
}

function emptyResult(): FutureRangeResult {
  return {
    years: [],
    crossings: { red: { state: 'empty' }, orange: { state: 'empty' } },
  };
}

class FakeWorker implements FutureScanWorker {
  readonly posted: FutureScanRequest[] = [];
  terminated = false;
  onmessage: ((event: { readonly data: FutureScanMessage }) => void) | null =
    null;
  onerror: ((event: unknown) => void) | null = null;

  postMessage(request: FutureScanRequest): void {
    this.posted.push(request);
  }

  terminate(): void {
    this.terminated = true;
  }

  emit(message: FutureScanMessage): void {
    this.onmessage?.({ data: message });
  }
}

interface ScheduledTask {
  readonly task: () => void;
  cancelled: boolean;
}

function clock(): {
  schedule: Schedule;
  tasks: ScheduledTask[];
  flush(): void;
} {
  const tasks: ScheduledTask[] = [];
  return {
    tasks,
    schedule(task) {
      const entry = { task, cancelled: false };
      tasks.push(entry);
      return () => {
        entry.cancelled = true;
      };
    },
    flush() {
      while (tasks.length > 0) {
        const entry = tasks.shift()!;
        if (!entry.cancelled) entry.task();
      }
    },
  };
}

function setup() {
  const workers: FakeWorker[] = [];
  const scheduler = clock();
  const runner = createFutureScanRunner({
    createWorker: () => {
      const worker = new FakeWorker();
      workers.push(worker);
      return worker;
    },
    schedule: scheduler.schedule,
  });
  return { runner, workers, scheduler };
}

function lastRequest(worker: FakeWorker): FutureScanRequest {
  const request = worker.posted.at(-1);
  if (request === undefined) throw new Error('Expected a posted request');
  return request;
}

describe('M7-10 future scan worker body', () => {
  it('posts ascending progress and the real exact 0–50 result', () => {
    const messages: FutureScanMessage[] = [];
    runFutureScanRequest(
      { id: 8, scenario: scenarioOf(nonMonotoneFutureInput()), sets: SETS },
      (message) => messages.push(message),
    );
    expect(
      messages
        .filter((message) => message.type === 'progress')
        .map((message) => message.year),
    ).toEqual(Array.from({ length: 51 }, (_, index) => index));
    const done = messages.find((message) => message.type === 'done');
    expect(done).toMatchObject({
      id: 8,
      result: { crossings: { red: { state: 'proven', year: 3, seats: 61 } } },
    });
  });

  it('posts an error instead of success for an invalid party ID', () => {
    const messages: FutureScanMessage[] = [];
    runFutureScanRequest(
      {
        id: 9,
        scenario: scenarioOf(nonMonotoneFutureInput()),
        sets: { red: ['missing'], orange: [] },
      },
      (message) => messages.push(message),
    );
    expect(messages.at(-1)).toMatchObject({ id: 9, type: 'error' });
    expect(messages.some((message) => message.type === 'done')).toBe(false);
  });
});

describe('M7-10 dedicated cancellable future scan runner', () => {
  it('starts no work while both sets are empty', () => {
    const { runner, workers, scheduler } = setup();
    runner.update(scenarioOf(nonMonotoneFutureInput()), {
      red: [],
      orange: [],
    });
    scheduler.flush();
    expect(workers).toHaveLength(0);
    expect(runner.getRun()).toEqual({ state: 'idle' });
    runner.dispose();
  });

  it('surfaces progress and a completed result from its worker', () => {
    const { runner, workers, scheduler } = setup();
    runner.update(scenarioOf(nonMonotoneFutureInput()), SETS);
    scheduler.flush();
    const worker = workers[0]!;
    const request = lastRequest(worker);
    worker.emit({ type: 'progress', id: request.id, year: 5 });
    expect(runner.getRun()).toEqual({ state: 'running', year: 5 });
    const result = emptyResult();
    worker.emit({ type: 'done', id: request.id, result });
    expect(runner.getRun()).toEqual({ state: 'done', result });
    runner.dispose();
  });

  it('terminates on cancellation and ignores a late completion', () => {
    const { runner, workers, scheduler } = setup();
    runner.update(scenarioOf(nonMonotoneFutureInput()), SETS);
    scheduler.flush();
    const worker = workers[0]!;
    const request = lastRequest(worker);
    runner.cancel();
    expect(worker.terminated).toBe(true);
    expect(runner.getRun()).toEqual({ state: 'cancelled' });
    worker.emit({ type: 'done', id: request.id, result: emptyResult() });
    expect(runner.getRun()).toEqual({ state: 'cancelled' });
    runner.dispose();
  });

  it('terminates obsolete work on a membership change and rejects stale worker messages', () => {
    const { runner, workers, scheduler } = setup();
    const scenario = scenarioOf(nonMonotoneFutureInput());
    runner.update(scenario, SETS);
    scheduler.flush();
    const old = workers[0]!;
    const oldRequest = lastRequest(old);
    runner.update(scenario, { red: ['Y'], orange: ['X'] });
    expect(old.terminated).toBe(true);
    scheduler.flush();
    const current = workers[1]!;
    const request = lastRequest(current);
    expect(request.id).not.toBe(oldRequest.id);
    old.emit({ type: 'done', id: oldRequest.id, result: emptyResult() });
    expect(runner.getRun().state).toBe('running');
    current.emit({ type: 'progress', id: request.id, year: 9 });
    expect(runner.getRun()).toEqual({ state: 'running', year: 9 });
    runner.dispose();
  });

  it('terminates obsolete work when the scenario input changes', () => {
    const { runner, workers, scheduler } = setup();
    const input = nonMonotoneFutureInput();
    runner.update(scenarioOf(input), SETS);
    scheduler.flush();
    const old = workers[0]!;
    const oldRequest = lastRequest(old);
    runner.update(scenarioOf({ ...input, name: 'New input' }), SETS);
    expect(old.terminated).toBe(true);
    scheduler.flush();
    expect(workers).toHaveLength(2);
    old.emit({ type: 'done', id: oldRequest.id, result: emptyResult() });
    expect(runner.getRun().state).toBe('running');
    runner.dispose();
  });

  it('treats party membership as an order-independent set', () => {
    const { runner, workers, scheduler } = setup();
    const scenario = scenarioOf(nonMonotoneFutureInput());
    runner.update(scenario, { red: ['X', 'Y'], orange: [] });
    scheduler.flush();
    const original = workers[0]!;
    runner.update(scenario, { red: ['Y', 'X'], orange: [] });
    scheduler.flush();
    expect(workers).toHaveLength(1);
    expect(original.terminated).toBe(false);
    expect(original.posted).toHaveLength(1);
    runner.dispose();
  });

  it('reports an unavailable worker without a main-thread range fallback', () => {
    const scheduler = clock();
    const runner = createFutureScanRunner({
      createWorker: null,
      schedule: scheduler.schedule,
    });
    runner.update(scenarioOf(nonMonotoneFutureInput()), SETS);
    scheduler.flush();
    expect(runner.getRun()).toMatchObject({
      state: 'failed',
      reason: 'worker-unavailable',
    });
    expect(scheduler.tasks).toHaveLength(0);
    runner.dispose();
  });

  it('surfaces a worker error, ignores its stale success and retries in a fresh worker', () => {
    const { runner, workers, scheduler } = setup();
    runner.update(scenarioOf(nonMonotoneFutureInput()), SETS);
    scheduler.flush();
    const old = workers[0]!;
    const request = lastRequest(old);
    old.onerror?.(new Error('worker failed'));
    expect(old.terminated).toBe(true);
    expect(runner.getRun()).toMatchObject({
      state: 'failed',
      message: 'worker failed',
    });
    old.emit({ type: 'done', id: request.id, result: emptyResult() });
    expect(runner.getRun().state).toBe('failed');
    runner.rerun();
    scheduler.flush();
    expect(workers).toHaveLength(2);
    const current = workers[1]!;
    const retried = lastRequest(current);
    current.emit({ type: 'done', id: retried.id, result: emptyResult() });
    expect(runner.getRun().state).toBe('done');
    runner.dispose();
  });

  it('does not silently succeed when posting a request fails', () => {
    const scheduler = clock();
    const worker = new FakeWorker();
    worker.postMessage = () => {
      throw new Error('transfer failed');
    };
    const runner = createFutureScanRunner({
      createWorker: () => worker,
      schedule: scheduler.schedule,
    });
    runner.update(scenarioOf(nonMonotoneFutureInput()), SETS);
    expect(() => scheduler.flush()).not.toThrow();
    expect(worker.terminated).toBe(true);
    expect(runner.getRun()).toMatchObject({
      state: 'failed',
      message: 'transfer failed',
    });
    runner.dispose();
  });
});

interface CriticalActions {
  toggleCriticalParty(color: 'red' | 'orange', partyId: string): void;
}

function critical(store: Store): Store & CriticalActions {
  if (
    !('toggleCriticalParty' in store) ||
    typeof store.toggleCriticalParty !== 'function'
  ) {
    throw new Error('M7-10 critical set actions are not implemented');
  }
  return store as Store & CriticalActions;
}

describe('M7-10 store to future scan connection', () => {
  it('does not restart for display-year or language changes, but invalidates edits and leaving the view', () => {
    const store = critical(
      createStore({ input: nonMonotoneFutureInput(), view: 'future' }),
    );
    store.toggleCriticalParty('red', 'X');
    const runner: FutureScanRunner = {
      getRun: () => ({ state: 'idle' }),
      subscribe: () => () => undefined,
      update: vi.fn(),
      cancel: vi.fn(),
      rerun: vi.fn(),
      dispose: vi.fn(),
    };
    const disconnect = connectFutureScanRunner(store, runner);
    expect(runner.update).toHaveBeenCalledTimes(1);
    store.setFutureYear(20);
    store.setLanguage('he');
    expect(runner.update).toHaveBeenCalledTimes(1);
    store.toggleCriticalParty('orange', 'Y');
    expect(runner.update).toHaveBeenCalledTimes(2);
    store.updateInput((input) => ({ ...(input as Json), name: 'Updated' }));
    expect(runner.update).toHaveBeenCalledTimes(3);
    store.setView('inputs');
    expect(runner.cancel).toHaveBeenCalled();
    disconnect();
  });

  it('invalidates an in-flight result when the current draft becomes invalid', () => {
    const store = critical(
      createStore({ input: nonMonotoneFutureInput(), view: 'future' }),
    );
    store.toggleCriticalParty('red', 'X');
    const runner: FutureScanRunner = {
      getRun: () => ({ state: 'idle' }),
      subscribe: () => () => undefined,
      update: vi.fn(),
      cancel: vi.fn(),
      rerun: vi.fn(),
      dispose: vi.fn(),
    };
    const disconnect = connectFutureScanRunner(store, runner);
    store.updateInput(() => 'invalid draft');
    const updates = vi.mocked(runner.update).mock.calls;
    expect(
      vi.mocked(runner.cancel).mock.calls.length > 0 ||
        updates.at(-1)?.[0] === null,
    ).toBe(true);
    disconnect();
  });
});
