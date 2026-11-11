import {
  expect,
  loadPresetFixture,
  isPhone,
  openApp,
  openEditorPage,
  seatsOf,
  setLocale,
  showView,
  test,
} from './helpers';

const SEATS = {
  likud: '31',
  'yesh-atid': '30',
  avoda: '11',
  'religious-zionism': '14',
  shas: '18',
  raam: '16',
};

test.describe('Israeli educational example', () => {
  test('loads on request and shows the 2022 lists with the note', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    await expect(page.locator('[data-example-note]')).toHaveCount(0);
    await loadPresetFixture(page, 'israelExample');
    await expect(page.locator('.toolbar__name')).toHaveText(
      'Израильский учебный пример (2022)',
    );
    await showView(page, 'seats');
    expect(await seatsOf(page)).toEqual(SEATS);
    const note = page.locator('[data-example-note]');
    await expect(note).toBeVisible();
    await expect(note).toContainText('Учебный пример');
    await expect(
      page.locator('[data-table="parties"] tr[data-party="likud"]'),
    ).toContainText('Ликуд');
  });

  test('switches the catalog names with the language', async ({ page }) => {
    await openApp(page, 'ru');
    await loadPresetFixture(page, 'israelExample');
    await showView(page, 'seats');
    const likud = page.locator('[data-table="parties"] tr[data-party="likud"]');
    await expect(likud).toContainText('Ликуд');
    await setLocale(page, 'en');
    await expect(likud).toContainText('Likud');
    await setLocale(page, 'he');
    await expect(likud).toContainText('הליכוד');
    expect(await seatsOf(page)).toEqual(SEATS);
  });

  test('describes a catalog list in the editor until it is renamed', async ({
    page,
  }, testInfo) => {
    await openApp(page, 'ru');
    await loadPresetFixture(page, 'israelExample');
    await showView(page, 'inputs');
    await openEditorPage(page, 'parties');
    const row = page.locator('[data-entity="party"][data-id="shas"]');
    const about = row.locator('[data-catalog-about]');
    await expect(about).toContainText('2022');
    const name = row.locator('[data-field="name"]');
    await expect(name).toHaveAttribute('placeholder', 'ШАС');
    await name.fill('Моя партия');
    await expect(about).toHaveCount(0);
    if (!isPhone(testInfo.project.name)) {
      await expect(page.locator('[data-example-note]')).toBeVisible();
    }
  });
});
