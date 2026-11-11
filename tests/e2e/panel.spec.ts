import AxeBuilder from '@axe-core/playwright';
import { workspaceLinked, workspaceParties } from '../engine/helpers/workspace';
import { expect, loadScenario, openApp, showView, test } from './helpers';

test.describe('M7-12 accepted integrated panel', () => {
  test('scrolls composition groups in at most five columns with the colour summary outside the scroll area', async ({
    page,
    isMobile,
  }) => {
    const input = workspaceLinked();
    const groups = Array.from({ length: 12 }, (_, index) => ({
      id: `G${index + 1}`,
      name: `Population group ${index + 1}`,
      notes: '',
      turnout: '0.6',
      growthRate: '0',
      turnoutChange: '0',
    }));
    input.groups = groups;
    for (const party of input.parties as Record<string, unknown>[]) {
      party.composition = Object.fromEntries(
        groups.map((group) => [
          group.id,
          { numerator: '1', denominator: '12' },
        ]),
      );
    }
    await openApp(page, 'en');
    await loadScenario(page, input);
    await showView(page, 'coalitions');
    for (const enlarged of [false, true]) {
      if (enlarged) await page.locator('[data-enlarge="composition"]').click();
      const panel = page.locator('[data-panel-composition]');
      const grid = panel.locator('.ws-groups');
      const summary = panel.locator('.ws-mix');
      const layout = await grid.evaluate((element) => {
        const cards = [...element.children];
        const top = cards[0]!.getBoundingClientRect().top;
        return {
          columns: cards.filter(
            (card) => Math.abs(card.getBoundingClientRect().top - top) < 1,
          ).length,
          height: element.clientHeight,
          contentHeight: element.scrollHeight,
          rowHeight: cards[0]!.getBoundingClientRect().height,
          gap: parseFloat(getComputedStyle(element).rowGap),
        };
      });
      expect(layout.columns).toBeLessThanOrEqual(5);
      if (enlarged && !isMobile) expect(layout.columns).toBe(5);
      expect(layout.contentHeight).toBeGreaterThan(layout.height);
      expect(layout.height).toBeLessThanOrEqual(
        2 * layout.rowHeight + layout.gap + 1,
      );
      await summary.scrollIntoViewIfNeeded();
      const before = await summary.boundingBox();
      await grid.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      expect(
        await grid.evaluate((element) => element.scrollTop),
      ).toBeGreaterThan(0);
      const after = await summary.boundingBox();
      expect(after?.y).toBe(before?.y);
      await expect(summary.locator('.ws-mix-bar span')).toHaveCount(12);
      await expect(summary).toBeInViewport();
      await grid.locator('[data-panel-cell="P1:G12"]').fill('10');
      await expect(grid.locator('[data-panel-cell="P1:G12"]')).toHaveValue(
        '10',
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (enlarged) await page.keyboard.press('Escape');
    }
  });
  test('keeps free votes and composition in Data, with focus-only repair links and exact alignment', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, workspaceLinked());
    await showView(page, 'coalitions');
    await page.locator('[data-panel-share="P1"]').fill('60.25');
    await expect(page.locator('[data-panel-balance]')).toHaveAttribute(
      'data-valid',
      'false',
    );
    await page.locator('[data-repair="align"]').first().click();
    await expect(page.locator('[data-action="panel-align"]')).toBeFocused();
    await expect(page.locator('[data-panel-balance]')).toHaveAttribute(
      'data-valid',
      'false',
    );
    await page.locator('[data-action="panel-align"]').click();
    await expect(page.locator('[data-panel-balance]')).toHaveAttribute(
      'data-valid',
      'true',
    );
    await page.locator('[data-panel-cell="P1:G1"]').fill('25');
    await expect(page.locator('[data-panel-row-total]')).toHaveAttribute(
      'data-valid',
      'false',
    );
    await page.locator('[data-action="panel-smooth"]').click();
    await expect(page.locator('[data-panel-row-total]')).toHaveAttribute(
      'data-valid',
      'true',
    );
    await showView(page, 'inputs');
    await expect(page.locator('[data-result-state]')).not.toHaveAttribute(
      'data-result-state',
      'invalid',
    );
  });
  test('previews and confirms baseline turnout while preserving seats and cancel discards', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, workspaceLinked());
    await showView(page, 'coalitions');
    await page.locator('[data-open-turnout="G1"]').click();
    const dialog = page.locator('[data-turnout-dialog]');
    await dialog.locator('[data-correction="G1"]').fill('80');
    await expect(dialog.locator('[data-correction-preview]')).toBeVisible();
    await dialog.locator('[data-action="correction-apply"]').click();
    await expect(dialog.locator('[data-correction-confirm]')).toBeVisible();
    await dialog.locator('[data-action="correction-confirm"]').click();
    await expect(dialog).toHaveCount(0);
    await page.locator('[data-open-turnout="G1"]').click();
    await expect(dialog.locator('[data-correction="G1"]')).toHaveValue('80');
    await dialog.locator('[data-correction="G1"]').fill('101');
    await expect(
      dialog.locator('[data-action="correction-apply"]'),
    ).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.locator('[data-open-turnout="G1"]').click();
    await expect(dialog.locator('[data-correction="G1"]')).toHaveValue('80');
  });
  test('freezes supporter experiments, makes correction read-only and resets explicitly', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, workspaceLinked());
    await showView(page, 'coalitions');
    // M7-17: the Coalitions tab enters the exact coefficient; 0.5 is the
    // target 80% from the 60% base.
    await page.locator('[data-supporter-coef="P1"]').fill('0.5');
    await page.locator('[data-open-turnout="G1"]').click();
    await expect(page.locator('[data-correction="G1"]')).toBeDisabled();
    await page
      .locator('[data-turnout-dialog] [data-action="panel-reset-experiment"]')
      .click();
    await expect(page.locator('[data-correction="G1"]')).toBeEnabled();
  });
  test('enlarges the live composition editor and survives twelve smoothing rounds', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, workspaceLinked());
    await showView(page, 'coalitions');
    await page.locator('[data-enlarge="composition"]').click();
    for (let round = 0; round < 12; round += 1) {
      await page.locator('[data-panel-cell="P1:G1"]').fill(`${30 + round}`);
      await page.locator('[data-action="panel-smooth"]').click();
    }
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-panel-row-total]')).toHaveAttribute(
      'data-valid',
      'true',
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(
      axe.violations.filter(
        (v) => v.impact === 'serious' || v.impact === 'critical',
      ),
    ).toEqual([]);
  });
  test('removes all tiles, refills nearest and keeps custom labels and directed decisions', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, workspaceParties());
    await showView(page, 'coalitions');
    await expect(page.locator('[data-coalition-tile]')).toHaveCount(4);
    for (let n = 0; n < 4; n += 1)
      await page.locator('[data-tile-remove]').first().click();
    await expect(page.locator('[data-coalition-tile]')).toHaveCount(0);
    await page.locator('[data-action="tiles-nearest"]').click();
    await expect(page.locator('[data-coalition-tile]')).toHaveCount(4);
    await page.locator('[data-refusal="P1:P2"]').click();
    await expect(page.locator('[data-refusal="P1:P2"]')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.locator('[data-refusal="P2:P1"]')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await page.locator('[data-action="rules-source"]').click();
    await expect(page.locator('[data-refusal="P1:P2"]')).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});
