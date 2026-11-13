import type { Page } from '@playwright/test';
import type { Locator } from '@playwright/test';
import {
  back,
  book,
  bookAt,
  bookPage,
  expect,
  next,
  openBook,
  test,
} from './helpers';

/**
 * Section 14.6 page fit: every questionnaire page, part, error, narrator
 * reply, facts page and confirmation fits the required laptop sizes at 100%
 * and 125% zoom (125% is the same window at 1.25 device pixels per CSS pixel).
 * M7-19: a screen stacking several pages scrolls inside its body instead; its
 * head and navigation stay in the window, nothing overflows sideways and the
 * body scrolls to every control.
 */
const SIZES = [
  { label: '1280x720 100%', width: 1280, height: 720, scale: 1 },
  { label: '1366x768 100%', width: 1366, height: 768, scale: 1 },
  { label: '1440x900 100%', width: 1440, height: 900, scale: 1 },
  { label: '1280x720 125%', width: 1024, height: 576, scale: 1.25 },
  { label: '1366x768 125%', width: 1092, height: 614, scale: 1.25 },
  { label: '1440x900 125%', width: 1152, height: 720, scale: 1.25 },
] as const;

const NAME_LENGTH = 60;

/** A name of exactly the questionnaire limit; groups get one unbroken word. */
function longName(
  prefix: string,
  spaced: boolean,
  length = NAME_LENGTH,
): string {
  const filler = spaced ? ' Широкая коалиция за перемены' : 'Ш';
  let name = prefix;
  while (name.length < length) {
    name += filler;
  }
  return name.slice(0, length);
}

/** Layout problems of the screen on view; empty when it fits. */
async function misfits(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const problems: string[] = [];
    const slack = 1;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const doc = document.documentElement;
    const root = document.querySelector('[data-book]');
    if (root === null) {
      return ['no book'];
    }
    // M7-19: stacked screens and the review scroll inside the body.
    const scrolling = root.querySelector<HTMLElement>('.book__body--screen');
    const stacked =
      Number(root.getAttribute('data-screen') ?? '1') > 1 || scrolling !== null;
    const body = stacked ? scrolling : null;
    if (stacked && body === null) {
      problems.push('stacked screen without a scrolling body');
    }
    if (!stacked && doc.scrollHeight > height + slack) {
      problems.push(`page height ${doc.scrollHeight} > ${height}`);
    }
    if (doc.scrollWidth > width + slack) {
      problems.push(`page width ${doc.scrollWidth} > ${width}`);
    }
    const name = (element: Element) =>
      `${element.tagName.toLowerCase()}${[...element.attributes]
        .filter((a) => a.name.startsWith('data-') || a.name === 'class')
        .map((a) => `[${a.name}="${a.value}"]`)
        .join('')}`;
    const shown = (element: Element) => {
      const box = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return box.width > 0 && box.height > 0 && style.visibility !== 'hidden';
    };
    const controls = [
      ...root.querySelectorAll('nav, button, input, select, textarea, a'),
    ].filter(shown);
    if (body !== null) {
      for (const frame of root.querySelectorAll('.book__head, .book__nav')) {
        const box = frame.getBoundingClientRect();
        if (box.top < -slack || box.bottom > height + slack) {
          problems.push(`${name(frame)} leaves the window`);
        }
      }
      if (body.scrollWidth > body.clientWidth + slack) {
        const edge = body.getBoundingClientRect().left + body.clientWidth;
        const wide = [...body.querySelectorAll('*')]
          .filter((element) => element.getBoundingClientRect().right > edge)
          .slice(0, 3)
          .map(name);
        problems.push(
          `screen width ${body.scrollWidth} > ${body.clientWidth}: ${wide.join(' ')}`,
        );
      }
      const frame = body.getBoundingClientRect();
      if (frame.top < -slack || frame.bottom > height + slack) {
        problems.push('screen body outside the window');
      }
      const scrolls = ['auto', 'scroll'].includes(
        getComputedStyle(body).overflowY,
      );
      if (body.scrollHeight > body.clientHeight + slack && !scrolls) {
        problems.push('screen body overflows without scrolling');
      }
    }
    for (const control of controls) {
      const box = control.getBoundingClientRect();
      if (body !== null && body.contains(control)) {
        // Reachable by scrolling the body: inside its scroll range and window width.
        const frame = body.getBoundingClientRect();
        const top = box.top - frame.top + body.scrollTop;
        if (
          top < -slack ||
          top + box.height > body.scrollHeight + slack ||
          box.height > body.clientHeight + slack ||
          box.left < -slack ||
          box.right > width + slack
        ) {
          problems.push(
            `${name(control)} out of the screen's reach at ${Math.round(top)}`,
          );
        }
        continue;
      }
      if (
        box.top < -slack ||
        box.left < -slack ||
        box.bottom > height + slack ||
        box.right > width + slack
      ) {
        problems.push(
          `${name(control)} outside the window at ${Math.round(box.top)},${Math.round(box.bottom)}`,
        );
      }
    }
    const motif = root.querySelector('[data-motif], [data-pie]');
    if (motif !== null) {
      const art = motif.getBoundingClientRect();
      const texts = [
        ...root.querySelectorAll(
          'input, select, textarea, label, legend, button, [data-question], [data-book-error], [data-narrator], [data-remainder]',
        ),
      ].filter(shown);
      for (const text of texts) {
        const box = text.getBoundingClientRect();
        const overlaps =
          box.left < art.right - slack &&
          art.left < box.right - slack &&
          box.top < art.bottom - slack &&
          art.top < box.bottom - slack;
        if (overlaps) {
          problems.push(`${name(text)} under the drawing`);
        }
      }
    }
    for (const element of root.querySelectorAll('*')) {
      if (
        element.closest('svg') !== null ||
        element.matches('input, select, textarea')
      ) {
        continue;
      }
      const style = getComputedStyle(element);
      for (const overflow of element === body
        ? []
        : [style.overflowX, style.overflowY]) {
        if (['auto', 'scroll', 'hidden', 'clip'].includes(overflow)) {
          problems.push(`${name(element)} has overflow ${overflow}`);
        }
      }
      const ownText = [...element.childNodes].some(
        (node) =>
          node.nodeType === Node.TEXT_NODE &&
          (node.textContent ?? '').trim() !== '',
      );
      if (ownText && shown(element) && parseFloat(style.fontSize) < 14) {
        problems.push(`${name(element)} text ${style.fontSize}`);
      }
    }
    return problems;
  });
}

