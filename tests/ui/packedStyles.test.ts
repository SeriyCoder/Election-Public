import { deflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import {
  decodePackedStyles,
  installPackedStyles,
  type StyleHost,
} from '../../src/ui/packedStyles';

const CSS = ".ws-card{border-radius:12px}.x::after{content:'→ א'}";

function host() {
  const appended: { textContent: string | null }[] = [];
  const value: StyleHost = {
    head: {
      appendChild(node: unknown) {
        appended.push(node as { textContent: string | null });
        return node;
      },
    },
    createElement: () => ({ textContent: null }),
  };
  return { value, appended };
}

describe('M7-14 runtime stylesheet decoding', () => {
  it('inflates the packed stylesheet to the exact text', async () => {
    const packed = deflateSync(CSS, { level: 9 }).toString('base64');
    await expect(decodePackedStyles(packed)).resolves.toBe(CSS);
  });

  it('inserts the decoded text as one inert style element', async () => {
    const { value, appended } = host();
    await installPackedStyles(
      value,
      deflateSync(CSS, { level: 9 }).toString('base64'),
    );
    expect(appended).toHaveLength(1);
    expect(appended[0]!.textContent).toBe(CSS);
  });

  it('does nothing while the build token is still in place', async () => {
    const { value, appended } = host();
    await installPackedStyles(value);
    expect(appended).toHaveLength(0);
  });
});
