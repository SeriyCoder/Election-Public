import { existsSync, readFileSync } from 'node:fs';
import { build } from 'vite';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CONTENT_SECURITY_POLICY } from '../../vite.config';

const BASE = 'https://seriycoder.github.io/Election-Public/';
const TITLE = 'סימולטור בחירות וקואליציות';
const DESCRIPTION =
  'מודל לימודי: איך אחוזי ההצבעה, ההעדפות ואחוז החסימה משנים את חלוקת המנדטים ואת הקואליציות האפשריות. לא תחזית.';

function filesOf(result: unknown): { name: string; text: string }[] {
  return (Array.isArray(result) ? result : [result]).flatMap((entry) =>
    (
      entry as {
        output: {
          fileName: string;
          type: string;
          code?: string;
          source?: string | Uint8Array;
        }[];
      }
    ).output.map((file) => ({
      name: file.fileName,
      text:
        file.type === 'chunk'
          ? (file.code ?? '')
          : typeof file.source === 'string'
            ? file.source
            : new TextDecoder().decode(file.source ?? new Uint8Array()),
    })),
  );
}

async function hosted(base: string) {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('HOSTED_BASE_URL', base);
  try {
    return filesOf(
      await build({
        mode: 'hosted',
        logLevel: 'silent',
        build: { write: false },
      }),
    );
  } finally {
    vi.unstubAllEnvs();
  }
}

let files: Awaited<ReturnType<typeof hosted>>;
let html = '';

beforeAll(async () => {
  files = await hosted(BASE);
  html = files.find((file) => file.name === 'index.html')?.text ?? '';
}, 120_000);

function meta(name: string, attribute = 'property') {
  const tags = html.match(/<meta\b[^>]*>/g) ?? [];
  const tag = tags.find((value) => value.includes(`${attribute}="${name}"`));
  return /content="([^"]*)"/.exec(tag ?? '')?.[1];
}

