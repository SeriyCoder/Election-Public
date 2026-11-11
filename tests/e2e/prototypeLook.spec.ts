import type { Page } from '@playwright/test';
import { workspaceLinked, workspaceParties } from '../engine/helpers/workspace';
import {
  expect,
  isPhone,
  loadScenario,
  openApp,
  showView,
  test,
} from './helpers';

const SIZES = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
  { width: 1024, height: 576 },
  { width: 1092, height: 614 },
  { width: 1152, height: 720 },
];

async function noSideOverflow(page: Page) {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const found: string[] = [];
    if (document.documentElement.scrollWidth > width + 1) {
      found.push(`page ${document.documentElement.scrollWidth} > ${width}`);
    }
    for (const element of document.querySelectorAll<HTMLElement>('.ws *')) {
      if (element.closest('.table-scroll, dialog') !== null) continue;
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) continue;
      if (box.left < -1 || box.right > width + 1) {
        found.push(`${element.tagName}.${element.className}`);
      }
    }
    return found.slice(0, 8);
  });
}

test.describe('M7-14 prototype look', () => {
  test('ships one decoded stylesheet that styles the coalition cards before first paint', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    const styles = await page.evaluate(() =>
      [...document.querySelectorAll('style')].map(
        (element) => element.textContent?.length ?? 0,
      ),
    );
    expect(styles).toHaveLength(1);
    expect(styles[0]).toBeGreaterThan(20_000);
    await loadScenario(page, workspaceLinked());
    await showView(page, 'coalitions');
    const card = page.locator('.ws-card').first();
    await expect(card).toBeVisible();
    const look = await card.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        radius: parseFloat(style.borderTopLeftRadius),
        border: style.borderTopStyle,
      };
    });
    expect(look.radius).toBeGreaterThanOrEqual(8);
    expect(look.border).toBe('solid');
  });

  test('styles vertical sliders, steppers and the red align state', async ({
    page,
  }, testInfo) => {
    await openApp(page, 'ru');
    await loadScenario(page, workspaceLinked());
    await showView(page, 'coalitions');
    const range = page.locator('[data-party-card="P1"] .ws-range');
    await expect(range).toBeVisible();
    const slider = await range.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        mode: style.writingMode,
        accent: style.accentColor,
        tall: element.getBoundingClientRect().height,
        wide: element.getBoundingClientRect().width,
      };
    });
    if (!isPhone(testInfo.project.name)) {
      expect(slider.mode).toBe('vertical-lr');
      expect(slider.tall).toBeGreaterThan(slider.wide);
    }
    expect(slider.accent).not.toBe('auto');
    const share = page.locator('[data-panel-share="P1"]');
    await expect(share).toHaveValue('50');
    await page.locator('[data-nudge="P1:+"]').click();
    await expect(share).toHaveValue('50.25');
    await page.locator('[data-nudge="P1:-"]').click();
    await page.locator('[data-nudge="P1:-"]').click();
    await expect(share).toHaveValue('49.75');
    const align = page.locator('[data-action="panel-align"]');
    await expect(align).toHaveAttribute('data-attention', 'true');
    const red = await align.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    await align.click();
    await expect(align).toHaveAttribute('data-attention', 'false');
    const calm = await align.evaluate(
      (element) => getComputedStyle(element).backgroundColor,
    );
    expect(red).not.toBe(calm);
    const lock = page.locator('[data-lock-vote="P1"]');
    await lock.click();
    await expect(lock).toHaveAttribute('aria-pressed', 'true');
  });

  test('keeps the Hebrew workspace right-to-left inside its cards without overflow', async ({
    page,
  }) => {
    await openApp(page, 'he');
    await loadScenario(page, workspaceParties());
    await showView(page, 'coalitions');
    const card = page.locator('.ws-card').first();
    await expect(card).toBeVisible();
    expect(
      await card.evaluate((element) => getComputedStyle(element).direction),
    ).toBe('rtl');
    await expect(page.locator('.ws-tile')).toHaveCount(4);
    expect(await noSideOverflow(page)).toEqual([]);
  });

  test('fits the coalition and future cards at the Section 14.6 sizes', async ({
    page,
  }, testInfo) => {
    test.skip(isPhone(testInfo.project.name), 'desktop sizes only');
    await openApp(page, 'ru');
    await loadScenario(page, workspaceParties());
    for (const size of SIZES) {
      await page.setViewportSize(size);
      await showView(page, 'coalitions');
      await expect(page.locator('.ws-card').first()).toBeVisible();
      expect(await noSideOverflow(page), `${size.width}`).toEqual([]);
      await showView(page, 'future');
      await expect(page.locator('.ws-timeline')).toBeVisible();
      expect(await noSideOverflow(page), `${size.width}`).toEqual([]);
    }
  });

  test('moves the future timeline back to the start and shows donut pairs', async ({
    page,
  }) => {
    await openApp(page, 'ru');
    await loadScenario(page, workspaceLinked());
    await showView(page, 'future');
    await page.locator('[data-future-year]').selectOption('7');
    await page.locator('[data-action="future-start"]').click();
    await expect(page.locator('[data-future-year]')).toHaveValue('0');
    await page
      .locator('[data-future-choice] input[type="checkbox"]')
      .first()
      .check();
    const tile = page.locator('.ws-future-tile').first();
    await expect(tile).toBeVisible();
    await expect(tile.locator('.ws-donut')).toHaveCount(2);
    expect(
      await tile.evaluate((element) =>
        parseFloat(getComputedStyle(element).borderTopLeftRadius),
      ),
    ).toBeGreaterThanOrEqual(8);
    expect(await noSideOverflow(page)).toEqual([]);
  });
});
