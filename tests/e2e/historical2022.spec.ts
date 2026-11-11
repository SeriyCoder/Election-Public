import AxeBuilder from '@axe-core/playwright';
import { partyModeInput, type Json } from '../engine/helpers/scenarios';
import {
  expect,
  loadPresetFixture,
  lastBlobText,
  loadScenario,
  openApp,
  openEditorPage,
  seatsOf,
  showView,
  test,
} from './helpers';

async function loadHistoricalPreset(page: Parameters<typeof openApp>[0]) {
  await loadPresetFixture(page, 'historical2022');
}

function customLists(): Json {
  const input = partyModeInput(
    [
      ['1', '2'],
      ['1', '2'],
    ],
    { threshold: '0' },
  );
  input.name = 'Custom lists';
  const parties = input.parties as Json[];
  parties[0]!.name = 'Likud';
  parties[1]!.name = 'Yesh Atid';
  return input;
}

test.describe('historical 2022 reference', () => {
  test('shows historical facts independently of the saved baseline', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await showView(page, 'compare');
    const reference = page.locator('[data-historical-reference]');
    await expect(reference).toBeVisible();
    await expect(reference.locator('[data-historical-source]')).toBeVisible();
    await expect(
      reference.locator('[data-historical-field="eligible"]'),
    ).toContainText('6,788,804');
    await expect(
      reference.locator('[data-historical-field="cast"]'),
    ).toContainText('4,794,593');
    await expect(
      reference.locator('[data-historical-field="valid"]'),
    ).toContainText('4,764,742');
    await expect(
      reference.locator('[data-historical-field="invalid"]'),
    ).toContainText('29,851');
    await expect(
      reference.locator('[data-historical-field="turnout"]'),
    ).toContainText('70.63');
    await expect(
      reference.locator('[data-historical-model-validity]'),
    ).toContainText('99.9');
    await expect(
      reference.locator('[data-historical-method="official"]'),
    ).toContainText(/Bader/i);
    await expect(
      reference.locator('[data-historical-method="hamilton"]'),
    ).toContainText(/Hamilton/i);
    await reference.locator('[data-action="historical-details"]').click();
    await expect(reference.locator('[data-historical-row]')).toHaveCount(40);
    const likud = reference.locator('[data-historical-row="likud"]');
    await expect(
      likud.locator('[data-historical-cell="official-seats"]'),
    ).toHaveText('32');
    await expect(
      likud.locator('[data-historical-cell="hamilton-seats"]'),
    ).toHaveText('31');
    await page.locator('[data-action="save-baseline"]').click();
    await expect(page.locator('[data-baseline-name]')).toBeVisible();
    await expect(reference).toBeVisible();
  });

  test('loads and exports all 40 exact shares with unknown composition', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadHistoricalPreset(page);
    await showView(page, 'seats');
    const seats = await seatsOf(page);
    expect(Object.keys(seats)).toHaveLength(40);
    expect(
      [
        'likud',
        'yesh-atid',
        'religious-zionism',
        'national-unity',
        'shas',
        'utj',
        'yisrael-beiteinu',
        'raam',
        'hadash-taal',
        'avoda',
      ].map((id) => seats[id]),
    ).toEqual(['31', '23', '14', '12', '11', '8', '6', '5', '5', '5']);
    await page.locator('[data-action="export"]').click();
    const exported = JSON.parse(await lastBlobText(page)) as Json;
    expect(exported.inputMode).toBe('parties');
    expect(exported.groups).toEqual([]);
    const parties = exported.parties as Json[];
    expect(parties).toHaveLength(40);
    expect(parties.every((party) => party.composition === null)).toBe(true);
    const likud = parties.find((party) => party.id === 'likud')!;
    const share = likud.voteShare as { numerator: string; denominator: string };
    expect(BigInt(share.numerator) * 4764742n).toBe(
      BigInt(share.denominator) * 1115336n,
    );
    const rules = exported.rules as Json;
    const turnout = rules.overallTurnout as {
      numerator: string;
      denominator: string;
    };
    expect(BigInt(turnout.numerator) * 6788804n).toBe(
      BigInt(turnout.denominator) * 4794593n,
    );
  });

  test('requires an explicit one-to-one mapping for custom list names', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, customLists());
    await showView(page, 'compare');
    const reference = page.locator('[data-historical-reference]');
    const first = reference.locator('[data-historical-current-row="P1"]');
    await expect(first).toHaveAttribute('data-match', 'unmatched');
    await reference
      .locator('[data-historical-current-select]')
      .selectOption('P1');
    await reference
      .locator('[data-historical-target-select]')
      .selectOption('likud');
    await reference.locator('[data-action="historical-match"]').click();
    await expect(first).toHaveAttribute('data-match', 'explicit');
    await expect(first).toHaveAttribute('data-historical-id', 'likud');
    await showView(page, 'inputs');
    await showView(page, 'compare');
    await expect(first).toHaveAttribute('data-match', 'explicit');

    await reference
      .locator('[data-historical-current-select]')
      .selectOption('P2');
    await reference
      .locator('[data-historical-target-select]')
      .selectOption('likud');
    await reference.locator('[data-action="historical-match"]').click();
    await expect(
      reference.locator('[data-historical-match-error="duplicate-reference"]'),
    ).toBeVisible();
    await expect(first).toHaveAttribute('data-match', 'explicit');
    await expect(
      reference.locator('[data-historical-current-row="P2"]'),
    ).toHaveAttribute('data-match', 'unmatched');
  });

  test('allows an automatic or explicit match to be removed and restored', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadHistoricalPreset(page);
    await showView(page, 'compare');
    const reference = page.locator('[data-historical-reference]');
    const likud = reference.locator('[data-historical-current-row="likud"]');
    await expect(likud).toHaveAttribute('data-match', 'automatic');
    await likud.locator('[data-action="historical-unmatch"]').click();
    await expect(likud).toHaveAttribute('data-match', 'unmatched');
    await showView(page, 'inputs');
    await showView(page, 'compare');
    await expect(likud).toHaveAttribute('data-match', 'unmatched');
    await likud.locator('[data-action="historical-restore-match"]').click();
    await expect(likud).toHaveAttribute('data-match', 'automatic');

    await loadScenario(page, customLists());
    const first = reference.locator('[data-historical-current-row="P1"]');
    await reference
      .locator('[data-historical-current-select]')
      .selectOption('P1');
    await reference
      .locator('[data-historical-target-select]')
      .selectOption('likud');
    await reference.locator('[data-action="historical-match"]').click();
    await expect(first).toHaveAttribute('data-match', 'explicit');
    await first.locator('[data-action="historical-unmatch"]').click();
    await expect(first).toHaveAttribute('data-match', 'unmatched');
    await first.locator('[data-action="historical-restore-match"]').click();
    await expect(first).toHaveAttribute('data-match', 'unmatched');
  });

  test('clears explicit matches on scenario replacement without clearing the baseline', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, customLists());
    await showView(page, 'compare');
    await page.locator('[data-action="save-baseline"]').click();
    const reference = page.locator('[data-historical-reference]');
    await reference
      .locator('[data-historical-current-select]')
      .selectOption('P1');
    await reference
      .locator('[data-historical-target-select]')
      .selectOption('likud');
    await reference.locator('[data-action="historical-match"]').click();
    await expect(
      reference.locator('[data-historical-current-row="P1"]'),
    ).toHaveAttribute('data-match', 'explicit');
    const replacement = customLists();
    replacement.name = 'Replacement';
    await loadScenario(page, replacement);
    await expect(
      reference.locator('[data-historical-current-row="P1"]'),
    ).toHaveAttribute('data-match', 'unmatched');
    await expect(page.locator('[data-baseline-name]')).toContainText(
      'Custom lists',
    );
    await expect(reference).toBeVisible();
  });

  test('prunes a deleted list mapping so its historical identity can be reused', async ({
    page,
  }) => {
    const input = partyModeInput(
      [
        ['1', '2'],
        ['1', '2'],
        ['0', '1'],
      ],
      { threshold: '0' },
    );
    input.name = 'Three lists';
    await openApp(page, 'en');
    await loadScenario(page, input);
    await showView(page, 'compare');
    const reference = page.locator('[data-historical-reference]');
    await reference
      .locator('[data-historical-current-select]')
      .selectOption('P3');
    await reference
      .locator('[data-historical-target-select]')
      .selectOption('likud');
    await reference.locator('[data-action="historical-match"]').click();
    await expect(
      reference.locator('[data-historical-current-row="P3"]'),
    ).toHaveAttribute('data-match', 'explicit');
    await showView(page, 'inputs');
    await openEditorPage(page, 'parties');
    await page
      .locator('[data-entity="party"][data-id="P3"] [data-action="delete"]')
      .click();
    await expect(
      page.locator('[data-entity="party"][data-id="P3"]'),
    ).toHaveCount(0);
    await showView(page, 'compare');
    await reference
      .locator('[data-historical-current-select]')
      .selectOption('P1');
    await reference
      .locator('[data-historical-target-select]')
      .selectOption('likud');
    await reference.locator('[data-action="historical-match"]').click();
    await expect(
      reference.locator('[data-historical-current-row="P1"]'),
    ).toHaveAttribute('data-match', 'explicit');
    await expect(
      reference.locator('[data-historical-match-error]'),
    ).toHaveCount(0);
  });

  test('is accessible and fits offline phone and RTL layouts', async ({
    page,
  }) => {
    await openApp(page, 'he');
    await showView(page, 'compare');
    const reference = page.locator('[data-historical-reference]');
    await expect(reference).toBeVisible();
    await reference.locator('[data-action="historical-details"]').click();
    await expect(reference.locator('[data-historical-row]')).toHaveCount(40);
    const result = await new AxeBuilder({ page })
      .include('[data-historical-reference]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      result.violations.filter((violation) =>
        ['serious', 'critical'].includes(violation.impact ?? ''),
      ),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  });
});
