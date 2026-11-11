import type { Page } from '@playwright/test';
import {
  partyModeBudgetCompositionInput,
  partyModeBudgetExpansionInput,
  type Json,
} from '../engine/helpers/scenarios';
import {
  expect,
  loadScenario,
  openApp,
  openEditorPage,
  seatsOf,
  showView,
  test,
} from './helpers';
import { largeInput } from './scenarios';

const BUDGET_MS = 200;

const VOTES_CELL =
  '[data-table="parties"] tr[data-party="P1"] [data-cell="votes"]';

/**
 * One ordinary edit, timed inside the page: from just before the input event
 * to the frame after the seats table shows new votes.
 */
async function timedEdit(page: Page, value: string): Promise<number> {
  return page.evaluate(
    async ({ value, cell }) => {
      const field = document.querySelector<HTMLInputElement>(
        '[data-entity="group"][data-id="G1"] [data-fraction="turnout"]',
      );
      if (field === null) {
        throw new Error('no turnout field');
      }
      const before = document.querySelector(cell)?.textContent;
      const start = performance.now();
      field.value = value;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise<void>((resolve, reject) => {
        const limit = start + 5000;
        const check = () => {
          if (document.querySelector(cell)?.textContent !== before) {
            requestAnimationFrame(() => resolve());
          } else if (performance.now() > limit) {
            reject(new Error('seats never updated'));
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      });
      return performance.now() - start;
    },
    { value, cell: VOTES_CELL },
  );
}

/** Longest gap between timer ticks over `ms`: how long input would wait. */
async function longestStall(
  page: Page,
  ms: number,
  clickSelector?: string,
): Promise<number> {
  return page.evaluate(
    async ({ ms, clickSelector }) => {
      let worst = 0;
      let last = performance.now();
      const end = last + ms;
      if (clickSelector !== undefined) {
        const field = document.querySelector<HTMLElement>(clickSelector);
        if (field === null)
          throw new Error('No control to start the measurement');
        field.click();
      }
      while (performance.now() < end) {
        await new Promise((resolve) => setTimeout(resolve, 0));
        const now = performance.now();
        worst = Math.max(worst, now - last);
        last = now;
      }
      return worst;
    },
    { ms, clickSelector },
  );
}

async function timedImport(page: Page, input: Json): Promise<number> {
  if (!Array.isArray(input.parties) || typeof input.name !== 'string') {
    throw new Error('expected a named party scenario');
  }
  return page.evaluate(
    async ({ text, name, count }) => {
      const field =
        document.querySelector<HTMLInputElement>('input[type="file"]');
      if (field === null) {
        throw new Error('no file input');
      }
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([text], 'budget.json', { type: 'application/json' }),
      );
      field.files = transfer.files;
      const start = performance.now();
      field.dispatchEvent(new Event('change', { bubbles: true }));
      return new Promise<number>((resolve, reject) => {
        const check = () => {
          if (
            document.querySelector('.toolbar__name')?.textContent === name &&
            document.querySelector('[data-result-state="ready"]') !== null &&
            document.querySelectorAll(
              '[data-table="parties"] [data-cell="seats"]',
            ).length === count
          ) {
            requestAnimationFrame(() => resolve(performance.now() - start));
          } else if (performance.now() - start > 5000) {
            reject(new Error('import did not produce the expected seats'));
          } else {
            requestAnimationFrame(check);
          }
        };
        check();
      });
    },
    {
      text: JSON.stringify(input),
      name: input.name,
      count: input.parties.length,
    },
  );
}

async function timedFutureYear(page: Page, year: number): Promise<number> {
  return page.evaluate(async (year) => {
    const field =
      document.querySelector<HTMLSelectElement>('[data-future-year]');
    const selector =
      '[data-table="future-groups"] [data-group="G2"] [data-cell="population-current"]';
    const before = document.querySelector(selector)?.textContent;
    if (field === null || before === undefined) {
      throw new Error('no future year or group population');
    }
    const start = performance.now();
    field.value = String(year);
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return new Promise<number>((resolve, reject) => {
      const check = () => {
        if (document.querySelector(selector)?.textContent !== before) {
          requestAnimationFrame(() => resolve(performance.now() - start));
        } else if (performance.now() - start > 5000) {
          reject(new Error('future group population did not update'));
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  }, year);
}

test.describe('performance at 20 groups / 30 parties / 10 blocks', () => {
  test.skip(({ isMobile }) => isMobile, 'measured on desktop');

  test(`ordinary edits update votes and seats within ${BUDGET_MS} ms`, async ({
    page,
  }, testInfo) => {
    await openApp(page);
    await loadScenario(page, largeInput({ eligible: 12 }));
    await showView(page, 'inputs');
    await openEditorPage(page, 'group:G1');
    await expect(page.locator(VOTES_CELL)).toBeVisible();
    const timings: number[] = [];
    for (const value of [
      '90',
      '80',
      '70',
      '60',
      '50',
      '40',
      '30',
      '20',
      '10',
    ]) {
      timings.push(await timedEdit(page, value));
    }
    const sorted = [...timings].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? Infinity;
    await testInfo.attach('timings', {
      body: JSON.stringify({ timings, median }, null, 2),
      contentType: 'application/json',
    });

    expect(median).toBeLessThanOrEqual(BUDGET_MS);
  });

  test('a long coalition search shows progress, can be stopped and keeps input free', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, largeInput({ eligible: 30 }));
    await showView(page, 'coalitions');
    await expect(page.locator('[data-progress="coalitions"]')).toBeVisible();
    expect(await longestStall(page, 400)).toBeLessThan(BUDGET_MS);
    await page.locator('[data-action="cancel-coalitions"]').click();
    await expect(page.locator('[data-note="cancelled"]')).toBeVisible();
    await page.locator('[data-action="rerun-coalitions"]').click();
    await expect(page.locator('[data-progress="coalitions"]')).toBeVisible();
  });

  test('a search over the limits ends incomplete without freezing the page', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, largeInput({ eligible: 30 }));
    await showView(page, 'coalitions');
    await expect(page.locator('[data-coalition-summary="search"]')).toHaveText(
      /^Incomplete/,
      { timeout: 20_000 },
    );
    expect(await longestStall(page, 300)).toBeLessThan(BUDGET_MS);
    const start = Date.now();
    await page.locator('[data-view="inputs"]').click();
    await expect(page.locator('.app')).toHaveAttribute(
      'data-active-view',
      'inputs',
    );
    expect(Date.now() - start).toBeLessThan(1000);
  });

  test('a future range scan keeps the page responsive within the 200 ms budget', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, largeInput({ eligible: 30 }));
    await showView(page, 'future');
    const control = '[data-critical-party="red:P1"]';
    await expect(page.locator(control)).toBeVisible();
    expect(await longestStall(page, 1000, control)).toBeLessThan(BUDGET_MS);
    await expect(page.locator('[data-future-scan-state="done"]')).toBeVisible({
      timeout: 20_000,
    });
  });
});