async function expectFit(page: Page, label: string) {
  const where = await bookAt(page);
  expect.soft(await misfits(page), `${label} ${where}`).toEqual([]);
}

async function choose(block: Locator, choice: string) {
  await block.locator(`[data-book-choice="${choice}"]`).check();
}

async function fillEmpty(block: Locator, name: (index: number) => string) {
  const fields = block.locator('input[data-book-field]');
  const total = await fields.count();
  for (let index = 0; index < total; index += 1) {
    const field = fields.nth(index);
    const position = Number(await field.getAttribute('data-book-field'));
    await field.fill(name(position));
  }
}

/** A percent error on the first party, then a sum error on the last (M7-15: one page). */
async function errorStates(page: Page, label: string) {
  const compose = bookPage(page, 'compose');
  const first = compose.locator('input[data-book-field]').first();
  const kept = await first.inputValue();
  await first.fill('150');
  await page.locator('[data-action="book-next"]').click();
  await expect(compose.locator('[data-book-error]')).toBeVisible();
  await expectFit(page, `${label} percent error`);
  await first.fill(kept);
  const last = compose.locator('input[data-book-field]').last();
  const before = await last.inputValue();
  await last.fill('99');
  await page.locator('[data-action="book-next"]').click();
  await expect(compose.locator('[data-book-error]')).toBeVisible();
  // M7-19: compose stays on the turnout screen it shares.
  await expect(book(page)).toHaveAttribute('data-page', 'turnout');
  await expectFit(page, `${label} sum error`);
  await last.fill(before);
}

type Walk = 'heavy' | 'catalog';

/**
 * Answers one page block of the screen on view the way the walk needs,
 * checking extra states.
 */
