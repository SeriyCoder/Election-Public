import AxeBuilder from '@axe-core/playwright';
import { workspaceLinked } from '../engine/helpers/workspace';
import type { Json } from '../engine/helpers/scenarios';
import {
  book,
  bookPage,
  expect,
  nextTo,
  openBook,
  test,
  setLocale,
  toBuild,
  openApp,
  loadScenario,
  showView,
  openEditorPage,
  lastBlobText,
} from './helpers';

type Fraction = readonly [bigint, bigint];

const fraction = (value: Json): Fraction => [
  BigInt(value.numerator as string),
  BigInt(value.denominator as string),
];

function gcd(a: bigint, b: bigint): bigint {
  return b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b);
}

const add = ([a, b]: Fraction, [c, d]: Fraction): Fraction => [
  a * d + c * b,
  b * d,
];

/**
 * Independent exact overall turnout of a party-first scenario: the voters of
 * each group from the party shares and compositions, over the eligible
 * population those voters imply through the group turnout.
 */
function overallTurnout(scenario: Json): Json {
  let voters: Fraction = [0n, 1n];
  let population: Fraction = [0n, 1n];
  for (const group of scenario.groups as Json[]) {
    let groupVoters: Fraction = [0n, 1n];
    for (const party of scenario.parties as Json[]) {
      const [s, t] = fraction(party.voteShare as Json);
      const [c, d] = fraction(
        (party.composition as Json)[group.id as string] as Json,
      );
      groupVoters = add(groupVoters, [s * c, t * d]);
    }
    const [n, m] = fraction(group.turnout as Json);
    voters = add(voters, groupVoters);
    population = add(population, [groupVoters[0] * m, groupVoters[1] * n]);
  }
  const numerator = voters[0] * population[1];
  const denominator = voters[1] * population[0];
  const common = gcd(numerator, denominator);
  return {
    numerator: String(numerator / common),
    denominator: String(denominator / common),
  };
}

test('compact questionnaire shows seven simultaneous rates, one composition page and independent pair ends', async ({
  page,
}) => {
  await openBook(page);
  await nextTo(page, 'people.set');
  await expect(
    bookPage(page, 'people.set').locator('[data-book-choice="example"]'),
  ).toBeChecked();
  await nextTo(page, 'turnout');
  await expect(
    bookPage(page, 'turnout').locator('[data-book-rate]'),
  ).toHaveCount(7);
  await nextTo(page, 'compose');
  const compose = bookPage(page, 'compose');
  await expect(page.locator('[data-fictional-party]')).toHaveCount(0);
  await expect(compose.locator('[data-compose-party] option')).toHaveCount(4);
  await expect(compose.locator('[data-book-cell]')).toHaveCount(7);
  await nextTo(page, 'growth');
  const growth = bookPage(page, 'growth');
  await expect(growth.locator('[data-book-rate]')).toHaveCount(7);
  const first = growth.locator('[data-book-field="0"]');
  await first.fill('2.5');
  await expect(growth.locator('[data-growth-warning]')).toHaveCount(0);
  await first.fill('2.50000001');
  await expect(growth.locator('[data-growth-warning]')).toHaveCount(1);
  await first.fill('-0.5');
  await expect(growth.locator('[data-growth-warning]')).toHaveCount(0);
  await first.fill('-0.50000001');
  await expect(growth.locator('[data-growth-warning]')).toHaveCount(1);
  await first.fill('0');
  await nextTo(page, 'coalitions');
  const ends = page.locator('[data-refusal]');
  const left = ends.nth(0);
  const right = ends.nth(1);
  await left.click();
  await expect(left).toHaveAttribute('aria-pressed', 'true');
  await expect(right).toHaveAttribute('aria-pressed', 'false');
  await right.click();
  await left.click();
  const refusal = (await right.getAttribute('data-refusal'))!.split(':');
  await expect(left).toHaveAttribute('aria-pressed', 'false');
  await expect(right).toHaveAttribute('aria-pressed', 'true');
  for (const locale of ['ru', 'en', 'he'] as const) {
    await setLocale(page, locale);
    expect(
      (await new AxeBuilder({ page }).analyze()).violations.filter((v) =>
        ['serious', 'critical'].includes(v.impact ?? ''),
      ),
    ).toEqual([]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await toBuild(page);
  await page.locator('[data-action="book-build"]').click();
  await expect(book(page)).toHaveCount(0);
  await expect(page.locator('.views [data-view]')).toHaveCount(3);
  await expect(page.locator('.presets__select')).toHaveCount(0);
  await expect(page.locator('[data-action="load-preset"]')).toHaveCount(0);
  await page.locator('[data-action="export"]').click();
  const exported = JSON.parse(await lastBlobText(page)) as Json;
  expect(
    (exported.parties as Json[]).every((party) => party.composition !== null),
  ).toBe(true);
  // The suggested group turnout: haredi 85%, every other group 70%.
  for (const group of exported.groups as Json[]) {
    expect(group.turnout).toEqual(
      group.id === 'haredi'
        ? { numerator: '17', denominator: '20' }
        : { numerator: '7', denominator: '10' },
    );
  }
  expect((exported.rules as Json).overallTurnout).toEqual(
    overallTurnout(exported),
  );
  expect(
    (exported.groups as Json[]).every((group) => group.turnoutChange === '0'),
  ).toBe(true);
  expect((exported.coalitionRules as Json).partyRefusals).toEqual([refusal]);
});

test('imported out-of-slider growth, legacy turnout change and directed refusals survive shared-tab edits', async ({
  page,
}) => {
  await openApp(page);
  const input = workspaceLinked();
  (input.groups as Json[])[0]!.growthRate = '0.12';
  (input.groups as Json[])[0]!.turnoutChange = '-0.03';
  (input.coalitionRules as Json).partyRefusals = [
    ['P1', 'P2'],
    ['P2', 'P1'],
  ];
  await loadScenario(page, input);
  await showView(page, 'coalitions');
  await expect(page.locator('[data-refusal="P1:P2"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.locator('[data-refusal="P2:P1"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.locator('[data-refusal="P1:P2"]').click();
  await page.locator('[data-panel-share="P1"]').fill('60');
  await page.locator('[data-action="panel-align"]').click();
  await showView(page, 'inputs');
  await openEditorPage(page, 'group:G1');
  await expect(
    page.locator('[data-id="G1"] [data-fraction="growthRate"]'),
  ).toHaveValue('12');
  await expect(page.locator('[data-fraction="turnoutChange"]')).toHaveCount(0);
  await expect(
    page.locator('[data-id="G1"] [data-legacy-turnout-change]'),
  ).toBeVisible();
  await showView(page, 'future');
  await expect(page.locator('[data-growth="G1"]')).toHaveValue('12');
  await page.locator('[data-action="export"]').click();
  const exported = JSON.parse(await lastBlobText(page)) as Json;
  expect((exported.groups as Json[])[0]).toMatchObject({
    growthRate: '0.12',
    turnoutChange: '-0.03',
  });
  expect((exported.coalitionRules as Json).partyRefusals).toEqual([
    ['P2', 'P1'],
  ]);
  const changedShares = (exported.parties as Json[]).map(
    (party) => party.voteShare,
  );
  expect(changedShares).not.toEqual(
    (input.parties as Json[]).map((party) => party.voteShare),
  );
  await showView(page, 'coalitions');
  await page.locator('[data-action="export"]').click();
  expect(JSON.parse(await lastBlobText(page))).toEqual(exported);
});
