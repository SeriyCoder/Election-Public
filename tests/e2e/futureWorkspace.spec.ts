import { workspaceLinked } from '../engine/helpers/workspace';
import { expect, loadScenario, openApp, showView, test } from './helpers';

test.describe('M7-12 demographic companion integration', () => {
  test('shows all three experiment snapshots and preserves competing parties', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, workspaceLinked());
    await showView(page, 'future');
    await page.locator('[data-future-mode="experiment"]').click();
    await page.locator('[data-supporter-target="P1"]').fill('80');
    await expect(page.locator('[data-experiment-snapshot]')).toHaveCount(3);
    await expect(
      page.locator(
        '[data-experiment-snapshot="original"] [data-snapshot-party="P2"]',
      ),
    ).toBeVisible();
    await expect(
      page.locator(
        '[data-experiment-snapshot="today"] [data-snapshot-party="P2"]',
      ),
    ).toBeVisible();
    await page.locator('[data-enlarge="future"]').click();
    await expect(
      page.getByRole('dialog').locator('[data-action="future-play"]'),
    ).toBeVisible();
    await page.keyboard.press('Escape');
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
  test('plays integer years at selected speed, stops at fifty and pauses on edits', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, workspaceLinked());
    await showView(page, 'future');
    await page.locator('[data-future-speed]').selectOption('5');
    await page.locator('[data-future-year]').selectOption('49');
    await page.locator('[data-action="future-play"]').click();
    await expect(page.locator('[data-future-year]')).toHaveValue('50');
    await expect(page.locator('[data-action="future-play"]')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await page.locator('[data-future-year]').selectOption('0');
    await page.locator('[data-action="future-play"]').click();
    await page.locator('[data-growth="G1"]').fill('2');
    await expect(page.locator('[data-action="future-play"]')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
