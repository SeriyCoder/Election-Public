import { translator } from '../../src/i18n';
import { partyModeBudgetExpansionInput } from '../engine/helpers/scenarios';
import {
  APP_URL,
  BASELINE_SEATS,
  expect,
  loadPresetFixture,
  groupField,
  instrument,
  isPhone,
  lastBlobText,
  loadScenario,
  openApp,
  openEditorPage,
  seatsOf,
  setLocale,
  showView,
  test,
  watchPage,
} from './helpers';
import {
  HOSTILE_NAME,
  HOSTILE_NOTES,
  hostileInput,
  tieInput,
} from './scenarios';

test.describe('interaction', () => {
  test('typing a percent keeps the typed text and updates seats', async ({
    page,
  }) => {
    await openApp(page);
    await showView(page, 'inputs');
    await openEditorPage(page, 'group:G3');
    const field = groupField(page, 'G3', 'turnout');
    await field.fill('');
    await field.pressSequentially('50.');
    await expect(field).toHaveValue('50.');
    await field.pressSequentially('0');
    await expect(field).toHaveValue('50.0');
    await showView(page, 'seats');
    const seats = await seatsOf(page);
    expect(seats.P3).not.toBe(BASELINE_SEATS.P3);
  });

  test('dragging a slider changes the field and the seats', async ({
    page,
  }) => {
    await openApp(page);
    await showView(page, 'inputs');
    await openEditorPage(page, 'group:G3');
    const slider = page.locator(
      '[data-entity="group"][data-id="G3"] [data-slider="turnout"]',
    );
    await slider.scrollIntoViewIfNeeded();
    const box = await slider.boundingBox();
    expect(box).not.toBeNull();
    const y = (box?.y ?? 0) + (box?.height ?? 0) / 2;
    await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) - 2, y);
    await page.mouse.down();
    await page.mouse.move((box?.x ?? 0) + (box?.width ?? 0) * 0.25, y, {
      steps: 8,
    });
    await page.mouse.up();
    const typed = Number(await groupField(page, 'G3', 'turnout').inputValue());
    expect(typed).toBeGreaterThan(10);
    expect(typed).toBeLessThan(40);
    await showView(page, 'seats');
    expect((await seatsOf(page)).P3).not.toBe(BASELINE_SEATS.P3);
  });

  test('keeps restricted voting intact without exposing its old selector', async ({
    page,
  }) => {
    await openApp(page);
    await showView(page, 'inputs');
    await openEditorPage(page, 'group:G3');
    const group = page.locator('[data-entity="group"][data-id="G3"]');
    await expect(group.locator('[data-mode]')).toHaveCount(0);
    await expect(group.locator('[data-allowed="P3"]')).toBeChecked();
    await expect(group.locator('[data-allowed="P3"]')).toBeDisabled();
    await expect(group.locator('[data-allowed="P1"]')).toBeDisabled();
    await page.locator('[data-action="export"]').click();
    const original = JSON.parse(await lastBlobText(page)) as {
      groups: { id: string; votingMode: string }[];
    };
    expect(original.groups.find((entry) => entry.id === 'G3')?.votingMode).toBe(
      'restricted',
    );
  });

  test('the threshold slider follows the keyboard', async ({ page }) => {
    await openApp(page);
    await showView(page, 'inputs');
    const slider = page.locator('[data-rule-slider="threshold"]');
    await slider.scrollIntoViewIfNeeded();
    await slider.focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('[data-rule="threshold"]')).toHaveValue('0.1');
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual(BASELINE_SEATS);
  });

  test('a chart segment or seat shows exact details; Escape and an outside click close them', async ({
    page,
  }) => {
    await openApp(page);
    await showView(page, 'seats');
    const panel = page.locator('[data-details]');
    await expect(panel).toHaveCount(0);

    await page.locator('[data-bar="votes"] [data-segment="P2"]').click();
    await expect(panel).toHaveAttribute('data-details', 'P2');
    await expect(panel.locator('[data-detail="seats"]')).toHaveText(
      BASELINE_SEATS.P2,
    );
    await expect(panel.locator('[data-detail="voteShare"]')).toHaveText(
      await page
        .locator(
          '[data-table="parties"] tr[data-party="P2"] [data-cell="voteShare"]',
        )
        .innerText(),
    );
    await expect(page.locator('[data-select-party="P2"]')).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    await expect(
      page.locator('[data-bar="seats"] [data-segment="P2"]'),
    ).toHaveAttribute('data-selected', 'true');

    await page
      .locator('[data-diagram="seats"] [data-seat="P4"]')
      .first()
      .click();
    await expect(panel).toHaveAttribute('data-details', 'P4');
    await expect(page.locator('[data-select-party="P2"]')).toHaveAttribute(
      'aria-expanded',
      'false',
    );

    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);

    await page.locator('[data-bar="seats"] [data-segment="P1"]').click();
    await expect(panel).toHaveAttribute('data-details', 'P1');
    await panel.locator('[data-detail="votes"]').click();
    await expect(panel).toHaveAttribute('data-details', 'P1');
    await page.locator('[data-table="parties"] caption').click();
    await expect(panel).toHaveCount(0);
  });

  test('the legend opens details from the keyboard and returns focus on close', async ({
    page,
  }) => {
    await openApp(page);
    await showView(page, 'seats');
    const legend = page.locator('[data-select-party="P3"]');
    const panel = page.locator('[data-details]');
    await legend.focus();
    await page.keyboard.press('Enter');
    await expect(panel).toHaveAttribute('data-details', 'P3');
    await expect(legend).toBeFocused();
    await expect(legend).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Space');
    await expect(panel).toHaveCount(0);

    await page.keyboard.press('Space');
    await expect(panel).toHaveAttribute('data-details', 'P3');
    await panel.locator('[data-action="close-details"]').focus();
    await page.keyboard.press('Escape');
    await expect(panel).toHaveCount(0);
    await expect(legend).toBeFocused();

    await page.keyboard.press('Enter');
    await panel.locator('[data-action="close-details"]').click();
    await expect(panel).toHaveCount(0);
    await expect(legend).toBeFocused();
  });

  test('deleting a party asks for a repair and manages focus', async ({
    page,
  }) => {
    await openApp(page);
    await showView(page, 'inputs');
    await openEditorPage(page, 'parties');
    const remove = page.locator(
      '[data-entity="party"][data-id="P1"] [data-action="delete"]',
    );
    await remove.click();
    const dialog = page.locator('[data-confirm="party"]');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(':focus')).toHaveCount(1);
    await dialog.locator('[data-action="cancel"]').click();
    await expect(dialog).toHaveCount(0);
    await expect(remove).toBeFocused();

    await remove.click();
    await dialog.locator('[data-repair="reassign"]').check();
    await dialog.locator('[data-field="target"]').selectOption('P2');
    await dialog.locator('[data-action="confirm"]').click();
    await expect(
      page.locator('[data-entity="party"][data-id="P1"]'),
    ).toHaveCount(0);
    const focused = await page.evaluate(
      () =>
        document.activeElement !== document.body &&
        document.activeElement?.closest('[data-region="editor"]') !== null,
    );
    expect(focused).toBe(true);
    await showView(page, 'seats');
    expect((await seatsOf(page)).P2).toBe('96');
  });

  test('added and duplicated parties keep names out of the scenario', async ({
    page,
  }, testInfo) => {
    const he = translator('he');
    const ru = translator('ru');
    const party = (id: string) =>
      page.locator(`[data-entity="party"][data-id="${id}"]`);
    const name = (id: string) => party(id).locator('[data-field="name"]');
    await openApp(page, 'he');
    await showView(page, 'inputs');
    await openEditorPage(page, 'parties');

    await page.locator('[data-action="add"][data-kind="party"]').click();
    await expect(name('P5')).toHaveValue('');
    await expect(name('P5')).toHaveAttribute(
      'placeholder',
      he('entity.party', { n: '5' }),
    );
    await setLocale(page, 'ru');
    await expect(name('P5')).toHaveAttribute(
      'placeholder',
      ru('entity.party', { n: '5' }),
    );
    await setLocale(page, 'he');

    await name('P1').fill('Likud');
    await party('P1').locator('[data-action="duplicate"]').click();
    await expect(name('P6')).toHaveValue('Likud (2)');
    await party('P1').locator('[data-action="duplicate"]').click();
    await expect(name('P7')).toHaveValue('Likud (3)');
    await party('P2').locator('[data-action="duplicate"]').click();
    await expect(name('P8')).toHaveValue('');
    await expect(name('P8')).toHaveAttribute(
      'placeholder',
      he('entity.party', { n: '8' }),
    );

    if (isPhone(testInfo.project.name)) {
      return;
    }
    const download = page.waitForEvent('download');
    await page.locator('[data-action="export"]').click();
    await download;
    const text = await lastBlobText(page);
    expect(text).not.toMatch(/[\u0400-\u04ff\u0590-\u05ff]/);
    const exported = JSON.parse(text) as {
      name: string;
      parties: { id: string; name: string }[];
    };
    expect(exported.name).toBe('');
    expect(
      Object.fromEntries(exported.parties.map((item) => [item.id, item.name])),
    ).toEqual({
      P1: 'Likud',
      P7: 'Likud (3)',
      P6: 'Likud (2)',
      P2: '',
      P8: '',
      P3: '',
      P4: '',
      P5: '',
    });
  });

  test('baseline save, reset and clear with both searches running', async ({
    page,
  }) => {
    const workers: string[] = [];
    page.on('worker', (worker) => workers.push(worker.url()));
    await openApp(page);
    await showView(page, 'compare');
    await page.locator('[data-action="save-baseline"]').click();
    await expect(page.locator('[data-compare="ready"]')).toBeVisible();

    await showView(page, 'inputs');
    await openEditorPage(page, 'group:G3');
    await groupField(page, 'G3', 'turnout').fill('50');
    await showView(page, 'compare');
    const p3 = page.locator('[data-compare="ready"] tr[data-party="P3"]');
    await expect(p3.locator('[data-cell="seats-baseline"]')).toHaveText('18');
    await expect(p3.locator('[data-cell="seats-current"]')).not.toHaveText(
      '18',
    );
    const runs = page.locator('[data-coalition-side]');
    await expect(runs).toHaveCount(2);
    await expect(runs.nth(0)).toHaveAttribute('data-run', 'done');
    await expect(runs.nth(1)).toHaveAttribute('data-run', 'done');
    expect(workers.length).toBeGreaterThanOrEqual(2);

    await page.locator('[data-action="reset-baseline"]').click();
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual(BASELINE_SEATS);
    await showView(page, 'compare');
    await page.locator('[data-action="clear-baseline"]').click();
    await expect(page.locator('[data-compare="empty"]')).toBeVisible();
  });

  test('export and import reproduce the results in a second session', async ({
    page,
    browser,
  }, testInfo) => {
    test.skip(isPhone(testInfo.project.name), 'one round trip is enough');
    await openApp(page);
    await loadScenario(page, tieInput());
    await showView(page, 'seats');
    const before = await seatsOf(page);
    expect(before).toEqual({ P1: '5', P2: '6' });
    const hamilton = await page.locator('[data-table="hamilton"]').innerText();

    const download = page.waitForEvent('download');
    await page.locator('[data-action="export"]').click();
    expect((await download).suggestedFilename()).toBe('tie.json');
    const exported = JSON.parse(await lastBlobText(page)) as Record<
      string,
      unknown
    >;

    const second = await browser.newContext({ offline: true });
    try {
      const other = await second.newPage();
      const problems = watchPage(other);
      await instrument(other);
      await other.goto(APP_URL);
      await other.locator('[data-action="book-skip"]').click();
      await other.locator('[data-locale="en"]').click();
      await loadScenario(other, exported);
      await showView(other, 'seats');
      expect(await seatsOf(other)).toEqual(before);
      expect(await other.locator('[data-table="hamilton"]').innerText()).toBe(
        hamilton,
      );
      expect(problems).toEqual([]);
    } finally {
      await second.close();
    }
  });

  test('M7-01 rejects canonical denominator overflow without replacing the scenario', async ({
    page,
  }) => {
    await openApp(page);
    await showView(page, 'seats');
    const beforeName = await page.locator('.toolbar__name').textContent();
    const beforeSeats = await seatsOf(page);
    const input = partyModeBudgetExpansionInput(100);
    await page.evaluate((text) => {
      const field =
        document.querySelector<HTMLInputElement>('input[type="file"]');
      if (field === null) {
        throw new Error('no file input');
      }
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([text], 'budget.json', { type: 'application/json' }),
      );
      field.files = transfer.files;
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }, JSON.stringify(input));

    await expect(
      page.locator('[data-import-issues] [data-code="too-long"]').first(),
    ).toBeVisible();
    await expect(page.locator('.toolbar__name')).toHaveText(beforeName ?? '');
    await expect(page.locator('[data-action="export"]')).toBeEnabled();
    expect(await seatsOf(page)).toEqual(beforeSeats);
  });

  test('a party note typed in the editor is exported with the scenario', async ({
    page,
  }, testInfo) => {
    test.skip(isPhone(testInfo.project.name), 'one export is enough');
    await openApp(page);
    await openEditorPage(page, 'parties');
    const party2 = page.locator('[data-entity="party"][data-id="P2"]');
    const summary = party2.locator('[data-notes] > summary');
    await summary.scrollIntoViewIfNeeded();
    await summary.click();
    await party2.locator('[data-field="notes"]').fill('Line 1\nСтрока 2');
    await expect(summary).toHaveText('Notes (written)');
    const download = page.waitForEvent('download');
    await page.locator('[data-action="export"]').click();
    await download;
    const exported = JSON.parse(await lastBlobText(page)) as {
      parties: { id: string; notes: string }[];
    };
    expect(exported.parties.map((party) => party.notes)).toEqual([
      '',
      'Line 1\nСтрока 2',
      '',
      '',
    ]);
  });

  test('hostile names and notes stay inert text', async ({ page }) => {
    await openApp(page);
    await loadScenario(page, hostileInput());
    await showView(page, 'inputs');
    await expect(
      page.locator('[data-editor="scenario"] [data-field="notes"]'),
    ).toHaveValue(HOSTILE_NOTES);
    await openEditorPage(page, 'parties');
    const party1 = page.locator('[data-entity="party"][data-id="P1"]');
    await party1.locator('[data-notes] > summary').click();
    await expect(party1.locator('[data-field="notes"]')).toHaveValue(
      HOSTILE_NOTES,
    );
    await showView(page, 'seats');
    await expect(
      page.locator('[data-table="parties"] tr[data-party="P1"]'),
    ).toContainText(HOSTILE_NAME);
    const injected = await page.evaluate(() => ({
      flag: (window as unknown as { __pwned?: number }).__pwned ?? null,
      images: document.querySelectorAll('.app img').length,
      scripts: document.querySelectorAll('.app script').length,
    }));
    expect(injected).toEqual({ flag: null, images: 0, scripts: 0 });
  });

  test('the party turnout shortcut changes its group and the seats', async ({
    page,
  }) => {
    await openApp(page);
    await showView(page, 'inputs');
    await openEditorPage(page, 'parties');
    const party3 = page.locator('[data-entity="party"][data-id="P3"]');
    const summary = party3.locator('[data-turnout] > summary');
    await summary.scrollIntoViewIfNeeded();
    await summary.click();
    const field = party3.locator('[data-turnout-field="G3"]');
    await expect(field).toHaveValue('100');
    await field.fill('0');
    await expect(groupField(page, 'G3', 'turnout')).toHaveValue('0');
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual({
      P1: '54',
      P2: '59',
      P3: '0',
      P4: '7',
    });
  });

  test('a party bulk edit sets its dedicated groups and preserves hidden block data', async ({
    page,
  }) => {
    await openApp(page);
    await loadPresetFixture(page, 'split');
    await showView(page, 'seats');
    const before = await seatsOf(page);
    await showView(page, 'inputs');
    await openEditorPage(page, 'parties');
    await expect(page.locator('[data-editor="blocks"]')).toHaveCount(0);
    const party1 = page.locator('[data-entity="party"][data-id="P1"]');
    const summary = party1.locator('[data-turnout] > summary');
    await summary.scrollIntoViewIfNeeded();
    await summary.click();
    await expect(party1.locator('[data-cohort="G1"]')).toBeVisible();
    await expect(party1.locator('[data-cohort="G3"]')).toBeVisible();
    const apply = party1.locator('[data-action="set-cohort-turnout"]');
    await expect(apply).toBeDisabled();
    await party1.locator('[data-turnout-bulk]').fill('50');
    await expect(apply).toBeEnabled();
    await apply.click();
    await expect(groupField(page, 'G1', 'turnout')).toHaveValue('50');
    await expect(groupField(page, 'G3', 'turnout')).toHaveValue('100');
    await page.locator('[data-action="export"]').click();
    const original = JSON.parse(await lastBlobText(page)) as {
      blocks: { id: string }[];
      parties: { id: string; blockId: string | null }[];
    };
    expect(original.blocks.map((block) => block.id)).toEqual([
      'B1',
      'B2',
      'B3',
      'B4',
    ]);
    expect(original.parties.find((party) => party.id === 'P1')?.blockId).toBe(
      'B1',
    );
    await showView(page, 'seats');
    const once = await seatsOf(page);
    expect(Number(once.P1)).toBeLessThan(Number(before.P1));
    await showView(page, 'inputs');
    await apply.click();
    await expect(groupField(page, 'G1', 'turnout')).toHaveValue('50');
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual(once);
  });
});
