import AxeBuilder from '@axe-core/playwright';
import {
  LOCALES,
  VIEWS,
  expect,
  isPhone,
  openApp,
  showView,
  test,
} from './helpers';

const TOUCH = 44;

test.describe('accessibility', () => {
  for (const locale of LOCALES) {
    for (const view of VIEWS) {
      test(`${view} in ${locale} has no serious axe findings`, async ({
        page,
      }) => {
        await openApp(page, locale);
        await showView(page, view);
        if (view === 'coalitions') {
          await expect(
            page.locator('[data-coalition-summary="search"]'),
          ).toBeVisible();
        }
        const result = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        const serious = result.violations
          .filter(
            (violation) =>
              violation.impact === 'serious' || violation.impact === 'critical',
          )
          .map(
            (violation) =>
              `${violation.id}: ${violation.nodes
                .slice(0, 3)
                .map((node) => node.target.join(' '))
                .join(' | ')}`,
          );
        expect(serious).toEqual([]);
      });
    }
  }

  for (const view of VIEWS) {
    test(`phone: every control in ${view} is at least 44 x 44`, async ({
      page,
    }, testInfo) => {
      test.skip(!isPhone(testInfo.project.name), 'touch targets on phone');
      await openApp(page);
      await showView(page, view);
      if (view === 'coalitions') {
        await expect(
          page.locator('[data-coalition-summary="search"]'),
        ).toBeVisible();
      }
      const small = await page.evaluate((touch) => {
        const selector = [
          'button',
          'select',
          'textarea',
          'input:not([type="checkbox"]):not([type="radio"]):not([type="file"])',
          'label:has(> input[type="checkbox"])',
          'label:has(> input[type="radio"])',
          'label:has(> input[type="file"])',
        ].join(',');
        return [...document.querySelectorAll<HTMLElement>(selector)]
          .filter((element) => element.getClientRects().length > 0)
          .map((element) => ({
            element,
            box: element.getBoundingClientRect(),
          }))
          .filter(
            ({ box }) =>
              box.width > 0 &&
              (box.width < touch - 0.5 || box.height < touch - 0.5),
          )
          .map(
            ({ element, box }) =>
              `${element.tagName.toLowerCase()}.${element.className} ${Math.round(box.width)}x${Math.round(box.height)}`,
          )
          .slice(0, 12);
      }, TOUCH);
      expect(small).toEqual([]);
    });
  }

  test('keyboard: Tab reaches every area with a visible focus indicator', async ({
    page,
  }, testInfo) => {
    test.skip(isPhone(testInfo.project.name), 'keyboard on desktop');
    await openApp(page);
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    const reached = new Set<string>();
    const invisible: string[] = [];
    for (let step = 0; step < 80; step += 1) {
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const element = document.activeElement;
        if (!(element instanceof HTMLElement) || element === document.body) {
          return null;
        }
        const style = getComputedStyle(element);
        const ring =
          (style.outlineStyle !== 'none' && style.outlineWidth !== '0px') ||
          style.boxShadow !== 'none';
        const parentRing = element.closest('label');
        const parentStyle =
          parentRing === null ? null : getComputedStyle(parentRing);
        return {
          area: element.closest('[data-locale]')
            ? 'language'
            : element.closest('[data-view]')
              ? 'views'
              : element.closest('[data-region="editor"]')
                ? 'editor'
                : element.closest('[data-region="toolbar"]')
                  ? 'toolbar'
                  : 'other',
          visible:
            ring ||
            (parentStyle !== null &&
              parentStyle.outlineStyle !== 'none' &&
              parentStyle.outlineWidth !== '0px'),
          name: `${element.tagName.toLowerCase()}.${element.className}[${element.getAttribute('data-field') ?? element.getAttribute('data-action') ?? ''}]`,
        };
      });
      if (focus === null) {
        continue;
      }
      reached.add(focus.area);
      if (!focus.visible) {
        invisible.push(focus.name);
      }
    }
    expect([...reached].sort()).toEqual(
      expect.arrayContaining(['editor', 'language', 'toolbar', 'views']),
    );
    expect([...new Set(invisible)]).toEqual([]);
  });

  test('keyboard: Enter and Space switch views', async ({ page }, testInfo) => {
    test.skip(isPhone(testInfo.project.name), 'keyboard on desktop');
    await openApp(page);
    await page.locator('[data-view="future"]').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.app')).toHaveAttribute(
      'data-active-view',
      'future',
    );
    await page.locator('[data-view="coalitions"]').focus();
    await page.keyboard.press('Space');
    await expect(page.locator('.app')).toHaveAttribute(
      'data-active-view',
      'coalitions',
    );
  });
});
