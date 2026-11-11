import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';
import { translator } from '../../src/i18n';
import {
  expect,
  isPhone,
  openApp,
  openEditorPage,
  showView,
  test,
} from './helpers';

const ru = translator('ru');

function ruleHint(page: Page) {
  return page.locator(
    '[data-editor="rules"] button.hint[data-hint="population"]',
  );
}

/** The text a hint opens, found through its aria-controls. */
async function textOf(page: Page, hint: ReturnType<typeof ruleHint>) {
  const id = await hint.getAttribute('aria-controls');
  expect(id).toBeTruthy();
  return page.locator(`[id="${id ?? ''}"]`);
}

async function seriousFindings(page: Page): Promise<string[]> {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  return result.violations
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
}

test.describe('eligible-voter hint', () => {
  test('hover shows the explanation as the tooltip', async ({
    page,
  }, testInfo) => {
    test.skip(isPhone(testInfo.project.name), 'hover on desktop');
    await openApp(page, 'ru');
    const hint = ruleHint(page);
    await expect(hint).toBeVisible();
    await hint.hover();
    await expect(hint).toHaveAttribute('title', ru('hint.population'));
    await expect(hint).toHaveAttribute('aria-expanded', 'false');
  });

  test('a click opens the text and a second click closes it', async ({
    page,
  }, testInfo) => {
    test.skip(isPhone(testInfo.project.name), 'mouse on desktop');
    await openApp(page, 'ru');
    const hint = ruleHint(page);
    const text = await textOf(page, hint);
    await expect(text).toBeHidden();
    await hint.click();
    await expect(hint).toHaveAttribute('aria-expanded', 'true');
    await expect(text).toBeVisible();
    await expect(text).toHaveText(ru('hint.population'));
    await hint.click();
    await expect(hint).toHaveAttribute('aria-expanded', 'false');
    await expect(text).toBeHidden();
  });

  test('Enter and Space toggle it and Escape closes it', async ({
    page,
  }, testInfo) => {
    test.skip(isPhone(testInfo.project.name), 'keyboard on desktop');
    await openApp(page, 'ru');
    const hint = ruleHint(page);
    const text = await textOf(page, hint);
    await hint.focus();
    await page.keyboard.press('Enter');
    await expect(hint).toHaveAttribute('aria-expanded', 'true');
    await expect(text).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(hint).toHaveAttribute('aria-expanded', 'false');
    await expect(text).toBeHidden();
    await expect(hint).toBeFocused();
    await page.keyboard.press('Space');
    await expect(hint).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Space');
    await expect(hint).toHaveAttribute('aria-expanded', 'false');
  });

  test('phone: a tap opens the text', async ({ page }, testInfo) => {
    test.skip(!isPhone(testInfo.project.name), 'touch on phone');
    await openApp(page, 'ru');
    const hint = ruleHint(page);
    const text = await textOf(page, hint);
    await hint.tap();
    await expect(hint).toHaveAttribute('aria-expanded', 'true');
    await expect(text).toBeVisible();
    await expect(text).toHaveText(ru('hint.population'));
    await hint.tap();
    await expect(text).toBeHidden();
  });

  test('the label text does not toggle the hint and the field keeps its name', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    const hint = ruleHint(page);
    await page
      .locator('[data-editor="rules"] .field__label', {
        hasText: ru('rules.populationTotal'),
      })
      .click({ position: { x: 2, y: 2 } });
    await expect(hint).toHaveAttribute('aria-expanded', 'false');
    await expect(
      page.getByRole('textbox', {
        name: ru('rules.populationTotal'),
        exact: true,
      }),
    ).toHaveAttribute('data-rule', 'populationTotal');
    await expect(
      page.getByRole('button', {
        name: ru('hint.open', { label: ru('rules.populationTotal') }),
        exact: true,
      }),
    ).toHaveCount(1);
  });

  test('a group page explains the population share', async ({ page }) => {
    await openApp(page, 'ru');
    await openEditorPage(page, 'group:G1');
    const hint = page.locator(
      '[data-entity="group"][data-id="G1"] button.hint[data-hint="populationShare"]',
    );
    await expect(hint).toBeVisible();
    await expect(hint).toHaveAttribute('title', ru('hint.populationShare'));
    await hint.click();
    const text = await textOf(page, hint);
    await expect(text).toHaveText(ru('hint.populationShare'));
  });

  test('the results, comparison and future totals carry the hint', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    await showView(page, 'seats');
    const summary = page.locator(
      '.summary button.hint[data-hint="population"]',
    );
    await expect(summary).toBeVisible();
    await summary.click();
    await expect(await textOf(page, summary)).toHaveText(ru('hint.population'));

    await showView(page, 'compare');
    await page.locator('[data-action="save-baseline"]').click();
    const compare = page.locator(
      '[data-table="compare-totals"] tr[data-total="population"] button.hint',
    );
    await expect(compare).toBeVisible();
    await expect(compare).toHaveAttribute('title', ru('hint.population'));

    await showView(page, 'future');
    const future = page.locator(
      '[data-table="future-totals"] tr[data-total="population"] button.hint',
    );
    await expect(future).toBeVisible();
    await expect(future).toHaveAttribute('title', ru('hint.population'));
  });

  for (const locale of ['ru', 'he'] as const) {
    test(`an opened hint has no serious axe findings in ${locale}`, async ({
      page,
    }) => {
      await openApp(page, locale);
      const hint = ruleHint(page);
      await hint.click();
      await expect(hint).toHaveAttribute('aria-expanded', 'true');
      await showView(page, 'seats');
      const summary = page.locator(
        '.summary button.hint[data-hint="population"]',
      );
      await summary.click();
      await expect(summary).toHaveAttribute('aria-expanded', 'true');
      expect(await seriousFindings(page)).toEqual([]);
    });
  }
});
