import type { Page } from '@playwright/test';
import {
  groupInput,
  partyInput,
  partyModeKnownPopulationInput,
  rulesInput,
  scenarioInput,
  type Json,
} from '../engine/helpers/scenarios';
import {
  expect,
  groupField,
  isPhone,
  loadScenario,
  openApp,
  openEditorPage,
  showView,
  test,
} from './helpers';

/** Section 14.2 fixture: lists X and Y in block K, an empty list Z. */
function fixture(): Json {
  return {
    ...scenarioInput({
      rules: rulesInput({ populationTotal: '1000', seatCount: 10 }),
      blocks: [{ id: 'K', name: 'Block K', color: '#224466' }],
      parties: [
        partyInput('X', 'K', 1),
        partyInput('Y', 'K', 2),
        partyInput('Z', null, 3),
      ],
      groups: [
        groupInput(
          'A',
          '0.6',
          { X: '0.8', Y: '0.2', Z: '0' },
          { turnout: '0.5' },
        ),
        groupInput('B', '0.4', { X: '0.2', Y: '0.8', Z: '0' }),
      ],
    }),
    name: 'Future fixture',
  };
}

function cell(page: Page, table: string, row: string, name: string) {
  return page.locator(`[data-table="${table}"] tr${row} [data-cell="${name}"]`);
}

/** M2-30 fixture: X 5, Y 3, Z 2 of 10 today; X 6, Y 2, Z 2 in year 3. */
function coalitionFixture(): Json {
  return {
    ...scenarioInput({
      rules: rulesInput({ populationTotal: '1000', seatCount: 10 }),
      parties: [
        partyInput('X', null, 1),
        partyInput('Y', null, 2),
        partyInput('Z', null, 3),
      ],
      groups: [
        groupInput('A', '0.5', { X: '1' }, { growthRate: '0.1' }),
        groupInput('B', '0.5', { Y: '0.6', Z: '0.4' }),
      ],
    }),
    name: 'Coalition future fixture',
  };
}

/** Five equal lists of 2 seats: every three of them are a minimal majority. */
function fiveEqualFixture(): Json {
  const ids = ['A', 'B', 'C', 'D', 'E'];
  return {
    ...scenarioInput({
      rules: rulesInput({ populationTotal: '1000', seatCount: 10 }),
      parties: ids.map((id, index) => partyInput(id, null, index + 1)),
      groups: [
        groupInput('G', '1', Object.fromEntries(ids.map((id) => [id, '0.2']))),
      ],
    }),
    name: 'Five equal lists',
  };
}

function choice(page: Page, key: string) {
  return page.locator(`[data-future-choice="${key}"] input[type="checkbox"]`);
}