describe('hosted packaging', () => {
  it('emits a self-contained index and public README, never source maps', () => {
    expect(files.map((file) => file.name).sort()).toEqual([
      'README.md',
      'index.html',
    ]);
    expect(html).toMatch(/^<!doctype html>/i);
    expect(html).not.toMatch(/sourceMappingURL|<script[^>]+\ssrc=/);
    expect(files.find((file) => file.name === 'README.md')?.text).toContain(
      BASE,
    );
  });

  it('provides exact Hebrew crawler metadata before application execution', () => {
    expect(meta('og:title')).toBe(TITLE);
    expect(meta('og:description')).toBe(DESCRIPTION);
    expect(meta('description', 'name')).toBe(DESCRIPTION);
    expect(meta('og:locale')).toBe('he_IL');
    expect(meta('og:type')).toBe('website');
    expect(meta('og:url')).toBe(BASE);
    expect(meta('og:image')).toBe(`${BASE}preview.png`);
    expect(meta('og:image:width')).toBe('1200');
    expect(meta('og:image:height')).toBe('630');
    expect(meta('og:image:alt')).toMatch(/[\u0590-\u05FF]/);
    expect(meta('twitter:card', 'name')).toBe('summary_large_image');
    expect(html).toContain(`rel="canonical" href="${BASE}"`);
    expect(html.indexOf('og:title')).toBeLessThan(html.indexOf('<script'));
  });

  it('keeps offline CSP, inline workers and no external runtime resources', () => {
    expect(
      html.includes(`content="${CONTENT_SECURITY_POLICY}"`),
      'CSP is preserved',
    ).toBe(true);
    expect(html).toContain('new Worker(');
    expect(html).not.toMatch(
      /<(script|img|iframe|source)\b[^>]*\s(src|href)=["']https?:/i,
    );
    expect(html).not.toMatch(/\b(fetch|sendBeacon|XMLHttpRequest)\s*\(/);
  });

  it('defines a separate orchestrated command without replacing offline build', () => {
    const pkg = JSON.parse(
      readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts.build).toBe('vite build');
    expect(pkg.scripts['build:hosted']).toBe('node scripts/buildHosted.mjs');
    const script = new URL('../../scripts/buildHosted.mjs', import.meta.url);
    expect(existsSync(script), 'hosted orchestrator must exist').toBe(true);
    const ignore = readFileSync(
      new URL('../../.gitignore', import.meta.url),
      'utf8',
    );
    expect(ignore.split(/\r?\n/)).toContain('dist-hosted/');
  });

  for (const invalid of [
    'http://example.org/app/',
    'https://user:password@example.org/app/',
    'https://example.org/app/?token=x',
    'https://example.org/app/#fragment',
    'https://example.org/app',
    'not-a-url',
  ]) {
    it(`rejects the invalid hosted base ${invalid}`, async () => {
      const rejected = await hosted(invalid).then(
        () => false,
        (error: unknown) => {
          expect(error).toBeInstanceOf(Error);
          if (!(error instanceof Error)) throw error;
          expect(error.message).toMatch(/HOSTED_BASE_URL|base URL|HTTPS|URL/i);
          return true;
        },
      );
      expect(rejected, 'invalid base must fail the build').toBe(true);
    }, 120_000);
  }
});

describe('controlled Pages workflow', () => {
  function workflow() {
    const path = new URL('../../.github/workflows/pages.yml', import.meta.url);
    expect(existsSync(path), 'manual Pages workflow must exist').toBe(true);
    return readFileSync(path, 'utf8');
  }

  it('requires manual dispatch and does not deploy pushes or pull requests', () => {
    const text = workflow();
    expect(text).toContain('workflow_dispatch');
    expect(text).not.toMatch(/^\s*(push|pull_request|pull_request_target):/m);
    expect(text).not.toMatch(/^\s*on:\s*\[|^\s*on:\s*(push|pull_request)\b/m);
    expect(text).toContain('refs/heads/main');
    expect(text).toMatch(/concurrency:/);
    expect(text).toMatch(/environment:\s*(?:\n\s*name:\s*)?github-pages/);
  });

  it('pins Actions and disables persistent checkout credentials', () => {
    const text = workflow();
    expect(text.slice(0, text.indexOf('jobs:'))).not.toMatch(
      /(?:pages|id-token):\s*write|permissions:\s*write-all/,
    );
    const actions = [...text.matchAll(/uses:\s*([^\s]+)/g)];
    expect(actions.length).toBeGreaterThanOrEqual(4);
    for (const [, action] of actions) {
      expect(action).toMatch(/^[\w.-]+\/[\w./-]+@[a-f0-9]{40}$/);
    }
    expect(text).toMatch(/persist-credentials:\s*false/);
    expect(text).not.toMatch(/secrets\.(?:PAT|GH_TOKEN|PERSONAL_ACCESS_TOKEN)/);
  });

  it('builds with read-only permissions and deploys only the generated site', () => {
    const text = workflow();
    const jobs = text.slice(text.indexOf('jobs:'));
    const buildJob = jobs.slice(
      jobs.indexOf('build:'),
      jobs.indexOf('deploy:'),
    );
    const deployJob = jobs.slice(jobs.indexOf('deploy:'));
    expect(buildJob).toMatch(/contents:\s*read/);
    expect(buildJob).not.toMatch(/(?:pages|id-token):\s*write/);
    expect(deployJob).toMatch(/pages:\s*write/);
    expect(deployJob).toMatch(/id-token:\s*write/);
    for (const command of [
      'npm ci',
      'npm test',
      'npm run typecheck',
      'npm run lint',
      'npm run test:e2e',
      'npm run build:hosted',
    ]) {
      expect(buildJob).toContain(command);
    }
    expect(buildJob).toMatch(/path:\s*['"]?dist-hosted\/?['"]?\s*$/m);
    expect(deployJob).toMatch(/needs:\s*(?:\[)?build/);
    expect(buildJob).toContain('windows-');
  });
});
