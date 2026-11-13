import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { test, expect, type Page } from '@playwright/test';
import { runScenario, runSeats, serializeResult } from '../../src/engine/run';
import { parseScenarioJson, serializeScenario } from '../../src/engine/schema';

const folder = new URL('../../dist-hosted/', import.meta.url);
const offline = new URL('../../dist/elections.html', import.meta.url).href;
const PREFIX = '/Israel-Election-Simulator/';
const notices = {
  ru: 'Учебная математическая модель, а не прогноз выборов. Расчёты выполняются только в вашем браузере.',
  en: 'An educational mathematical model, not an election forecast. Everything is calculated in your browser only.',
  he: 'מודל מתמטי לימודי, לא תחזית בחירות. כל החישובים מתבצעים בדפדפן שלך בלבד.',
} as const;

async function exportInput(page: Page) {
  const download = page.waitForEvent('download');
  await page.locator('[data-action="export"]').click();
  const file = await download;
  const path = await file.path();
  if (path === null) throw new Error('scenario download has no local path');
  const parsed = parseScenarioJson(readFileSync(path, 'utf8'));
  if (!parsed.ok) throw new Error('exported scenario must validate');
  return parsed.scenario;
}

async function shownSeats(page: Page) {
  const cells = page.locator('[data-party-seats]');
  await expect(cells.first()).toHaveAttribute('data-party-seat-state', 'ready');
  return cells.evaluateAll((list) =>
    Object.fromEntries(
      list.map((cell) => [
        cell.getAttribute('data-party-seats'),
        cell.textContent?.trim(),
      ]),
    ),
  );
}

test('offline questionnaire also carries the educational notice', async ({
  page,
}) => {
  await page.goto(offline);
  await expect(page.locator('.app')).toHaveAttribute('lang', 'he');
  await expect(page.locator('[data-public-notice]')).toHaveText(notices.he);
});

test('hosted output contains exactly the approved files and a 1200 by 630 PNG', () => {
  const image = new URL('preview.png', folder);
  expect(existsSync(image), 'completed hosted preview must exist').toBe(true);
  expect(readdirSync(folder).sort()).toEqual([
    'README.md',
    'index.html',
    'preview.png',
  ]);
  const png = readFileSync(image);
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(png.readUInt32BE(16)).toBe(1200);
  expect(png.readUInt32BE(20)).toBe(630);
  expect(png.length).toBeGreaterThan(5000);
});

for (const language of ['ru', 'en', 'he'] as const) {
  for (const start of ['eight', 'israel'] as const) {
    test(`hosted and offline ${start} examples agree in ${language}`, async ({
      page,
      context,
    }) => {
      const index = new URL('index.html', folder);
      expect(existsSync(index), 'hosted build must produce index.html').toBe(
        true,
      );
      let server: Server | undefined;
      let peer: Page | undefined;
      const problems: string[] = [];
      try {
        server = createServer((request, response) => {
          if (request.url !== PREFIX) {
            response.writeHead(404).end();
            return;
          }
          response.setHeader('Content-Type', 'text/html; charset=utf-8');
          response.end(readFileSync(index));
        });
        server.listen(0, '127.0.0.1');
        await once(server, 'listening');
        const address = server.address();
        if (address === null || typeof address === 'string') {
          throw new Error('loopback server has no port');
        }
        const origin = `http://127.0.0.1:${address.port}`;
        await context.route('**/*', (route) => {
          const url = route.request().url();
          if (url.startsWith(origin + '/') || /^(file|blob|data):/.test(url)) {
            return route.continue();
          }
          problems.push(`external request: ${url}`);
          return route.abort();
        });
        await context.setOffline(false);
        page.on('pageerror', (error) => problems.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error') problems.push(message.text());
        });
        await page.goto(origin + PREFIX);
        await expect(page.locator('.app')).toHaveAttribute('lang', 'he');
        for (const locale of ['ru', 'en', 'he'] as const) {
          await page.locator(`[data-locale="${locale}"]`).click();
          await expect(page.locator('[data-public-notice]')).toHaveText(
            notices[locale],
          );
        }
        await page.locator(`[data-locale="${language}"]`).click();
        await page
          .locator(`[data-start="${start}"][data-start-mode="open"]`)
          .click();
        await expect(page.locator('[data-public-notice]')).toHaveText(
          notices[language],
        );
        await expect(
          page.locator('[data-coalition-tile]').first(),
        ).toBeVisible();
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        ).toBe(true);
        const currentSeats = await shownSeats(page);
        const current = await exportInput(page);
        peer = await context.newPage();
        await peer.goto(offline);
        await peer.locator(`[data-locale="${language}"]`).click();
        await peer
          .locator(`[data-start="${start}"][data-start-mode="open"]`)
          .click();
        expect(await shownSeats(peer)).toEqual(currentSeats);
        const reference = await exportInput(peer);
        expect(serializeScenario(current)).toBe(serializeScenario(reference));
        expect(serializeResult(runScenario(current))).toBe(
          serializeResult(runScenario(reference)),
        );
        for (const year of [0, 4]) {
          expect(runSeats(current, year)).toEqual(runSeats(reference, year));
        }
        const imported = readFileSync(
          new URL('../fixtures/new8.json', import.meta.url),
          'utf8',
        );
        await page.locator('input[type="file"]').setInputFiles({
          name: 'example.json',
          mimeType: 'application/json',
          buffer: Buffer.from(imported),
        });
        const checked = parseScenarioJson(imported);
        if (!checked.ok) throw new Error('fixture must validate');
        await expect
          .poll(async () => serializeScenario(await exportInput(page)))
          .toBe(serializeScenario(checked.scenario));
        await page.locator('[data-view="future"]').click();
        await expect(page.locator('[data-public-notice]')).toHaveText(
          notices[language],
        );
        expect(problems).toEqual([]);
      } finally {
        if (peer !== undefined) await peer.close();
        if (server !== undefined) {
          await new Promise<void>((resolve, reject) => {
            server!.close((error) => (error ? reject(error) : resolve()));
            server!.closeAllConnections();
          });
        }
      }
    });
  }
}
