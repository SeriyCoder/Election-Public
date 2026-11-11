/** Replaced at build time by the DEFLATE-packed, base64 stylesheet. */
const PACKED = '__ELECTIONS_PACKED_STYLES__';

/** Inflates the packed stylesheet; the result is used only as style text. */
export async function decodePackedStyles(packed: string): Promise<string> {
  const bytes = Uint8Array.from(atob(packed), (character) =>
    character.charCodeAt(0),
  );
  return new Response(
    new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate')),
  ).text();
}

export interface StyleHost {
  readonly head: { appendChild(node: unknown): unknown };
  createElement(tag: 'style'): { textContent: string | null };
}

/** Installs the shipped stylesheet before the first render (spec 10). */
export async function installPackedStyles(
  host: StyleHost,
  packed: string = PACKED,
): Promise<void> {
  // Development and tests keep the token and use the ordinary CSS import.
  if (packed.startsWith('__')) return;
  const style = host.createElement('style');
  style.textContent = await decodePackedStyles(packed);
  host.head.appendChild(style);
}
