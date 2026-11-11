import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';
import { runSeats } from '../../src/engine/run';
import { parseScenarioJson, type Scenario } from '../../src/engine/schema';
import { book, expect, nextTo, openBook, test, toBuild } from './helpers';

/** M7-16: the opening page's ready examples, opened and leafed through. */
function fixture(): Scenario {
  const text = readFileSync(
    new URL('../fixtures/new8.json', import.meta.url),
    'utf8',
  );
  const parsed = parseScenarioJson(text);
  if (!parsed.ok) throw new Error('the new8 fixture must import');
  return parsed.scenario;
}

function expectedSeats(scenario: Scenario): Record<string, string> {
  return Object.fromEntries(
    runSeats(scenario).allocation.parties.map((party) => [
      party.partyId,
      String(party.seats),
    ]),
  );
}

const ISRAEL_SEATS = {
  likud: '31',
  'yesh-atid': '30',
  avoda: '11',
  'religious-zionism': '14',
  shas: '18',
  raam: '16',
};

async function workspaceSeats(page: Page): Promise<Record<string, string>> {
  const cells = page.locator('[data-party-seats]');
  await expect(cells.first()).toHaveAttribute('data-party-seat-state', 'ready');
  return cells.evaluateAll((list) =>
    Object.fromEntries(
      list.map((cell) => [
        cell.getAttribute('data-party-seats') ?? '',
        (cell.textContent ?? '').trim(),
      ]),
    ),
  );
}

async function inputs(page: Page): Promise<string[]> {
  return page
    .locator('input[data-book-field]')
    .evaluateAll((list) =>
      list.map((field) => (field as HTMLInputElement).value),
    );
}

test.describe('M7-16 ready examples at the start', () => {
  test('the opening page offers four starts', async ({ page }) => {
    await openBook(page);
    await expect(book(page)).toHaveAttribute('data-page', 'intro');
    for (const start of ['blank', 'eight', 'israel']) {
      await expect(page.locator(`[data-start-card="${start}"]`)).toBeVisible();
    }
    await expect(page.locator('[data-action="start-skip"]')).toBeVisible();
    await page.locator('[data-action="start-skip"]').click();
    await expect(page.locator('.app')).toHaveAttribute(
      'data-active-view',
      'coalitions',
    );
  });

  for (const [id, seats] of [
    ['eight', () => expectedSeats(fixture())],
    ['israel', () => ISRAEL_SEATS],
  ] as const) {
    test(`opens the ${id} example on Coalitions and Demographic Future`, async ({
      page,
    }) => {
      await openBook(page);
      await page
        .locator(`[data-start="${id}"][data-start-mode="open"]`)
        .click();
      await expect(page.locator('.app')).toHaveAttribute(
        'data-active-view',
        'coalitions',
      );
      const shown = await workspaceSeats(page);
      expect(
        Object.fromEntries(
          Object.entries(shown).map(([party, text]) => [
            party,
            text.replace(/\D/g, ''),
          ]),
        ),
      ).toEqual(seats());
      await expect(page.locator('[data-coalition-tile]').first()).toBeVisible();
      await page.locator('[data-view="future"]').click();
      await expect(page.locator('.app')).toHaveAttribute(
        'data-active-view',
        'future',
      );
      await expect(page.locator('[data-future-card]').first()).toBeVisible();
    });
  }

  test('leafs through the eight-party example with every value prefilled', async ({
    page,
  }) => {
    await openBook(page);
    await page.locator('[data-start="eight"][data-start-mode="book"]').click();
    await expect(book(page)).toHaveAttribute('data-page', 'parties.count');
    expect(await inputs(page)).toEqual(['8']);
    await nextTo(page, 'turnout');
    expect(await inputs(page)).toEqual([
      '50',
      '60',
      '65',
      '80',
      '65',
      '80',
      '60',
    ]);
    await nextTo(page, 'votes.shares');
    expect(await inputs(page)).toEqual([
      '19',
      '12',
      '19',
      '8',
      '6',
      '12',
      '10',
      '14',
    ]);
    await nextTo(page, 'growth');
    expect(await inputs(page)).toHaveLength(7);
    await nextTo(page, 'coalitions');
    await toBuild(page);
    await page.locator('[data-action="book-build"]').click();
    await expect(page.locator('.app')).toHaveAttribute(
      'data-active-view',
      'coalitions',
    );
    const shown = await workspaceSeats(page);
    expect(
      Object.fromEntries(
        Object.entries(shown).map(([party, text]) => [
          party,
          text.replace(/\D/g, ''),
        ]),
      ),
    ).toEqual(expectedSeats(fixture()));
  });
});
