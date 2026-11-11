import type { Page, TestInfo } from '@playwright/test';
import {
  LOCALES,
  VIEWS,
  expect,
  isPhone,
  loadScenario,
  openApp,
  showView,
  test,
  type View,
} from './helpers';
import { largeInput, longNamesInput } from './scenarios';

interface Box {
  readonly name: string;
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** Elements that stick out of the viewport sideways, outside scroll regions. */
async function overflowing(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const found: string[] = [];
    if (document.documentElement.scrollWidth > width + 1) {
      found.push(`page ${document.documentElement.scrollWidth} > ${width}`);
    }
    for (const element of document.querySelectorAll<HTMLElement>('.app *')) {
      if (element.closest('.table-scroll') !== null) {
        continue;
      }
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) {
        continue;
      }
      if (box.left < -1 || box.right > width + 1) {
        const tag = element.tagName.toLowerCase();
        const name = element.className || element.getAttribute('data-field');
        found.push(`${tag}.${String(name)} ${box.left}..${box.right}`);
      }
    }
    return found.slice(0, 10);
  });
}

async function regions(page: Page): Promise<Box[]> {
  return page.evaluate(() =>
    [
      ['toolbar', '[data-region="toolbar"]'],
      ['views', 'nav.views'],
      ['editor', '[data-region="editor"]'],
      ['results', '[data-region="results"]'],
    ].flatMap(([name, selector]) => {
      const element = document.querySelector(selector ?? '');
      if (element === null) {
        return [];
      }
      const box = element.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) {
        return [];
      }
      return [
        {
          name: name ?? '',
          left: box.left + window.scrollX,
          right: box.right + window.scrollX,
          top: box.top + window.scrollY,
          bottom: box.bottom + window.scrollY,
        },
      ];
    }),
  );
}

function overlaps(boxes: readonly Box[]): string[] {
  const found: string[] = [];
  boxes.forEach((a, index) => {
    for (const b of boxes.slice(index + 1)) {
      const width = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const height = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (width > 1 && height > 1) {
        found.push(`${a.name} overlaps ${b.name}`);
      }
    }
  });
  return found;
}

async function settle(page: Page, view: View) {
  if (view === 'coalitions') {
    await expect(
      page.locator('[data-coalition-summary="search"]'),
    ).toBeVisible();
  }
}

async function attachScreenshot(page: Page, testInfo: TestInfo) {
  await testInfo.attach('screenshot', {
    body: await page.screenshot({ fullPage: true }),
    contentType: 'image/png',
  });
}

test.describe('layout', () => {
  for (const locale of LOCALES) {
    for (const view of VIEWS) {
      test(`${view} in ${locale} with long names fits the width`, async ({
        page,
      }, testInfo) => {
        await openApp(page, locale);
        await loadScenario(page, longNamesInput());
        await showView(page, view);
        await settle(page, view);
        await attachScreenshot(page, testInfo);
        expect(await overflowing(page)).toEqual([]);
        if (isPhone(testInfo.project.name)) {
          // The fixed view switcher is not part of the flow.
          const flow = (await regions(page)).filter(
            (box) => box.name !== 'views',
          );
          expect(overlaps(flow)).toEqual([]);
        } else {
          expect(overlaps(await regions(page))).toEqual([]);
        }
      });
    }
  }

  test('phone: the view switcher sits at the bottom and covers no content', async ({
    page,
  }, testInfo) => {
    test.skip(!isPhone(testInfo.project.name), 'phone layout only');
    await openApp(page);
    await showView(page, 'seats');
    const viewport = page.viewportSize();
    const nav = await page.locator('nav.views').boundingBox();
    expect(nav).not.toBeNull();
    expect(Math.round((nav?.y ?? 0) + (nav?.height ?? 0))).toBe(
      viewport?.height,
    );
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    );
    const contentBottom = await page.evaluate(() => {
      const items = [
        ...document.querySelectorAll('[data-region="results"] *'),
      ].map((element) => element.getBoundingClientRect().bottom);
      return Math.max(...items);
    });
    const navTop = await page.evaluate(
      () => document.querySelector('nav.views')?.getBoundingClientRect().top,
    );
    expect(contentBottom).toBeLessThanOrEqual((navTop ?? 0) + 1);
  });

  test('desktop: editor and results sit side by side', async ({
    page,
  }, testInfo) => {
    test.skip(isPhone(testInfo.project.name), 'desktop layout only');
    await openApp(page);
    const boxes = await regions(page);
    const editor = boxes.find((box) => box.name === 'editor');
    const results = boxes.find((box) => box.name === 'results');
    expect(editor).toBeDefined();
    expect(results).toBeDefined();
    expect(Math.abs((editor?.top ?? 0) - (results?.top ?? 1))).toBeLessThan(2);
  });

  test('wide tables scroll inside their own region, not the page', async ({
    page,
  }, testInfo) => {
    test.skip(!isPhone(testInfo.project.name), 'phone width only');
    await openApp(page);
    await loadScenario(page, largeInput({ eligible: 12 }));
    await showView(page, 'compare');
    await page.locator('[data-action="save-baseline"]').click();
    await expect(page.locator('[data-compare="ready"]')).toBeVisible();
    await attachScreenshot(page, testInfo);
    const scrollers = await page.locator('.table-scroll').evaluateAll((list) =>
      list.map((element) => ({
        scrolls: element.scrollWidth > element.clientWidth,
        focusable: element.getAttribute('tabindex') === '0',
        named: element.closest('[aria-label], section') !== null,
      })),
    );
    expect(scrollers.some((item) => item.scrolls)).toBe(true);
    for (const item of scrollers.filter((entry) => entry.scrolls)) {
      expect(item.focusable).toBe(true);
    }
    expect(await overflowing(page)).toEqual([]);
  });
});
