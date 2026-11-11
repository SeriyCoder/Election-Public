import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { partyModeInput, type Json } from '../engine/helpers/scenarios';
import {
  expect,
  lastBlobText,
  loadScenario,
  openApp,
  openEditorPage,
  seatsOf,
  showView,
  test,
} from './helpers';

function fixture(known = false): Json {
  const input = partyModeInput(
    [
      ['1', '2'],
      ['1', '2'],
    ],
    { populationTotal: '1000', turnout: '0.7', threshold: '0' },
  );
  input.name = 'Composition fixture';
  input.groups = ['Group 1', 'Group 2', 'Other / unclassified'].map(
    (name, index) => ({
      id: `G${index + 1}`,
      name,
      notes: '',
      turnout: '0.7',
      growthRate: '0',
      turnoutChange: '0',
    }),
  );
  if (known) {
    (input.parties as Json[])[0]!.composition = {
      G1: { numerator: '1', denominator: '3' },
      G2: { numerator: '1', denominator: '3' },
      G3: { numerator: '1', denominator: '3' },
    };
  }
  return input;
}

async function visibleSeats(page: Page): Promise<Record<string, string>> {
  await showView(page, 'seats');
  const seats = await seatsOf(page);
  await showView(page, 'inputs');
  return seats;
}

test.describe('optional party composition', () => {
  test('offers unknown, starts explicit equal assumptions and updates the chart without changing seats', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    await loadScenario(page, fixture());
    const before = await visibleSeats(page);
    await openEditorPage(page, 'parties');
    const panel = page.locator('[data-party-composition="P1"]');
    await expect(panel).toBeVisible({ timeout: 3000 });
    await panel.locator('summary').click();
    await expect(
      panel.locator('[data-composition-state="unknown"]'),
    ).toBeVisible();
    await expect(panel.locator('[data-composition-group]')).toHaveCount(0);
    await panel.locator('[data-action="composition-begin"]').click();
    await expect(
      panel.locator('[data-composition-state="known"]'),
    ).toBeVisible();
    await expect(panel.locator('[data-composition-chart]')).toBeVisible();
    await expect(panel.locator('[data-composition-group="G1"]')).toHaveValue(
      '33.3333333333333333',
    );
    await panel.locator('[data-composition-group="G1"]').fill('40');
    await expect(panel.locator('[data-composition-group="G2"]')).toHaveValue(
      '30',
    );
    await expect(panel.locator('[data-composition-group="G3"]')).toHaveValue(
      '30',
    );
    expect(await visibleSeats(page)).toEqual(before);
    await page.locator('[data-action="export"]').click();
    const exported = JSON.parse(await lastBlobText(page)) as Json;
    expect((exported.parties as Json[])[0]!.composition).toEqual({
      G1: { numerator: '2', denominator: '5' },
      G2: { numerator: '3', denominator: '10' },
      G3: { numerator: '3', denominator: '10' },
    });
  });

  test('keeps exact non-terminating fractions on focus, invalid input and cancelled unknown confirmation', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    await loadScenario(page, fixture(true));
    const beforeSeats = await visibleSeats(page);
    await openEditorPage(page, 'parties');
    const panel = page.locator('[data-party-composition="P1"]');
    await expect(panel).toBeVisible({ timeout: 3000 });
    await panel.locator('summary').click();
    const field = panel.locator('[data-composition-group="G1"]');
    await field.focus();
    await field.blur();
    await field.fill('101');
    await expect(panel.locator('[data-composition-error]')).toBeVisible();
    expect(await visibleSeats(page)).toEqual(beforeSeats);
    await panel.locator('[data-action="composition-unknown-request"]').click();
    const confirmation = panel.locator('[data-composition-confirm]');
    await expect(confirmation).toBeVisible();
    await confirmation
      .locator('[data-action="composition-unknown-cancel"]')
      .click();
    await expect(confirmation).toHaveCount(0);
    await page.locator('[data-action="export"]').click();
    const exported = JSON.parse(await lastBlobText(page)) as Json;
    expect((exported.parties as Json[])[0]!.composition).toEqual({
      G1: { numerator: '1', denominator: '3' },
      G2: { numerator: '1', denominator: '3' },
      G3: { numerator: '1', denominator: '3' },
    });
  });

  test('requires confirmation to mark a known mix unknown', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, fixture(true));
    const before = await visibleSeats(page);
    await openEditorPage(page, 'parties');
    const panel = page.locator('[data-party-composition="P1"]');
    await expect(panel).toBeVisible({ timeout: 3000 });
    await panel.locator('summary').click();
    await panel.locator('[data-action="composition-unknown-request"]').click();
    await panel.locator('[data-action="composition-unknown-confirm"]').click();
    await expect(
      panel.locator('[data-composition-state="unknown"]'),
    ).toBeVisible();
    expect(await visibleSeats(page)).toEqual(before);
    await page.locator('[data-action="export"]').click();
    const exported = JSON.parse(await lastBlobText(page)) as Json;
    expect((exported.parties as Json[])[0]!.composition).toBeNull();
  });

  test('displays the unknown share separately from the Other group', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, fixture());
    await showView(page, 'composition');
    const table = page.locator('[data-table="composition"]');
    await expect(table.locator('[data-group="G3"]')).toContainText(
      'Other / unclassified',
    );
    await expect(table.locator('[data-composition="unknown"]')).toBeVisible({
      timeout: 3000,
    });
    await expect(
      page.locator('[data-composition-basis="voters"]'),
    ).toBeVisible();
  });

  test('identifies JSON exports when a worker creates a later blob', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, fixture(true));
    await page.locator('[data-action="export"]').click();
    await page.evaluate(() => {
      URL.createObjectURL(
        new Blob(['self.onmessage = () => {};'], { type: 'text/javascript' }),
      );
    });
    const exported = JSON.parse(await lastBlobText(page)) as Json;
    expect((exported.parties as Json[])[0]!.composition).toEqual({
      G1: { numerator: '1', denominator: '3' },
      G2: { numerator: '1', denominator: '3' },
      G3: { numerator: '1', denominator: '3' },
    });
  });

  test('is accessible and fits in RTL on desktop and phone', async ({
    page,
  }) => {
    await openApp(page, 'he');
    await loadScenario(page, fixture());
    await openEditorPage(page, 'parties');
    const panel = page.locator('[data-party-composition="P1"]');
    await expect(panel).toBeVisible({ timeout: 3000 });
    await panel.locator('summary').click();
    await panel.locator('[data-action="composition-begin"]').click();
    const result = await new AxeBuilder({ page })
      .include('[data-party-composition="P1"]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.filter(
        (item) => item.impact === 'serious' || item.impact === 'critical',
      ),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    await panel.locator('[data-composition-group="G1"]').focus();
    await expect(panel.locator('[data-composition-group="G1"]')).toBeFocused();
  });
});
