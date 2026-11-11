import { workspaceLinked, workspaceParties } from '../engine/helpers/workspace';
import { expect, loadScenario, openApp, showView, test } from './helpers';

const noOverflow = () => document.documentElement.scrollWidth <= innerWidth;

test.describe('M7-17 prototype fidelity', () => {
  test('opens the future tab on four cards that share the Coalitions tiles', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    await loadScenario(page, workspaceParties());
    await showView(page, 'coalitions');
    const tiles = await page
      .locator('[data-coalition-tile]')
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-coalition-tile')),
      );
    expect(tiles).toHaveLength(4);
    await page.locator('[data-view="future"]').click();
    const cards = page.locator('[data-future-card]');
    await expect(cards).toHaveCount(4);
    await expect(cards.first()).toBeVisible();
    expect(
      await cards.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute('data-future-card')),
      ),
    ).toEqual(tiles);
    await expect(page.locator('[data-future-details]')).not.toHaveAttribute(
      'open',
      /.*/,
    );
    const select = page.locator('[data-future-card-select]').first();
    const other = await select
      .locator('option')
      .evaluateAll(
        (nodes, taken) =>
          nodes
            .map((node) => (node as HTMLOptionElement).value)
            .find((value) => value.includes('+') && !taken.includes(value)),
        tiles,
      );
    expect(other).toBeTruthy();
    await select.selectOption(other!);
    await expect(cards.first()).toHaveAttribute('data-future-card', other!);
    await page.locator('[data-view="coalitions"]').click();
    await expect(page.locator('[data-coalition-tile]').first()).toHaveAttribute(
      'data-coalition-tile',
      other!,
    );
  });

  test('switches to the one-coalition turnout experiment with three rings', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    await loadScenario(page, workspaceLinked());
    await showView(page, 'future');
    await page.locator('[data-future-mode="experiment"]').click();
    const card = page.locator('[data-experiment-card]');
    await expect(card).toBeVisible();
    await expect(card.locator('.ws-ring')).toHaveCount(3);
    await expect(card.locator('[data-experiment-split]')).toBeVisible();
    await expect(card.locator('[data-experiment-select]')).toBeVisible();
    await expect(page.locator('[data-future-card]')).toHaveCount(0);
  });

  test('never clips the future cards or the opened details at 1440 by 900', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop layout');
    await page.setViewportSize({ width: 1440, height: 900 });
    await openApp(page, 'ru');
    await loadScenario(page, workspaceLinked());
    await page.locator('[data-view="future"]').click();
    await page.locator('[data-future-details] > summary').click();
    const clipped = await page.evaluate(() => {
      const found: string[] = [];
      for (const marker of [
        '[data-growth-card]',
        '[data-future-cards]',
        '[data-future-details]',
      ]) {
        for (
          let node = document.querySelector(marker);
          node && node !== document.body;
          node = node.parentElement
        ) {
          const style = getComputedStyle(node);
          if (
            /(auto|scroll|hidden)/.test(style.overflowY) &&
            node.scrollHeight > node.clientHeight + 1
          )
            found.push(`${marker} in ${node.className}`);
        }
      }
      return found;
    });
    expect(clipped).toEqual([]);
    const last = page.locator('[data-future-details] [data-panel]').last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeInViewport();
  });

  test('steps the supporter coefficient by a twentieth and resets the turnout', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, workspaceLinked());
    await showView(page, 'coalitions');
    const field = page.locator('[data-supporter-coef="P1"]');
    const result = page.locator('[data-supporter-result="P1"]');
    await expect(field).toHaveValue('0.00');
    await expect(result).toContainText('60.0');
    await page.locator('[data-supporter-nudge="P1"]').last().click();
    await expect(field).toHaveValue('0.05');
    await field.fill('0.5');
    await expect(result).toContainText('80.0');
    await page.locator('[data-open-turnout="G1"]').click();
    await expect(page.locator('[data-correction="G1"]')).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.locator('[data-action="panel-reset-turnout"]').click();
    await expect(field).toHaveValue('0.00');
    await expect(result).toContainText('60.0');
  });

  test('lists every relation of the chosen party in two columns with arrows', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop', 'desktop columns');
    await openApp(page, 'ru');
    await loadScenario(page, workspaceParties());
    await showView(page, 'coalitions');
    const list = page.locator('[data-panel-relations] .ws-rule-list');
    await expect(list.locator('.ws-rule-row')).toHaveCount(2);
    expect(
      await list.evaluate(
        (node) =>
          getComputedStyle(node).gridTemplateColumns.trim().split(/\s+/).length,
      ),
    ).toBe(2);
    const party = page.locator('[data-rules-party]');
    const first = await party.inputValue();
    await page.locator('[data-action="rules-next"]').click();
    await expect(party).not.toHaveValue(first);
    await page.locator('[data-action="rules-previous"]').click();
    await expect(party).toHaveValue(first);
    await expect(page.locator('.directed-relations__pages')).toHaveCount(0);
  });

  test('keeps the old coalition sections closed under one "more" area', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    await loadScenario(page, workspaceParties());
    await page.locator('[data-view="coalitions"]').click();
    const more = page.locator('[data-workspace-more]');
    await expect(more).toBeVisible();
    for (const marker of [
      '[data-coalition-results]',
      '[data-workspace-compare]',
      '[data-workspace-history]',
    ])
      await expect(more.locator(marker)).not.toHaveAttribute('open', /.*/);
    await more.locator('[data-coalition-results] > summary').click();
    await expect(
      more.locator('[data-coalition-summary="search"]'),
    ).toBeVisible();
  });

  for (const view of ['coalitions', 'future'] as const)
    test(`keeps the ${view} tab inside the width in Hebrew`, async ({
      page,
    }) => {
      await openApp(page, 'he');
      await loadScenario(page, workspaceParties());
      await page.locator(`[data-view="${view}"]`).click();
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      expect(await page.evaluate(noOverflow)).toBe(true);
    });
});
