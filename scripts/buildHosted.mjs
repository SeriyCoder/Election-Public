import { chromium } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);

if (!process.env.HOSTED_BASE_URL) {
  throw new Error(
    'Set HOSTED_BASE_URL to the HTTPS Pages base URL before building the hosted site.',
  );
}

await build({ mode: 'hosted' });

const outputDirectory = resolve(root, 'dist-hosted');
const expectedBeforeCapture = ['README.md', 'index.html'];
const actualBeforeCapture = (await readdir(outputDirectory)).sort();
if (
  actualBeforeCapture.length !== expectedBeforeCapture.length ||
  actualBeforeCapture.some(
    (name, index) => name !== expectedBeforeCapture[index],
  )
) {
  throw new Error(
    `Hosted build must initially contain only ${expectedBeforeCapture.join(', ')}`,
  );
}

const html = await readFile(resolve(outputDirectory, 'index.html'), 'utf8');
if (!html.includes('og:image') || !html.includes('og:title')) {
  throw new Error('Hosted metadata is missing from dist-hosted/index.html');
}

let browser;
try {
  browser = await chromium.launch({ channel: 'msedge', headless: true });
} catch (error) {
  throw new Error(
    'Microsoft Edge is required to capture the hosted preview image.',
    { cause: error },
  );
}

const externalRequests = [];
try {
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1008 },
    deviceScaleFactor: 0.625,
    locale: 'he-IL',
    offline: true,
    colorScheme: 'light',
  });
  const page = await context.newPage();
  page.on('request', (request) => {
    if (!/^(file|blob|data):/i.test(request.url())) {
      externalRequests.push(request.url());
    }
  });

  const indexUrl = pathToFileURL(resolve(outputDirectory, 'index.html')).href;
  await page.goto(indexUrl, { waitUntil: 'load' });
  await page.locator('[data-start="eight"][data-start-mode="open"]').click();
  await page.locator('.app[data-active-view="coalitions"]').waitFor({
    state: 'visible',
  });
  if ((await page.locator('html').getAttribute('lang')) !== 'he') {
    throw new Error('A fresh browser context did not start in Hebrew.');
  }

  const notice = page.locator('[data-public-notice]');
  await notice.waitFor({ state: 'visible' });
  const noticeText = await notice.innerText();
  if (
    !noticeText.includes(
      'מודל מתמטי לימודי, לא תחזית בחירות. כל החישובים מתבצעים בדפדפן שלך בלבד.',
    )
  ) {
    throw new Error('The Hebrew public notice is missing from the preview.');
  }

  await page.locator('[data-coalitions="done"]').waitFor({
    state: 'attached',
    timeout: 120_000,
  });
  const firstResult = page.locator('[data-coalition-tile]').first();
  await firstResult.waitFor({ state: 'visible' });

  await page.evaluate(() => globalThis.scrollTo(0, 0));
  const noticeBounds = await notice.boundingBox();
  const resultBounds = await firstResult.boundingBox();
  if (
    noticeBounds === null ||
    resultBounds === null ||
    noticeBounds.y < 0 ||
    noticeBounds.y + noticeBounds.height > 1008 ||
    noticeBounds.x < 0 ||
    noticeBounds.x + noticeBounds.width > 1920 ||
    resultBounds.y < 0 ||
    resultBounds.y + resultBounds.height > 1008 ||
    resultBounds.x < 0 ||
    resultBounds.x + resultBounds.width > 1920
  ) {
    throw new Error(
      `The notice and a settled coalition result must both fit in the preview viewport: ${JSON.stringify({ noticeBounds, resultBounds })}`,
    );
  }

  const imagePath = resolve(outputDirectory, 'preview.png');
  const image = await page.screenshot({
    path: imagePath,
    type: 'png',
    animations: 'disabled',
  });
  const imageBytes = await readFile(imagePath);
  const width = imageBytes.readUInt32BE(16);
  const height = imageBytes.readUInt32BE(20);
  if (
    !image
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
    width !== 1200 ||
    height !== 630 ||
    imageBytes.length < 15_000
  ) {
    throw new Error(
      `Invalid preview PNG: ${width}x${height}, ${imageBytes.length} bytes.`,
    );
  }
  if (externalRequests.length > 0) {
    throw new Error(
      `The preview attempted external requests: ${externalRequests.join(', ')}`,
    );
  }

  await context.close();
} finally {
  await browser.close();
}

const completedFiles = (await readdir(outputDirectory)).sort();
const expectedFiles = ['README.md', 'index.html', 'preview.png'];
if (
  completedFiles.length !== expectedFiles.length ||
  completedFiles.some((name, index) => name !== expectedFiles[index])
) {
  throw new Error(
    `Hosted output must contain exactly ${expectedFiles.join(', ')}`,
  );
}

console.log(`Hosted site ready in ${outputDirectory}`);
