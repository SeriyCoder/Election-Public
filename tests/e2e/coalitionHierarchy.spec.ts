import { readFileSync } from 'node:fs';
import { parseScenarioJson } from '../../src/engine/schema';
import { expect, loadScenario, openApp, showView, test } from './helpers';
import type { Json } from '../engine/helpers/scenarios';

function eightParties() {
  const parsed = parseScenarioJson(
    readFileSync(new URL('../fixtures/new8.json', import.meta.url), 'utf8'),
  );
  if (!parsed.ok) throw new Error('new8 fixture must import');
  return parsed.scenario;
}

test.describe('M7-21 coalition hierarchy and future selection', () => {
  test('defaults to the first two tiles, then preserves the manual choice', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    await loadScenario(page, eightParties() as unknown as Json);
    await showView(page, 'coalitions');
    const choices = page.locator(
      '[data-coalition-tile] input[type="checkbox"]',
    );
    await expect(choices).toHaveCount(4);
    await expect(choices.nth(0)).toBeChecked();
    await expect(choices.nth(1)).toBeChecked();
    await expect(choices.nth(2)).not.toBeChecked();
    await expect(choices.nth(3)).not.toBeChecked();
    const firstKey = await page
      .locator('[data-coalition-tile]')
      .nth(0)
      .getAttribute('data-coalition-tile');
    const secondKey = await page
      .locator('[data-coalition-tile]')
      .nth(1)
      .getAttribute('data-coalition-tile');
    expect(firstKey).not.toBeNull();
    expect(secondKey).not.toBeNull();
    await page
      .locator(`[data-coalition-tile="${firstKey}"] input[type="checkbox"]`)
      .uncheck();
    await page.locator('[data-action="tiles-expand"]').click();
    await expect(page.locator('[data-tiles-fullscreen]')).toBeVisible();
    await expect(page.locator('[data-panel-relations]')).toBeVisible();
    await page.locator('[data-action="tiles-expand"]').click();
    await expect(page.locator('[data-tiles-fullscreen]')).toHaveCount(0);
    await expect(
      page.locator(
        `[data-coalition-tile="${firstKey}"] input[type="checkbox"]`,
      ),
    ).not.toBeChecked();
    await expect(
      page.locator(
        `[data-coalition-tile="${secondKey}"] input[type="checkbox"]`,
      ),
    ).toBeChecked();
  });

  test('edits a custom coalition from its enlarged detail', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    await loadScenario(page, eightParties() as unknown as Json);
    await showView(page, 'coalitions');
    await page.locator('[data-tile-remove]').first().click();
    const existing = new Set(
      await page
        .locator('[data-coalition-tile] select option')
        .evaluateAll((options) =>
          options
            .map((option) => (option as HTMLOptionElement).value)
            .filter((value) => value !== 'custom' && value !== 'remove'),
        ),
    );
    await page.locator('[data-action="tile-custom"]').click();
    const customDialog = page.getByRole('dialog');
    const ids = await customDialog
      .locator('[data-custom-pick]')
      .evaluateAll((labels) =>
        labels.map((label) => label.getAttribute('data-custom-pick')!),
      );
    let missing: readonly string[] = [];
    for (let mask = 1; mask < 1 << ids.length; mask += 1) {
      const partyIds = ids.filter((_, at) => (mask & (1 << at)) !== 0);
      if (!existing.has(partyIds.join('+'))) {
        missing = partyIds;
        break;
      }
    }
    expect(missing.length).toBeGreaterThan(0);
    for (const id of missing) {
      await customDialog.locator(`[data-custom-pick="${id}"]`).click();
    }
    await customDialog.getByRole('button', { name: 'Применить' }).click();
    const custom = page.locator('[data-coalition-tile^="custom:"]').first();
    await custom.locator('[data-action="tile-enlarge"]').click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.getByRole('dialog').locator('[data-tile-edit]').click();
    await expect(
      page.getByRole('dialog').locator('[data-custom-pick]'),
    ).toHaveCount(8);
  });
});