async function answer(
  page: Page,
  walk: Walk,
  key: string,
  label: string,
  groupNameLength: number,
) {
  const heavy = walk === 'heavy';
  const block = bookPage(page, key);
  if (key === 'parties.count') {
    await block.locator('[data-book-field]').first().fill('10');
    await expect(block.locator('[data-narrator]')).toBeVisible();
    await expectFit(page, `${label} narrator`);
    await block.locator('[data-action="open-fact"]').click();
    await expect(book(page)).toHaveAttribute('data-page', 'facts');
    await expectFit(page, `${label} facts`);
    await page.locator('[data-action="close-fact"]').click();
    await expect(book(page)).toHaveAttribute('data-page', 'parties.count');
  } else if (key === 'parties.naming') {
    if (!heavy) {
      await block.locator('[data-book-choice="example"]').click();
      await expect(page.locator('[role="alertdialog"]')).toBeVisible();
      await expectFit(page, `${label} example confirmation`);
      await page.locator('[data-action="book-cancel"]').click();
      await expect(page.locator('[role="alertdialog"]')).toHaveCount(0);
    }
    await choose(block, heavy ? 'own' : 'catalog');
  } else if (key === 'parties.names' && heavy) {
    await fillEmpty(block, (n) => longName(`Партия ${(n + 1) / 2}`, true));
  } else if (key === 'people.set') {
    await choose(block, heavy ? 'own' : 'example');
  } else if (key === 'people.count' && heavy) {
    await block.locator('[data-book-field]').first().fill('8');
  } else if (key === 'people.names' && heavy) {
    await fillEmpty(block, (n) =>
      longName(`Группа${(n + 1) / 2}`, false, groupNameLength),
    );
  } else if (key === 'coalitions' && heavy) {
    await expect(block.locator('.directed-relations__pages')).toHaveCount(0);
    const selector = block.locator('.directed-relations select');
    await expect(selector.locator('option')).toHaveCount(10);
    for (let party = 1; party <= 10; party += 1) {
      await selector.selectOption(`P${party}`);
      await expect(block.locator('[data-refusal]')).toHaveCount(18);
      await expectFit(page, `${label} selected party ${party}`);
    }
  } else if (key === 'growth' && !heavy) {
    await fillEmpty(block, () => '3');
    await expect(block.locator('[data-growth-warning]')).toHaveCount(7);
    await expectFit(page, `${label} all unusual growth`);
    await fillEmpty(block, () => '0');
  } else if (key === 'compose' && heavy) {
    await errorStates(page, label);
  }
}

/** The page keys stacked on the screen on view, in order. */
async function screenKeys(page: Page): Promise<string[]> {
  return book(page)
    .locator('[data-book-page]')
    .evaluateAll((list) =>
      list.map((block) => block.getAttribute('data-book-page') ?? ''),
    );
}

/**
 * Walks the whole book, checking the fit of every screen and part. The set
 * holds every page key met and every `first page#part` on view.
 */
async function walkBook(
  page: Page,
  walk: Walk,
  label: string,
  groupNameLength = NAME_LENGTH,
) {
  await openBook(page);
  const seen = new Set<string>();
  const answered = new Set<string>();
  for (let turns = 0; turns < 260; turns += 1) {
    const where = await bookAt(page);
    // A choice can add pages to the screen on view (own groups), so answer
    // until every block of the screen is answered.
    for (let round = 0; round < 10; round += 1) {
      const keys = await screenKeys(page);
      const lone = keys.length === 1;
      const key = keys.find(
        (shown) => !answered.has(lone && /names$/.test(shown) ? where : shown),
      );
      if (key === undefined) {
        break;
      }
      answered.add(lone && /names$/.test(key) ? where : key);
      answered.add(key);
      seen.add(key);
      await answer(page, walk, key, label, groupNameLength);
    }
    seen.add(where);
    await expectFit(page, label);
    if ((await page.locator('[data-action="book-build"]').count()) > 0) {
      await page.locator('[data-action="book-restart"]').click();
      await expect(page.locator('[role="alertdialog"]')).toBeVisible();
      await expectFit(page, `${label} restart confirmation`);
      await page.locator('[data-action="book-cancel"]').click();
      expect(seen.has('review'), where).toBe(true);
      return seen;
    }
    await next(page);
  }
  throw new Error(`${label}: the book never reached the build button`);
}