test.describe('M7-01 performance near the exact denominator budget', () => {
  test.skip(({ isMobile }) => isMobile, 'measured on desktop');

  test(`40 lists import and show seats within ${BUDGET_MS} ms`, async ({
    page,
  }, testInfo) => {
    await openApp(page);
    await showView(page, 'seats');
    const input = partyModeBudgetExpansionInput(50);
    const timings: number[] = [];
    for (let index = 0; index < 9; index += 1) {
      input.name = `Exact budget ${index}`;
      timings.push(await timedImport(page, input));
    }
    const sorted = [...timings].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? Infinity;
    await testInfo.attach('exact-import-timings', {
      body: JSON.stringify({ timings, median }, null, 2),
      contentType: 'application/json',
    });
    const seats = Object.values(await seatsOf(page)).map(Number);
    expect(seats).toHaveLength(40);
    expect(seats.reduce((total, value) => total + value, 0)).toBe(120);
    expect(median).toBeLessThanOrEqual(BUDGET_MS);
  });

  test(`known eight-group projections update within ${BUDGET_MS} ms`, async ({
    page,
  }, testInfo) => {
    await openApp(page);
    await loadScenario(page, partyModeBudgetCompositionInput());
    await showView(page, 'future');
    const population = page.locator(
      '[data-table="future-groups"] [data-group="G2"] [data-cell="population-current"]',
    );
    await expect(population).not.toHaveText('-');
    const timings: number[] = [];
    for (const year of [1, 2, 1, 2, 1, 2, 1, 2, 1]) {
      timings.push(await timedFutureYear(page, year));
    }
    const sorted = [...timings].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? Infinity;
    await testInfo.attach('exact-future-timings', {
      body: JSON.stringify({ timings, median }, null, 2),
      contentType: 'application/json',
    });
    expect(median).toBeLessThanOrEqual(BUDGET_MS);
  });
});
