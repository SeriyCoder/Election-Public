import { en } from './en';
import { formatInteger, pluralCategory } from './format';
import { he } from './he';
import { ru } from './ru';

export type Locale = 'ru' | 'en' | 'he';
export type Direction = 'ltr' | 'rtl';

export const LOCALES: readonly Locale[] = ['ru', 'en', 'he'];
export const DEFAULT_LOCALE: Locale = 'he';

export const LOCALE_NAMES: Readonly<Record<Locale, string>> = {
  ru: 'Русский',
  en: 'English',
  he: 'עברית',
};

/** Russian is the reference key set; the other tables are typed against it. */
export const TABLES = { ru, en, he } as const;

export type MessageKey = keyof typeof ru | (string & {});
export type MessageParams = Readonly<Record<string, string | number>>;
export type Translate = (key: MessageKey, params?: MessageParams) => string;

export function isLocale(value: unknown): value is Locale {
  return value === 'ru' || value === 'en' || value === 'he';
}

export function direction(locale: Locale): Direction {
  return locale === 'he' ? 'rtl' : 'ltr';
}

/** Unknown keys come back unchanged; number parameters are localized. */
export function translator(locale: Locale): Translate {
  const table: Readonly<Record<string, string>> = TABLES[locale];
  return (key, params = {}) => {
    const template = table[key];
    if (template === undefined) {
      return key;
    }
    return template.replace(/\{(\w+)\}/g, (placeholder, name: string) => {
      const value = params[name];
      if (value === undefined) {
        return placeholder;
      }
      return typeof value === 'number' ? formatInteger(locale, value) : value;
    });
  };
}

/** A number of years with the unit in its plural form, e.g. ru "4 года". */
export function formatYears(locale: Locale, years: number): string {
  return translator(locale)(`unit.years.${pluralCategory(locale, years)}`, {
    n: years,
  });
}
