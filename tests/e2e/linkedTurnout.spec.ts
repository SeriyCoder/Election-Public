import AxeBuilder from '@axe-core/playwright';
import {
  editLinkedGroupTurnout,
  editLinkedOverallTurnout,
} from '../../src/engine/linkedTurnout';
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

const fraction = (numerator: string, denominator: string) => ({
  numerator,
  denominator,
});

function fixture(known = true): Json {
  const input = partyModeInput(
    [
      ['1', '2'],
      ['1', '2'],
    ],
    {
      populationTotal: '1000',
      turnout: '0.6',
      validBallotRate: '0.999',
      threshold: '0',
      seatCount: 101,
    },
  );
  input.name = 'Linked turnout fixture';
  input.groups = ['G1', 'G2'].map((id) => ({
    id,
    name: id,
    notes: '',
    turnout: '0.6',
    growthRate: '0',
    turnoutChange: '0',
  }));
  if (known) {
    const parties = input.parties as Json[];
    parties[0]!.composition = {
      G1: fraction('4', '5'),
      G2: fraction('1', '5'),
    };
    parties[1]!.composition = {
      G1: fraction('1', '5'),
      G2: fraction('4', '5'),
    };
  }
  return input;
}

test.describe('linked group turnout', () => {
  test('updates party votes and seats and survives export and import without drift', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    await loadScenario(page, fixture());
    await openEditorPage(page, 'group:G1');
    const region = page.locator('[data-entity="group"][data-id="G1"]');
    await expect(region.locator('[data-linked-turnout="ready"]')).toBeVisible();
    await page.locator('[data-action="export"]').click();
    const unopened = JSON.parse(await lastBlobText(page)) as Json;
    expect(unopened.linkedModel ?? null).toBeNull();
    await region.locator('[data-fraction="turnout"]').fill('80');
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual({ P1: '55', P2: '46' });
    await showView(page, 'inputs');
    await page.locator('[data-action="export"]').click();
    const exported = JSON.parse(await lastBlobText(page)) as Json;
    expect(exported.schemaVersion).toBe(5);
    expect((exported.parties as Json[])[0]!.voteShare).toEqual(
      fraction('19', '35'),
    );
    expect((exported.groups as Json[])[0]!.turnout).toEqual(fraction('4', '5'));
    await loadScenario(page, exported);
    await openEditorPage(page, 'group:G1');
    await region.locator('[data-fraction="turnout"]').fill('80');
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual({ P1: '55', P2: '46' });
  });

  test('does not commit an approximated non-terminating turnout on focus or blur', async ({
    page,
  }) => {
    const first = editLinkedGroupTurnout(fixture(), 'G1', '80');
    if (!first.ok) throw new Error(`Unexpected refusal: ${first.reason}`);
    const scaled = editLinkedOverallTurnout(first.draft, '50');
    if (!scaled.ok) throw new Error(`Unexpected refusal: ${scaled.reason}`);
    await openApp(page);
    await loadScenario(page, scaled.draft);
    await openEditorPage(page, 'group:G1');
    const field = page
      .locator('[data-entity="group"][data-id="G1"]')
      .locator('[data-fraction="turnout"]');
    await field.focus();
    await field.blur();
    await page.locator('[data-action="export"]').click();
    const exported = JSON.parse(await lastBlobText(page)) as Json;
    expect((exported.groups as Json[])[0]!.turnout).toEqual(fraction('4', '7'));
    expect((exported.groups as Json[])[1]!.turnout).toEqual(fraction('3', '7'));
  });

  test('links the group turnout slider to the same party and seat calculation', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, fixture());
    await openEditorPage(page, 'group:G1');
    const region = page.locator('[data-entity="group"][data-id="G1"]');
    await expect(region.locator('[data-linked-turnout="ready"]')).toBeVisible();
    const slider = region.locator('[data-slider="turnout"]');
    await slider.focus();
    await page.keyboard.press('End');
    await expect(slider).toHaveValue('100');
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual({ P1: '58', P2: '43' });
    await showView(page, 'inputs');
    await page.locator('[data-action="export"]').click();
    const exported = JSON.parse(await lastBlobText(page)) as Json;
    expect((exported.parties as Json[])[0]!.voteShare).toEqual(
      fraction('23', '40'),
    );
  });

  test('explains unavailable group turnout while retaining ordinary seats', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, fixture(false));
    await openEditorPage(page, 'group:G1');
    const region = page.locator('[data-entity="group"][data-id="G1"]');
    await expect(
      region.locator('[data-linked-turnout="unknown-party-composition"]'),
    ).toBeVisible();
    await expect(region.locator('[data-fraction="turnout"]')).toBeDisabled();
    await expect(region.locator('[data-slider="turnout"]')).toBeDisabled();
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual({ P1: '51', P2: '50' });
  });

  test('keeps invalid text uncommitted without hiding seats', async ({
    page,
  }) => {
    await openApp(page);
    await loadScenario(page, fixture());
    await openEditorPage(page, 'group:G1');
    const region = page.locator('[data-entity="group"][data-id="G1"]');
    await region.locator('[data-fraction="turnout"]').fill('101');
    await expect(region.locator('[data-linked-turnout-error]')).toBeVisible();
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual({ P1: '51', P2: '50' });
    await showView(page, 'inputs');
    await page.locator('[data-action="export"]').click();
    const exported = JSON.parse(await lastBlobText(page)) as Json;
    expect((exported.parties as Json[])[0]!.voteShare).toEqual(
      fraction('1', '2'),
    );
  });

  test('visibly suspends the basis after a composition edit and explicitly rebuilds it', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    await loadScenario(page, fixture());
    await openEditorPage(page, 'group:G1');
    const region = page.locator('[data-entity="group"][data-id="G1"]');
    await expect(region.locator('[data-linked-turnout="ready"]')).toBeVisible();
    const field = region.locator('[data-fraction="turnout"]');
    await field.fill('80');
    await field.fill('60');

    await openEditorPage(page, 'parties');
    const panel = page.locator('[data-party-composition="P1"]');
    await panel.locator('summary').click();
    await panel.locator('[data-composition-group="G1"]').fill('70');
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual({ P1: '51', P2: '50' });
    await showView(page, 'future');
    await expect(
      page.locator('[data-projection-unavailable="suspended-model"]'),
    ).toBeVisible();
    await showView(page, 'inputs');
    await openEditorPage(page, 'group:G1');
    await expect(
      region.locator('[data-linked-turnout="suspended-model"]'),
    ).toBeVisible();
    await expect(field).toBeDisabled();
    await region.locator('[data-action="linked-rebuild"]').click();
    await expect(region.locator('[data-linked-turnout="ready"]')).toBeVisible();
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual({ P1: '51', P2: '50' });
  });

  test('is accessible and fits the phone and RTL layouts', async ({ page }) => {
    await openApp(page, 'he');
    await loadScenario(page, fixture());
    await openEditorPage(page, 'group:G1');
    const region = page.locator('[data-entity="group"][data-id="G1"]');
    await expect(region.locator('[data-linked-turnout="ready"]')).toBeVisible();
    const result = await new AxeBuilder({ page })
      .include('[data-entity="group"][data-id="G1"]')
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
    await region.locator('[data-fraction="turnout"]').focus();
    await expect(region.locator('[data-fraction="turnout"]')).toBeFocused();
  });
});
