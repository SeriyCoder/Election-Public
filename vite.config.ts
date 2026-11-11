import preact from '@preact/preset-vite';
import type { Plugin } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { defineConfig } from 'vitest/config';
import { compactLocales } from './build/compactLocales';
import { packInlineStyles } from './build/packStyles';
import {
  hostedMetadata,
  hostedReadme,
  hostedSettings,
} from './build/hostedPreview';

/** The offline distribution is this one self-contained file (spec 2.2). */
export const OFFLINE_FILE_NAME = 'elections.html';

/**
 * No network and no external resource; inline script and style, and the
 * inline coalition worker (blob URL, data URL fallback). Build only, because
 * the dev server needs its own scripts and a WebSocket.
 */
export const CONTENT_SECURITY_POLICY = [
  "default-src 'none'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'worker-src blob: data:',
  'img-src data:',
  "connect-src 'none'",
].join('; ');

const CHARSET_TAG = '<meta charset="utf-8" />';

function offlineFile(): Plugin {
  return {
    name: 'elections-offline-file',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      if (!html.includes(CHARSET_TAG)) {
        throw new Error(`index.html must contain ${CHARSET_TAG}`);
      }
      return html.replace(
        CHARSET_TAG,
        `${CHARSET_TAG}\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />`,
      );
    },
    generateBundle: {
      // After vite-plugin-singlefile has inlined the stylesheet.
      order: 'post',
      handler(_options, bundle) {
        const page = bundle['index.html'];
        if (page === undefined || page.type !== 'asset') {
          throw new Error('expected the built index.html asset');
        }
        delete bundle['index.html'];
        this.emitFile({
          type: 'asset',
          fileName: OFFLINE_FILE_NAME,
          source: packInlineStyles(String(page.source)).html,
        });
      },
    },
  };
}

function hostedFile(settings: ReturnType<typeof hostedSettings>): Plugin {
  return {
    name: 'elections-hosted-file',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      if (!html.includes(CHARSET_TAG)) {
        throw new Error(`index.html must contain ${CHARSET_TAG}`);
      }
      return html.replace(
        CHARSET_TAG,
        `${CHARSET_TAG}\n    <meta http-equiv="Content-Security-Policy" content="${CONTENT_SECURITY_POLICY}" />\n    ${hostedMetadata(settings)}`,
      );
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const page = bundle['index.html'];
        if (page === undefined || page.type !== 'asset') {
          throw new Error('expected the built index.html asset');
        }
        page.source = packInlineStyles(String(page.source)).html;
        this.emitFile({
          type: 'asset',
          fileName: 'README.md',
          source: hostedReadme(settings),
        });
      },
    },
  };
}

export default defineConfig(({ mode }) => {
  const hosted = mode === 'hosted';
  const plugins = [
    compactLocales(),
    preact(),
    viteSingleFile(),
    hosted
      ? hostedFile(hostedSettings(process.env.HOSTED_BASE_URL))
      : offlineFile(),
  ];

  return {
    base: hosted ? './' : '/',
    plugins,
    build: {
      outDir: hosted ? 'dist-hosted' : 'dist',
      emptyOutDir: true,
      modulePreload: { polyfill: false },
    },
    test: {
      environment: 'node',
      include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    },
  };
});
