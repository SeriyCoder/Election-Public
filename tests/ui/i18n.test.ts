import { describe, expect, it } from 'vitest';
import {
  formatChange,
  formatDecimal,
  formatInteger,
} from '../../src/i18n/format';
import {
  DEFAULT_LOCALE,
  direction,
  isLocale,
  LOCALE_NAMES,
  LOCALES,
  TABLES,
  translator,
  type Locale,
} from '../../src/i18n';

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();
}

const referenceKeys = Object.keys(TABLES.ru).sort();

describe('M7-08 model notices', () => {
  const notices = {
    'storage.cleared': {
      ru: 'Сохранённые данные удалены. При следующем открытии язык будет ивритом.',
      en: 'Saved data cleared. The next visit opens in Hebrew.',
      he: 'הנתונים השמורים נמחקו. בביקור הבא הממשק ייפתח בעברית.',
    },
    'workspace.assumption': {
      ru: 'При действующей связанной модели изменение доли перераспределяет голоса внутри групп как допущение. Замки не ограничивают изменение долей из-за явки.',
      en: 'With an active linked model, changing a party share redistributes votes within groups as an assumption. Locks do not prevent turnout-driven changes.',
      he: 'במודל מקושר פעיל, שינוי שיעור מפלגה מחלק מחדש קולות בתוך הקבוצות כהנחה. נעילות אינן מונעות שינויים בעקבות שיעור ההצבעה.',
    },
    'workspace.majorityNote': {
      ru: 'Учебный расчёт: Hamilton, не израильский метод Бадера–Офера. Большинство мест не гарантирует политическое сотрудничество партий.',
      en: 'Educational calculation: Hamilton, not the Israeli Bader–Ofer method. A majority of seats does not guarantee political cooperation.',
      he: 'חישוב לימודי: המילטון, לא שיטת באדר–עופר הישראלית. רוב במושבים אינו מבטיח שיתוף פעולה פוליטי.',
    },
    'future.note': {
      ru: 'Проекция — допущения, не прогноз. Рост применяется ежегодно. В новых сценариях явка постоянна, в старых сохраняются заданные изменения. Выбранные коалиции пересчитываются по местам выбранного года; новые не ищутся.',
      en: 'A projection uses assumptions, not a forecast. Growth applies annually. New scenarios hold turnout fixed; old files retain saved changes. Chosen coalitions use the selected year’s seats; new coalitions are not searched.',
      he: 'ההיטל מבוסס על הנחות, לא על תחזית. הגידול חל מדי שנה. בתרחישים חדשים שיעור ההצבעה קבוע; קבצים ישנים שומרים שינויים שהוגדרו. הקואליציות שנבחרו מחושבות לפי מושבי השנה שנבחרה; לא מחפשים קואליציות חדשות.',
    },
  } as const;

  for (const [key, expected] of Object.entries(notices)) {
    it.each(LOCALES)(
      `${key} describes the model accurately in %s`,
      (locale) => {
        expect(translator(locale)(key)).toBe(expected[locale]);
      },
    );
  }
});

describe('locales', () => {
  it('lists ru, en and he with Hebrew as the default', () => {
    expect(LOCALES).toEqual(['ru', 'en', 'he']);
    expect(DEFAULT_LOCALE).toBe('he');
  });

  it('recognizes only the three locales', () => {
    for (const locale of LOCALES) {
      expect(isLocale(locale)).toBe(true);
    }
    for (const value of ['RU', 'de', '', null, undefined, 1, {}]) {
      expect(isLocale(value)).toBe(false);
    }
  });

  it('lays out Hebrew right to left and the others left to right', () => {
    expect(direction('ru')).toBe('ltr');
    expect(direction('en')).toBe('ltr');
    expect(direction('he')).toBe('rtl');
  });

  it('names every locale in its own language', () => {
    expect(LOCALE_NAMES).toEqual({ ru: 'Русский', en: 'English', he: 'עברית' });
  });
});

describe('missing-key check', () => {
  it('has a non-empty Russian reference table', () => {
    expect(referenceKeys.length).toBeGreaterThan(0);
  });

  it.each(LOCALES)('%s has exactly the reference key set', (locale: Locale) => {
    expect(Object.keys(TABLES[locale]).sort()).toEqual(referenceKeys);
  });

  it.each(LOCALES)('%s has no empty strings', (locale: Locale) => {
    for (const [key, value] of Object.entries(TABLES[locale])) {
      expect(value, `${locale}:${key}`).toMatch(/\S/);
    }
  });

  it.each(LOCALES)('%s uses the reference placeholders', (locale: Locale) => {
    const table = TABLES[locale] as Record<string, string>;
    const reference = TABLES.ru as Record<string, string>;
    // M7-15: Hebrew «שנה» and «שנתיים» carry the number in the word itself.
    const numberInWord = new Set(['he:unit.years.one', 'he:unit.years.two']);
    for (const key of referenceKeys) {
      if (numberInWord.has(`${locale}:${key}`)) {
        expect(placeholders(table[key] ?? ''), `${locale}:${key}`).toEqual([]);
        continue;
      }
      expect(placeholders(table[key] ?? ''), `${locale}:${key}`).toEqual(
        placeholders(reference[key] ?? ''),
      );
    }
  });

  it('translates English and Hebrew rather than copying Russian', () => {
    const reference = TABLES.ru as Record<string, string>;
    for (const locale of ['en', 'he'] as const) {
      const table = TABLES[locale] as Record<string, string>;
      const copied = referenceKeys.filter(
        (key) => table[key] === reference[key],
      );
      expect(copied, locale).toEqual([]);
    }
  });
});