test.describe('questionnaire page fit', () => {
  test.skip(({ isMobile }) => isMobile, 'laptop sizes only');
  test.describe.configure({ timeout: 180_000 });

  for (const size of SIZES) {
    test.describe(size.label, () => {
      test.use({
        viewport: { width: size.width, height: size.height },
        deviceScaleFactor: size.scale,
      });

      test('fits every page with ten long names and eight own groups', async ({
        page,
      }) => {
        const seen = await walkBook(page, 'heavy', `heavy ${size.label}`);
        for (const key of [
          'parties.names#1',
          'people.about',
          'people.mix',
          'people.count',
          'people.names',
          'turnout',
          'votes.shares',
          'compose',
          'votes.check',
          'growth',
          'coalitions',
          // M7-19: the stacked screens, each on its first page.
          'parties.count#0',
          'people.set#0',
          'turnout#0',
          'votes.check#0',
          'coalitions#0',
        ]) {
          expect(seen.has(key), key).toBe(true);
        }
        for (const key of [
          'parties.count#1',
          'people.set#1',
          'turnout#1',
          'votes.check#1',
          'coalitions#1',
        ]) {
          expect(seen.has(key), `${key} (M7-19: a stacked screen)`).toBe(false);
        }
        expect([...seen].some((key) => /^coalitions\./.test(key))).toBe(false);
      });

      test('fits every page with ten catalog lists', async ({ page }) => {
        const seen = await walkBook(page, 'catalog', `catalog ${size.label}`);
        expect(seen.has('parties.names#1')).toBe(true);
      });

      if (size.width === 1024 && size.height === 576) {
        test('fits eight wide group names at the pagination boundary', async ({
          page,
        }) => {
          const seen = await walkBook(page, 'heavy', '32-character groups', 32);
          expect(seen.has('votes.check#0')).toBe(true);
          expect(seen.has('votes.check#1')).toBe(false);
        });
      }
    });
  }
});

/** Animations of the drawings, with their end time in milliseconds. */
async function drawingMotion(page: Page) {
  return page.evaluate(() =>
    document
      .getAnimations()
      .filter((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        return (
          target instanceof Element &&
          target.closest('[data-motif], [data-palms]') !== null
        );
      })
      .map((animation) => {
        const timing = animation.effect?.getComputedTiming();
        return {
          end: Number(timing?.endTime ?? Infinity),
          iterations: Number(timing?.iterations ?? Infinity),
        };
      }),
  );
}

async function bookMotion(page: Page) {
  return page.evaluate(
    () =>
      document.getAnimations().filter((animation) => {
        const target = (animation.effect as KeyframeEffect | null)?.target;
        return (
          target instanceof Element && target.closest('[data-book]') !== null
        );
      }).length,
  );
}

test.describe('questionnaire motion', () => {
  test.skip(({ isMobile }) => isMobile, 'checked once on the laptop');

  test('draws in once on every page turn without holding the buttons', async ({
    page,
  }) => {
    await openBook(page);
    let drawn = 0;
    for (let turn = 0; turn < 3; turn += 1) {
      await next(page);
      for (const action of ['book-back', 'book-next', 'book-skip']) {
        await expect(page.locator(`[data-action="${action}"]`)).toBeEnabled();
      }
      const motion = await drawingMotion(page);
      // M7-19: only a screen holding one page shows a drawing.
      if ((await book(page).getAttribute('data-screen')) === '1') {
        expect(motion.length, await bookAt(page)).toBeGreaterThan(0);
        drawn += 1;
      } else {
        await expect(page.locator('[data-motif]')).toHaveCount(0);
      }
      for (const { end, iterations } of motion) {
        expect(iterations).toBeLessThanOrEqual(2);
        expect(end).toBeLessThanOrEqual(2000);
      }
    }
    expect(drawn).toBeGreaterThan(0);
    await back(page);
    await back(page);
    await expect(book(page)).toHaveAttribute('data-page', 'parties.count');
    await bookPage(page, 'parties.count')
      .locator('[data-action="open-fact"]')
      .click();
    await expect(page.locator('[data-side="lily"]')).toBeVisible();
    const coin = await drawingMotion(page);
    expect(coin.length).toBeGreaterThan(0);
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });

    test('shows the final drawing at once', async ({ page }) => {
      await openBook(page);
      expect(await bookMotion(page), 'intro').toBe(0);
      let drawn = 0;
      for (let turn = 0; turn < 3; turn += 1) {
        await next(page);
        expect(await bookMotion(page), await bookAt(page)).toBe(0);
        // M7-19: only a screen holding one page shows a drawing.
        if ((await page.locator('[data-motif]').count()) === 0) {
          continue;
        }
        drawn += 1;
        const opacity = await page
          .locator('[data-motif]')
          .evaluate((element) => getComputedStyle(element).opacity);
        expect(opacity).toBe('1');
      }
      expect(drawn).toBeGreaterThan(0);
    });
  });
});
