export interface HostedSettings {
  readonly baseUrl: string;
  readonly imageUrl: string;
}

const TITLE = 'סימולטור בחירות וקואליציות';
const DESCRIPTION =
  'מודל לימודי: איך אחוזי ההצבעה, ההעדפות ואחוז החסימה משנים את חלוקת המנדטים ואת הקואליציות האפשריות. לא תחזית.';
const IMAGE_ALT = 'תצוגת הקואליציות של הדוגמה עם שמונה מפלגות';

function escapeAttribute(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

export function hostedSettings(value: string | undefined): HostedSettings {
  if (value === undefined || value.length === 0 || value.trim() !== value) {
    throw new Error(
      'HOSTED_BASE_URL must be an absolute HTTPS URL ending in /',
    );
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('HOSTED_BASE_URL must be a valid absolute HTTPS URL');
  }

  if (
    url.protocol !== 'https:' ||
    url.hostname.length === 0 ||
    url.username.length > 0 ||
    url.password.length > 0 ||
    value.includes('?') ||
    value.includes('#') ||
    url.pathname.endsWith('/') === false
  ) {
    throw new Error(
      'HOSTED_BASE_URL must use HTTPS, have no credentials, query, or fragment, and end in /',
    );
  }

  const baseUrl = url.href;
  return { baseUrl, imageUrl: new URL('preview.png', baseUrl).href };
}

export function hostedMetadata(settings: HostedSettings): string {
  const title = escapeAttribute(TITLE);
  const description = escapeAttribute(DESCRIPTION);
  const baseUrl = escapeAttribute(settings.baseUrl);
  const imageUrl = escapeAttribute(settings.imageUrl);
  const imageAlt = escapeAttribute(IMAGE_ALT);
  return [
    `<meta name="description" content="${description}" />`,
    `<link rel="canonical" href="${baseUrl}" />`,
    `<meta property="og:locale" content="he_IL" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${description}" />`,
    `<meta property="og:url" content="${baseUrl}" />`,
    `<meta property="og:image" content="${imageUrl}" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${imageAlt}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
  ].join('\n    ');
}

export function hostedReadme(settings: HostedSettings): string {
  return `# סימולטור בחירות וקואליציות

מודל מתמטי לימודי של השתתפות, חלוקת קולות, אחוז חסימה, חלוקת מושבים וקואליציות. זהו אינו תחזית בחירות או מחשבון משפטי.

הדף המתוכנן: ${settings.baseUrl}

החישובים והתרחישים נשארים בדפדפן; אין שרת, חשבון משתמש או שליחת תרחישים.
`;
}