describe('translator', () => {
  it.each(LOCALES)('%s looks up its own table', (locale: Locale) => {
    const table = TABLES[locale] as Record<string, string>;
    expect(translator(locale)('view.seats')).toBe(table['view.seats']);
  });

  it('returns the key itself for an unknown key', () => {
    expect(translator('en')('missing.key.example')).toBe('missing.key.example');
  });

  it('formats number parameters for the locale', () => {
    const text = translator('en')('status.allocated', { seats: 1200 });
    expect(text).toContain('1,200');
    expect(text).not.toContain('{seats}');
  });

  it('inserts string parameters unchanged', () => {
    const text = translator('ru')('status.allocated', { seats: 'X' });
    expect(text).toContain('X');
  });
});

describe('integer formatting', () => {
  it.each(LOCALES)(
    '%s matches the platform integer format',
    (locale: Locale) => {
      expect(formatInteger(locale, 1234567)).toBe(
        new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(
          1234567,
        ),
      );
    },
  );

  it('groups English thousands with commas', () => {
    expect(formatInteger('en', 1234567)).toBe('1,234,567');
  });

  it('prints zero and negatives', () => {
    expect(formatInteger('en', 0)).toBe('0');
    expect(formatInteger('en', -5)).toBe('-5');
  });

  it.each([0.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects the non-integer %s',
    (value) => {
      expect(() => formatInteger('en', value)).toThrow(RangeError);
    },
  );
});

describe('decimal formatting', () => {
  function separator(locale: Locale): string {
    const part = new Intl.NumberFormat(locale)
      .formatToParts(1.5)
      .find((item) => item.type === 'decimal');
    return part?.value ?? '.';
  }

  it.each(LOCALES)(
    '%s groups the integer part and uses the locale separator',
    (locale: Locale) => {
      expect(formatDecimal(locale, '1234567.89')).toBe(
        `${formatInteger(locale, 1234567)}${separator(locale)}89`,
      );
    },
  );

  it('formats English and Russian examples', () => {
    expect(formatDecimal('en', '1234567.89')).toBe('1,234,567.89');
    expect(formatDecimal('ru', '38.00')).toBe('38,00');
    expect(formatDecimal('en', '38.00')).toBe('38.00');
  });

  it('keeps every fractional digit as given', () => {
    expect(formatDecimal('en', '0.1250')).toBe('0.1250');
    expect(formatDecimal('en', '7')).toBe('7');
  });

  it('formats negatives and zero', () => {
    expect(formatDecimal('en', '-0.50')).toBe('-0.50');
    expect(formatDecimal('en', '0.00')).toBe('0.00');
  });

  it('formats integers beyond the float range exactly', () => {
    expect(formatDecimal('en', '12345678901234567890.5')).toBe(
      '12,345,678,901,234,567,890.5',
    );
  });

  it.each(['', '1e5', '1,5', '.5', '5.', 'abc', '--1', ' 1'])(
    'rejects the malformed decimal %j',
    (text) => {
      expect(() => formatDecimal('en', text)).toThrow(RangeError);
    },
  );
});

describe('formatChange', () => {
  it.each(LOCALES)('signs a positive change in %s', (locale: Locale) => {
    expect(formatChange(locale, '1234.5')).toBe(
      `+${formatDecimal(locale, '1234.5')}`,
    );
    expect(formatChange(locale, '8')).toBe(`+${formatDecimal(locale, '8')}`);
  });

  it.each(LOCALES)(
    'keeps the minus of a negative change in %s',
    (locale: Locale) => {
      expect(formatChange(locale, '-75000')).toBe(
        formatDecimal(locale, '-75000'),
      );
      expect(formatChange(locale, '-75000').startsWith('-')).toBe(true);
      expect(formatChange(locale, '-0.01')).toBe(
        formatDecimal(locale, '-0.01'),
      );
    },
  );

  it.each(LOCALES)('leaves a zero change unsigned in %s', (locale: Locale) => {
    expect(formatChange(locale, '0')).toBe(formatDecimal(locale, '0'));
    expect(formatChange(locale, '0.00')).toBe(formatDecimal(locale, '0.00'));
  });

  it('groups digits like formatDecimal', () => {
    expect(formatChange('en', '1234567.25')).toBe('+1,234,567.25');
    expect(formatChange('en', '-1234567')).toBe('-1,234,567');
  });

  it('refuses text that is not a decimal', () => {
    expect(() => formatChange('en', '+5')).toThrow(RangeError);
    expect(() => formatChange('en', '1e3')).toThrow(RangeError);
    expect(() => formatChange('en', '')).toThrow(RangeError);
  });
});
