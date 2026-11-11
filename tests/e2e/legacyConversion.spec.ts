import { section8Input, type Json } from '../engine/helpers/scenarios';
import {
  expect,
  lastBlobText,
  loadScenario,
  openApp,
  openEditorPage,
  showView,
  test,
} from './helpers';

test.describe('M7-09 simplified controls and safe conversion', () => {
  test('hides obsolete controls while the original legacy results remain', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await openEditorPage(page, 'group:G1');
    await expect(
      page.locator('[data-fraction="participationFactor"]'),
    ).toHaveCount(0);
    await expect(page.locator('[data-segmented="mode"]')).toHaveCount(0);
    await expect(page.locator('[data-editor="blocks"]')).toHaveCount(0);
    await expect(page.locator('[data-field="blockId"]')).toHaveCount(0);
    await expect(page.locator('[data-table="blocks"]')).toHaveCount(0);
    await expect(page.locator('[data-legacy-notice]')).toBeVisible();
    await showView(page, 'coalitions');
    await expect(page.locator('[data-party-seats="P1"]')).toHaveText('46');
  });

  test('previews and cancels without replacing or mutating a legacy scenario', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, section8Input('0.37'));
    await page.locator('[data-action="export"]').click();
    const before = await lastBlobText(page);
    await page.locator('[data-action="legacy-prepare"]').click();
    await expect(page.locator('[data-legacy-preview]')).toBeVisible();
    await expect(page.locator('[data-conversion-before]')).toBeVisible();
    await expect(page.locator('[data-conversion-after]')).toBeVisible();
    await page.locator('[data-action="legacy-cancel"]').click();
    await expect(page.locator('[data-legacy-preview]')).toHaveCount(0);
    await page.locator('[data-action="export"]').click();
    expect(await lastBlobText(page)).toBe(before);
  });

  test('confirms explicitly, keeps the independent original export and unchanged seats', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, section8Input('0.37'));
    await showView(page, 'coalitions');
    const seatsBefore = await page
      .locator('[data-party-seats]')
      .allTextContents();
    await page.locator('[data-action="legacy-prepare"]').click();
    await expect(page.locator('[data-legacy-preview]')).toBeVisible();
    await page.locator('[data-action="legacy-confirm"]').click();
    await expect(page.locator('[data-legacy-preview]')).toHaveCount(0);
    await expect(
      page.locator('[data-action="legacy-export-original"]'),
    ).toBeVisible();
    await page.locator('[data-action="export"]').click();
    const converted = JSON.parse(await lastBlobText(page)) as Json;
    expect(converted.inputMode).toBe('parties');
    expect(converted.blocks).toEqual([]);
    expect((converted.rules as Json).validBallotRate).toBe('0.999');
    expect(await page.locator('[data-party-seats]').allTextContents()).toEqual(
      seatsBefore,
    );
    await page.locator('[data-action="legacy-export-original"]').click();
    const original = JSON.parse(await lastBlobText(page)) as Json;
    expect(original.inputMode).toBe('groups');
    expect((original.blocks as Json[]).length).toBeGreaterThan(0);
  });

  test('reports an original download failure without claiming conversion failed', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, section8Input('0.37'));
    await page.locator('[data-action="legacy-prepare"]').click();
    await page.locator('[data-action="legacy-confirm"]').click();
    await page.evaluate(() => {
      URL.createObjectURL = () => {
        throw new Error('forced download failure');
      };
    });
    await page.locator('[data-action="legacy-export-original"]').click();
    await expect(page.locator('[data-legacy-export-error]')).toBeVisible();
    await expect(page.locator('[data-legacy-export-error]')).toContainText(
      'The original scenario could not be downloaded',
    );
  });

  test('explains an inexact conversion and leaves the original unchanged', async ({
    page,
  }) => {
    await openApp(page, 'en');
    const input = section8Input();
    (input.groups as Json[])[1]!.validBallotRate = '0.9';
    await loadScenario(page, input);
    await page.locator('[data-action="export"]').click();
    const before = await lastBlobText(page);
    await page.locator('[data-action="legacy-prepare"]').click();
    await expect(
      page.locator('[data-conversion-error="unrepresentable-vote-matrix"]'),
    ).toBeVisible();
    await expect(page.locator('[data-action="legacy-confirm"]')).toHaveCount(0);
    await page.locator('[data-action="export"]').click();
    expect(await lastBlobText(page)).toBe(before);
  });
});
