import { deflateSync } from 'node:zlib';

/** The module-script token replaced by the packed stylesheet at build time. */
export const PACKED_STYLES_TOKEN = '__ELECTIONS_PACKED_STYLES__';

export interface PackedStyles {
  readonly html: string;
  readonly css: string;
  readonly packed: string;
}

const STYLE = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;

/**
 * Moves the one inlined stylesheet into the module script as lossless DEFLATE
 * base64; the page inflates it into a style element before its first render.
 */
export function packInlineStyles(html: string): PackedStyles {
  const styles = [...html.matchAll(STYLE)];
  if (styles.length !== 1) {
    throw new Error(
      `Expected exactly one inlined style element, found ${styles.length}`,
    );
  }
  const tokens = html.split(PACKED_STYLES_TOKEN).length - 1;
  if (tokens !== 1) {
    throw new Error(
      `Expected exactly one packed-styles token, found ${tokens}`,
    );
  }
  const [element, css = ''] = styles[0]!;
  const packed = deflateSync(Buffer.from(css, 'utf8'), { level: 9 }).toString(
    'base64',
  );
  const index = styles[0]!.index!;
  const without = html.slice(0, index) + html.slice(index + element.length);
  return {
    html: without.replace(PACKED_STYLES_TOKEN, () => packed),
    css,
    packed,
  };
}
