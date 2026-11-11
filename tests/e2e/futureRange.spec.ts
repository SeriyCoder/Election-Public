import AxeBuilder from '@axe-core/playwright';
import {
  finalYearCrossingInput,
  nonMonotoneFutureInput,
  visualFutureInput,
} from '../engine/helpers/futureFixtures';
import {
  partyModeKnownPopulationInput,
  type Json,
} from '../engine/helpers/scenarios';
import {
  expect,
  isPhone,
  loadScenario,
  openApp,
  setLocale,
  showView,
  test,
} from './helpers';

test.describe('M7-10 demographic future graphics', () => {
  for (const locale of ['en', 'he'] as const) {
    test(`shows distinct accessible population and vote graphics in ${locale}`, async ({
      page,
    }, testInfo) => {
      await openApp(page, locale);
      await loadScenario(page, visualFutureInput());
      await showView(page, 'future');
      await page.locator('[data-future-year]').selectOption('1');
      const chooser = page.locator('[data-region="chooser"]');
      const results = page.locator('[data-region="results"]');
      const population = page.locator('[data-future-graphic="population"]');
      const votes = page.locator('[data-future-graphic="votes"]');
      await expect(population).toBeVisible();
      await expect(votes).toBeVisible();
      await expect(population).toHaveAttribute('data-scale-max', '1060');
      await expect(votes).toHaveAttribute('data-scale-max', '730');
      await expect(
        population.locator('[data-graphic-year="0"]'),
      ).toHaveAttribute('data-total', '1000');
      await expect(votes.locator('[data-graphic-year="1"]')).toHaveAttribute(
        'data-total',
        '730',
      );
      for (const [chart, ratio] of [
        [population, 1000 / 1060],
        [votes, 700 / 730],
      ] as const) {
        const present = await chart
          .locator('[data-graphic-year="0"] [data-graphic-fill]')
          .boundingBox();
        const future = await chart
          .locator('[data-graphic-year="1"] [data-graphic-fill]')
          .boundingBox();
        expect(present).not.toBeNull();
        expect(future).not.toBeNull();
        if (present === null || future === null) return;
        expect(future.width).toBeGreaterThan(0);
        expect(Math.abs(present.width / future.width - ratio)).toBeLessThan(
          0.02,
        );
      }
      const left = await chooser.boundingBox();
      const right = await results.boundingBox();
      expect(left).not.toBeNull();
      expect(right).not.toBeNull();
      if (left === null || right === null) return;
      if (isPhone(testInfo.project.name)) {
        expect(left.y + left.height).toBeLessThanOrEqual(right.y + 1);
      } else {
        expect(left.x + left.width).toBeLessThanOrEqual(right.x + 1);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      const accessibility = await new AxeBuilder({ page })
        .include('[data-region="chooser"]')
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      expect(
        accessibility.violations.filter(
          (item) => item.impact === 'serious' || item.impact === 'critical',
        ),
      ).toEqual([]);
    });
  }

  test('keeps the year control and known present votes for unavailable future data', async ({
    page,
  }) => {
    const input = partyModeKnownPopulationInput();
    input.parties = [{ ...(input.parties as Json[])[0], composition: null }];
    await openApp(page);
    await loadScenario(page, input);
    await showView(page, 'future');
    await expect(page.locator('[data-future-year]')).toBeVisible();
    await expect(
      page.locator('[data-future-graphic="votes"] [data-graphic-year="0"]'),
    ).toHaveAttribute('data-total', '999');
    await expect(
      page.locator('[data-projection-unavailable="unknown-party-composition"]'),
    ).toBeVisible();
    await page.locator('[data-future-year]').selectOption('0');
    await expect(page.locator('[data-future-year]')).toHaveValue('0');
  });
});

test.describe('M7-10 critical party combinations', () => {
  test('allows overlapping red and orange sets and finds a nonmonotone first crossing', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, nonMonotoneFutureInput());
    await showView(page, 'future');
    await expect(page.locator('[data-critical-party="red:X"]')).toBeVisible();
    await page.locator('[data-critical-party="red:X"]').check();
    await page.locator('[data-critical-party="orange:X"]').check();
    await page.locator('[data-critical-party="orange:Y"]').check();
    await expect(page.locator('[data-critical-party="red:X"]')).toBeChecked();
    await expect(
      page.locator('[data-critical-party="orange:X"]'),
    ).toBeChecked();
    const red = page.locator('[data-critical-result="red"]');
    const orange = page.locator('[data-critical-result="orange"]');
    await expect(red.locator('[data-crossing-state="proven"]')).toHaveAttribute(
      'data-crossing-year',
      '3',
    );
    await expect(
      orange.locator('[data-crossing-state="proven"]'),
    ).toHaveAttribute('data-crossing-year', '0');
    await page.locator('[data-future-year]').selectOption('20');
    await expect(red.locator('[data-set-year="20"]')).toHaveAttribute(
      'data-seats',
      '28',
    );
    await expect(red.locator('[data-crossing-state="proven"]')).toHaveAttribute(
      'data-crossing-year',
      '3',
    );
    await expect(page.locator('[data-critical-not-guaranteed]')).toBeVisible();
  });

  test('finds a crossing at the last year and is operable with the keyboard', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, finalYearCrossingInput());
    await showView(page, 'future');
    const checkbox = page.locator('[data-critical-party="red:X"]');
    await expect(checkbox).toBeVisible();
    await checkbox.focus();
    await page.keyboard.press('Space');
    await expect(checkbox).toBeChecked();
    await expect(
      page.locator(
        '[data-critical-result="red"] [data-crossing-state="proven"]',
      ),
    ).toHaveAttribute('data-crossing-year', '20');
  });

  test('reports an unavailable worker and offers retry without freezing the page', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'Worker', {
        configurable: true,
        value: undefined,
      });
    });
    await openApp(page);
    await loadScenario(page, finalYearCrossingInput());
    await showView(page, 'future');
    await expect(page.locator('[data-critical-party="red:X"]')).toBeVisible();
    await page.locator('[data-critical-party="red:X"]').check();
    await expect(
      page.locator('[data-future-scan-state="failed"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-future-scan-reason="worker-unavailable"]'),
    ).toBeVisible();
    await page.locator('[data-action="future-scan-retry"]').click();
    await expect(
      page.locator('[data-future-scan-state="failed"]'),
    ).toBeVisible();
    await page.locator('[data-future-year]').selectOption('1');
    await expect(page.locator('[data-future-year]')).toHaveValue('1');
  });

  test('shows progress, cancels and ignores a late worker result', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      class ControlledWorker {
        onmessage: ((event: { data: unknown }) => void) | null = null;
        onerror: ((event: unknown) => void) | null = null;

        postMessage(request: unknown): void {
          if (
            typeof request !== 'object' ||
            request === null ||
            !('sets' in request) ||
            !('id' in request) ||
            typeof request.id !== 'number'
          ) {
            return;
          }
          const id = request.id;
          window.setTimeout(() => {
            this.onmessage?.({ data: { id, type: 'progress', year: 5 } });
          }, 0);
          Object.defineProperty(window, '__futureLateMessage', {
            configurable: true,
            value: () =>
              this.onmessage?.({
                data: {
                  id,
                  type: 'done',
                  result: {
                    years: [],
                    crossings: {
                      red: { state: 'not-reached' },
                      orange: { state: 'empty' },
                    },
                  },
                },
              }),
          });
        }

        terminate(): void {}
      }
      Object.defineProperty(window, 'Worker', {
        configurable: true,
        value: ControlledWorker,
      });
    });
    await openApp(page);
    await loadScenario(page, finalYearCrossingInput());
    await showView(page, 'future');
    await expect(page.locator('[data-critical-party="red:X"]')).toBeVisible();
    await page.locator('[data-critical-party="red:X"]').check();
    const progress = page.locator('[data-future-scan-progress]');
    await expect(progress).toBeVisible();
    await expect(progress).toHaveAttribute('value', '6');
    await expect(progress).toHaveAttribute('max', '51');
    await page.locator('[data-action="future-scan-cancel"]').click();
    await expect(
      page.locator('[data-future-scan-state="cancelled"]'),
    ).toBeVisible();
    await page.evaluate(() => {
      const lateMessage = Reflect.get(window, '__futureLateMessage');
      if (typeof lateMessage !== 'function')
        throw new Error('No late worker message');
      lateMessage();
    });
    await expect(
      page.locator('[data-future-scan-state="cancelled"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-action="future-scan-retry"]'),
    ).toBeVisible();
    await expect(
      page.locator('[data-crossing-state="not-reached"]'),
    ).toHaveCount(0);
  });

  test('keeps the same search while the visible language and year change', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, nonMonotoneFutureInput());
    await showView(page, 'future');
    await expect(page.locator('[data-critical-party="red:X"]')).toBeVisible();
    await page.locator('[data-critical-party="red:X"]').check();
    const result = page.locator(
      '[data-critical-result="red"] [data-crossing-state="proven"]',
    );
    await expect(result).toHaveAttribute('data-crossing-year', '3');
    await page.locator('[data-future-year]').selectOption('20');
    await setLocale(page, 'he');
    await expect(result).toHaveAttribute('data-crossing-year', '3');
    await expect(page.locator('[data-critical-party="red:X"]')).toBeChecked();
  });
});