test.describe('coalitions in the demographic future', () => {
  test('a ticked coalition follows the chosen year', async ({ page }) => {
    await openApp(page);
    await loadScenario(page, coalitionFixture());
    await showView(page, 'future');
    await expect(page.locator('[data-region="chooser"]')).toBeVisible();
    await expect(page.locator('[data-region="editor"]')).toHaveCount(0);
    await choice(page, 'X+Y').check();
    const card = page.locator('[data-future-coalition="X+Y"]');
    await expect(card).toBeVisible();
    await page.locator('[data-future-year]').selectOption('3');
    const x = card.locator('[data-member="X"]');
    await expect(x.locator('[data-cell="baseline"]')).toHaveText('5');
    await expect(x.locator('[data-cell="current"]')).toHaveText('6');
    await page.locator('[data-future-year]').selectOption('0');
    await expect(x.locator('[data-cell="current"]')).toHaveText('5');
    await expect(card.locator('[data-pie="year"]')).toHaveAttribute(
      'data-pie-state',
      'majority',
    );
    await choice(page, 'X+Y').uncheck();
    await expect(card).toHaveCount(0);
  });

  test('the Coalitions tab set can cross the majority line', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, coalitionFixture());
    await showView(page, 'coalitions');
    await page.locator('[data-choose="X"]').check();
    await showView(page, 'future');
    await page.locator('[data-future-year]').selectOption('3');
    await choice(page, 'X').check();
    const card = page.locator('[data-future-coalition="X"]');
    await expect(card.locator('[data-pie="base"]')).toHaveAttribute(
      'data-pie-state',
      'minority',
    );
    await expect(card.locator('[data-pie="year"]')).toHaveAttribute(
      'data-pie-state',
      'majority',
    );
  });

  test('follows four coalitions at most', async ({ page }) => {
    await openApp(page);
    await loadScenario(page, fiveEqualFixture());
    await showView(page, 'future');
    const boxes = page.locator('[data-future-choice] input[type="checkbox"]');
    await expect(boxes).toHaveCount(10);
    await boxes.nth(0).check();
    await boxes.nth(1).check();
    await boxes.nth(2).check();
    await boxes.nth(3).check();
    await expect(boxes.nth(4)).toBeDisabled();
    await expect(page.locator('[data-chooser-limit]')).toBeVisible();
    await expect(page.locator('[data-future-coalition]')).toHaveCount(4);
    await boxes.nth(1).uncheck();
    await expect(boxes.nth(4)).toBeEnabled();
    await expect(page.locator('[data-chooser-limit]')).toHaveCount(0);
  });

  test('the chooser stands beside or above the results', async ({
    page,
  }, testInfo) => {
    await openApp(page);
    await loadScenario(page, coalitionFixture());
    await showView(page, 'future');
    const chooser = await page.locator('[data-region="chooser"]').boundingBox();
    const results = await page.locator('[data-region="results"]').boundingBox();
    expect(chooser).not.toBeNull();
    expect(results).not.toBeNull();
    if (chooser === null || results === null) {
      return;
    }
    if (isPhone(testInfo.project.name)) {
      expect(chooser.y + chooser.height).toBeLessThanOrEqual(results.y + 1);
    } else {
      expect(chooser.x + chooser.width).toBeLessThanOrEqual(results.x + 1);
    }
  });
});

test.describe('future and composition', () => {
  test('M7-01 party-mode regressions show known and zero group populations', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, partyModeKnownPopulationInput());
    await showView(page, 'future');
    await page.locator('[data-future-year]').selectOption('1');
    await expect(
      cell(page, 'future-groups', '[data-group="G1"]', 'population-baseline'),
    ).toHaveText('1,000');
    await expect(
      cell(page, 'future-groups', '[data-group="G1"]', 'population-current'),
    ).toHaveText('1,100');
    await expect(
      cell(page, 'future-groups', '[data-group="G2"]', 'population-current'),
    ).toHaveText('0');
  });

  test('a growth rate typed in the editor moves the chosen year', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, fixture());
    await showView(page, 'inputs');
    await openEditorPage(page, 'group:A');
    await groupField(page, 'A', 'growthRate').fill('10');
    await showView(page, 'future');
    const year = page.locator('[data-future-year]');
    await expect(year).toHaveValue('4');
    await year.selectOption('1');
    await expect(
      cell(page, 'future-parties', '[data-party="X"]', 'votes-current'),
    ).toHaveText('344');
    await expect(
      cell(page, 'future-groups', '[data-group="A"]', 'population-current'),
    ).toHaveText('660');
    await expect(
      cell(page, 'future-totals', '[data-total="turnout"]', 'current'),
    ).toHaveText('68.87');
  });

  test('the year slider follows the keyboard', async ({ page }) => {
    await openApp(page);
    await loadScenario(page, fixture());
    await showView(page, 'future');
    const slider = page.locator('[data-future-slider]');
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-future-year]')).toHaveValue('5');
    await page.keyboard.press('Home');
    await expect(page.locator('[data-future-year]')).toHaveValue('0');
  });

  test('composition shows party electorates without a block target', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, fixture());
    await showView(page, 'composition');
    const target = page.locator('[data-composition-target]');
    await expect(target).toHaveValue('party:X');
    await expect(
      cell(page, 'composition', '[data-group="A"]', 'validShare'),
    ).toHaveText('75.00');
    await expect(
      cell(page, 'composition', '[data-group="B"]', 'validShare'),
    ).toHaveText('25.00');
    await expect(target.locator('option[value="block:K"]')).toHaveCount(0);
    await target.selectOption('party:Y');
    await expect(
      cell(page, 'composition', '[data-group="A"]', 'validShare'),
    ).toHaveText('15.79');
    await expect(
      cell(page, 'composition', '[data-group="B"]', 'validShare'),
    ).toHaveText('84.21');
    await target.selectOption('party:Z');
    await expect(page.locator('[data-composition="no-votes"]')).toBeVisible();
  });
});
