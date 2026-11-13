import AxeBuilder from '@axe-core/playwright';
import {
  editLinkedGroupTurnout,
  editLinkedOverallTurnout,
} from '../../src/engine/linkedTurnout';
import {
  partyModeInput,
  section8Input,
  type Json,
} from '../engine/helpers/scenarios';
import { workspaceLinked, workspaceParties } from '../engine/helpers/workspace';
import {
  expect,
  loadPresetFixture,
  lastBlobText,
  loadScenario,
  openApp,
  openEditorPage,
  showView as showWorkspaceView,
  test,
} from './helpers';

async function showView(...args: Parameters<typeof showWorkspaceView>) {
  await showWorkspaceView(...args);
  if (args[1] === 'coalitions') {
    const advanced = args[0].locator('[data-panel-advanced]');
    if ((await advanced.getAttribute('open')) === null) {
      await advanced.locator('summary').click();
    }
  }
}

const fraction = (numerator: string, denominator: string) => ({
  numerator,
  denominator,
});

test.describe('coalition workspace', () => {
  test('edits exact party shares with locks and updates the chosen coalition and baseline', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, workspaceParties());
    await showView(page, 'coalitions');
    const workspace = page.locator('[data-coalition-workspace]');
    await expect(workspace).toBeVisible({ timeout: 5000 });
    await workspace.locator('[data-workspace-compare] summary').click();
    await workspace.locator('[data-action="save-baseline"]').click();
    await page.locator('[data-choose="P1"]').check();
    await page.locator('[data-choose="P2"]').check();
    await workspace.locator('[data-lock="party:P2"]').click();
    await workspace.locator('[data-party-share-input="P1"]').fill('40');
    await expect(workspace.locator('[data-party-seats="P1"]')).toHaveText('41');
    await expect(workspace.locator('[data-party-seats="P2"]')).toHaveText('30');
    await expect(page.locator('[data-evaluation-field="seats"]')).toHaveText(
      '71',
    );
    await expect(
      workspace.locator('[data-party-baseline-change="P1"]'),
    ).toContainText('20');
    await page.locator('[data-action="export"]').click();
    const saved = JSON.parse(await lastBlobText(page)) as Json;
    expect((saved.parties as Json[]).map((party) => party.voteShare)).toEqual([
      fraction('2', '5'),
      fraction('3', '10'),
      fraction('3', '10'),
    ]);
    expect(JSON.stringify(saved)).not.toContain('party:P2');
    await workspace.locator('[data-action="reset-baseline"]').click();
    await expect(workspace.locator('[data-party-seats="P1"]')).toHaveText('20');
  });

  test('builds a linked basis on the first direct edit and group turnout can change a locked share', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, workspaceLinked());
    await showView(page, 'coalitions');
    const workspace = page.locator('[data-coalition-workspace]');
    await expect(workspace).toBeVisible({ timeout: 5000 });
    await workspace.locator('[data-party-share-input="P1"]').fill('60');
    await page.locator('[data-action="export"]').click();
    const first = JSON.parse(await lastBlobText(page)) as Json;
    expect((first.linkedModel as Json).state).toBe('current');
    expect((first.parties as Json[])[0]!.composition).toEqual({
      G1: fraction('7', '10'),
      G2: fraction('3', '10'),
    });
    await workspace.locator('[data-lock="party:P1"]').click();
    await workspace
      .locator('[data-workspace-group="G1"] [data-fraction="turnout"]')
      .fill('80');
    await expect(workspace.locator('[data-party-seats="P1"]')).toHaveText('64');
    await expect(workspace.locator('[data-party-seats="P2"]')).toHaveText('37');
    await page.locator('[data-action="export"]').click();
    const next = JSON.parse(await lastBlobText(page)) as Json;
    expect((next.parties as Json[])[0]!.voteShare).toEqual(
      fraction('111', '175'),
    );
    expect((next.groups as Json[])[0]!.turnout).toEqual(fraction('4', '5'));
  });

  test('scales overall turnout, refuses overflow and restores from zero without changing seats', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, workspaceLinked());
    await showView(page, 'coalitions');
    const workspace = page.locator('[data-coalition-workspace]');
    await expect(workspace).toBeVisible({ timeout: 5000 });
    const overall = workspace.locator('[data-overall-turnout-input]');
    await overall.fill('50');
    await expect(workspace.locator('[data-party-seats="P1"]')).toHaveText('51');
    await page.locator('[data-action="export"]').click();
    const scaled = JSON.parse(await lastBlobText(page)) as Json;
    expect((scaled.groups as Json[]).map((group) => group.turnout)).toEqual([
      fraction('1', '2'),
      fraction('1', '2'),
    ]);
    await overall.fill('0');
    await expect(page.locator('[data-result-state]')).toHaveAttribute(
      'data-result-state',
      'no-allocation',
    );
    await expect(
      workspace.locator('[data-party-seat-state="unavailable"]'),
    ).toHaveCount(2);
    await overall.fill('60');
    await expect(workspace.locator('[data-party-seats="P1"]')).toHaveText('51');
    await expect(workspace.locator('[data-party-seats="P2"]')).toHaveText('50');
    await workspace
      .locator('[data-workspace-group="G1"] [data-fraction="turnout"]')
      .fill('90');
    await overall.fill('90');
    await expect(
      workspace.locator('[data-overall-turnout-error]'),
    ).toBeVisible();
    await page.locator('[data-action="export"]').click();
    const refused = JSON.parse(await lastBlobText(page)) as Json;
    expect((refused.rules as Json).overallTurnout).toEqual(fraction('3', '4'));
    expect((refused.groups as Json[])[0]!.turnout).toEqual(fraction('9', '10'));
  });

  test('keeps ordinary party controls usable when demographic composition is unknown', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, workspaceLinked(false));
    await showView(page, 'coalitions');
    const workspace = page.locator('[data-coalition-workspace]');
    await expect(workspace).toBeVisible({ timeout: 5000 });
    const group = workspace.locator('[data-workspace-group="G1"]');
    await expect(
      group.locator('[data-linked-turnout="unknown-party-composition"]'),
    ).toBeVisible();
    await expect(group.locator('[data-fraction="turnout"]')).toBeDisabled();
    await workspace.locator('[data-party-share-input="P1"]').fill('40');
    await expect(workspace.locator('[data-party-seats="P1"]')).toHaveText('40');
    await expect(workspace.locator('[data-party-seats="P2"]')).toHaveText('61');
  });

  test('refuses locked and invalid edits without changing the last valid input', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, workspaceLinked());
    await showView(page, 'coalitions');
    const workspace = page.locator('[data-coalition-workspace]');
    await expect(workspace).toBeVisible({ timeout: 5000 });
    // M7-20: with only two parties the lock itself is refused with a hint.
    await workspace.locator('[data-lock="party:P2"]').click();
    await expect(workspace.locator('[data-lock-hint]').first()).toBeVisible();
    const field = workspace.locator('[data-party-share-input="P1"]');
    await field.fill('101');
    await expect(workspace.locator('[data-party-edit-error]')).toBeVisible();
    await expect(workspace.locator('[data-party-seats="P1"]')).toHaveText('51');
    await page.locator('[data-action="export"]').click();
    const unchanged = JSON.parse(await lastBlobText(page)) as Json;
    expect(unchanged.linkedModel ?? null).toBeNull();
    expect((unchanged.parties as Json[])[0]!.voteShare).toEqual(
      fraction('1', '2'),
    );
    await field.fill('-1');
    await expect(workspace.locator('[data-party-edit-error]')).toBeVisible();
    await expect(workspace.locator('[data-party-seats="P1"]')).toHaveText('51');
  });

  test('does not save rounded share or turnout values on focus and blur', async ({
    page,
  }) => {
    const first = editLinkedGroupTurnout(workspaceLinked(), 'G1', '80');
    if (!first.ok) throw new Error(`Unexpected refusal: ${first.reason}`);
    const scaled = editLinkedOverallTurnout(first.draft, '50');
    if (!scaled.ok) throw new Error(`Unexpected refusal: ${scaled.reason}`);
    await openApp(page, 'en');
    await loadScenario(page, scaled.draft);
    await showView(page, 'coalitions');
    const workspace = page.locator('[data-coalition-workspace]');
    await expect(workspace).toBeVisible({ timeout: 5000 });
    const share = workspace.locator('[data-party-share-input="P1"]');
    const turnout = workspace.locator(
      '[data-workspace-group="G1"] [data-fraction="turnout"]',
    );
    await share.focus();
    await share.blur();
    await turnout.focus();
    await turnout.blur();
    await page.locator('[data-action="export"]').click();
    const exported = JSON.parse(await lastBlobText(page)) as Json;
    expect((exported.parties as Json[])[0]!.voteShare).toEqual(
      fraction('19', '35'),
    );
    expect((exported.groups as Json[])[0]!.turnout).toEqual(fraction('4', '7'));
  });

  test('shows the 2022 comparison by verified identity and makes it reversible', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadPresetFixture(page, 'historical2022');
    const confirm = page.locator('[data-action="preset-confirm"]');
    if (await confirm.isVisible()) await confirm.click();
    await showView(page, 'coalitions');
    const workspace = page.locator('[data-coalition-workspace]');
    await expect(workspace).toBeVisible({ timeout: 5000 });
    const likud = workspace.locator('[data-party-control="likud"]');
    await expect(likud).toHaveAttribute('data-historical-match', 'automatic');
    await expect(
      likud.locator('[data-party-historical-change="likud"]'),
    ).toContainText('0');
    await workspace.locator('[data-workspace-history] > summary').click();
    const historical = workspace.locator(
      '[data-historical-current-row="likud"]',
    );
    await historical.locator('[data-action="historical-unmatch"]').click();
    await expect(likud).toHaveAttribute('data-historical-match', 'unmatched');
    await historical
      .locator('[data-action="historical-restore-match"]')
      .click();
    await expect(likud).toHaveAttribute('data-historical-match', 'automatic');
  });

  test('keeps old group-mode semantics and exposes group turnout without national party inputs', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, section8Input());
    await showView(page, 'coalitions');
    const workspace = page.locator('[data-coalition-workspace]');
    await expect(workspace).toBeVisible({ timeout: 5000 });
    await expect(workspace).toHaveAttribute('data-workspace-mode', 'groups');
    await expect(workspace.locator('[data-workspace-legacy]')).toBeVisible();
    await expect(workspace.locator('[data-party-share-input]')).toHaveCount(0);
    await workspace
      .locator('[data-workspace-group="G3"] [data-fraction="turnout"]')
      .fill('37');
    await expect(workspace.locator('[data-party-seats="P1"]')).toHaveText('50');
    await expect(workspace.locator('[data-party-seats="P2"]')).toHaveText('56');
    await expect(workspace.locator('[data-party-seats="P3"]')).toHaveText('7');
    await expect(workspace.locator('[data-party-seats="P4"]')).toHaveText('7');
    await page.locator('[data-action="export"]').click();
    const exported = JSON.parse(await lastBlobText(page)) as Json;
    expect(exported.inputMode).toBe('groups');
    const groups = exported.groups as Json[];
    expect(groups[2]!.turnout).toBe('0.37');
    expect(groups[2]!.votingMode).toBe('restricted');
    expect(groups[2]!.allowedPartyIds).toEqual(['P3']);
    expect((exported.coalitionRules as Json).incompatiblePartyPairs).toEqual([
      ['P1', 'P2'],
    ]);
  });

  test('preserves the historical reference and baseline when a draft becomes invalid', async ({
    page,
  }) => {
    await openApp(page, 'en');
    await loadScenario(page, workspaceParties());
    await showView(page, 'coalitions');
    const workspace = page.locator('[data-coalition-workspace]');
    await expect(workspace).toBeVisible({ timeout: 5000 });
    await workspace.locator('[data-workspace-compare] summary').click();
    await workspace.locator('[data-action="save-baseline"]').click();
    await workspace.locator('[data-workspace-history] > summary').click();
    await expect(
      workspace.locator('[data-historical-reference]'),
    ).toBeVisible();
    await showView(page, 'inputs');
    await openEditorPage(page, 'scenario');
    await page.locator('[data-rule="threshold"]').fill('invalid');
    await expect(page.locator('[data-result-state]')).toHaveAttribute(
      'data-result-state',
      'invalid',
    );
    await showView(page, 'coalitions');
    await workspace.locator('[data-workspace-history] > summary').click();
    await expect(
      workspace.locator('[data-historical-field="eligible"]'),
    ).toContainText('6,788,804');
    await expect(
      workspace.locator('[data-historical-current-unavailable]'),
    ).toBeVisible();
    await workspace.locator('[data-workspace-compare] > summary').click();
    await workspace.locator('[data-action="reset-baseline"]').click();
    await expect(page.locator('[data-result-state]')).toHaveAttribute(
      'data-result-state',
      'ready',
    );
    await expect(workspace.locator('[data-party-seats="P1"]')).toHaveText('20');
  });

  test('keeps controls before results on phones and physically left in RTL on desktop', async ({
    page,
  }, testInfo) => {
    await openApp(page, 'he');
    await loadScenario(page, workspaceLinked());
    await showView(page, 'coalitions');
    const workspace = page.locator('[data-coalition-workspace]');
    await expect(workspace).toBeVisible({ timeout: 5000 });
    const controls = await workspace
      .locator('[data-panel-box="votes"]')
      .boundingBox();
    const results = await workspace
      .locator('[data-panel-box="population"]')
      .boundingBox();
    if (controls === null || results === null) {
      throw new Error('Workspace regions must have visible bounds');
    }
    if (testInfo.project.name === 'phone') {
      expect(controls.y).toBeLessThan(results.y);
    } else {
      expect(controls.x).toBeLessThan(results.x);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    const axe = await new AxeBuilder({ page })
      .include('[data-coalition-workspace]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(
      axe.violations.filter(
        (item) => item.impact === 'serious' || item.impact === 'critical',
      ),
    ).toEqual([]);
  });

  test('updates party seats within 200 ms at the supported 30-party size', async ({
    page,
  }) => {
    const input = partyModeInput(
      Array.from({ length: 30 }, () => ['1', '30'] as const),
      { threshold: '0', seatCount: 101 },
    );
    input.name = 'Workspace performance';
    await openApp(page, 'en');
    await loadScenario(page, input);
    await showView(page, 'coalitions');
    const workspace = page.locator('[data-coalition-workspace]');
    await expect(workspace).toBeVisible({ timeout: 5000 });
    const elapsed = await page.evaluate(async () => {
      const field = document.querySelector<HTMLInputElement>(
        '[data-party-share-input="P1"]',
      );
      const seats = document.querySelector<HTMLElement>(
        '[data-party-seats="P1"]',
      );
      if (field === null || seats === null) {
        throw new Error('Missing party controls');
      }
      const measures: number[] = [];
      for (const value of ['20', '21', '22', '23', '24']) {
        const duration = await new Promise<number>((resolve, reject) => {
          const started = performance.now();
          const timeout = window.setTimeout(() => {
            observer.disconnect();
            reject(new Error(`Seat did not update for ${value}`));
          }, 1000);
          const observer = new MutationObserver(() => {
            if (seats.textContent?.trim() === value) {
              window.clearTimeout(timeout);
              observer.disconnect();
              resolve(performance.now() - started);
            }
          });
          observer.observe(seats, {
            childList: true,
            characterData: true,
            subtree: true,
          });
          field.value = value;
          field.dispatchEvent(new Event('input', { bubbles: true }));
        });
        measures.push(duration);
      }
      return measures;
    });
    const median = [...elapsed].sort((a, b) => a - b)[2];
    expect(median).toBeDefined();
    expect(median!).toBeLessThan(200);
  });
});
