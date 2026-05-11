import type { SearchDateTarget, SearchIntent } from './searchTypes';
import {
  compactSearchText,
  hasChineseSearchSignal,
  isPureLetterToken,
  normalizeSearchText,
  tokenizeSearchQuery
} from './searchNormalize';

const getValidSearchDate = (year: number, month: number, day: number) => {
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  const monthText = String(month).padStart(2, '0');
  const dayText = String(day).padStart(2, '0');

  return {
    compact: `${year}${monthText}${dayText}`,
    shortCompact: `${String(year).slice(2)}${monthText}${dayText}`,
    monthDay: `${monthText}${dayText}`,
    year: String(year),
    month: monthText,
    yearMonth: `${year}${monthText}`,
    dayTimestamp: new Date(year, month - 1, day).getTime(),
    canonical: `${year}-${monthText}-${dayText}`
  };
};

const getDateTargetKey = (target: SearchDateTarget) =>
  [
    target.kind,
    target.compact,
    target.shortCompact,
    target.monthDay,
    target.year,
    target.month,
    target.yearMonth
  ].join(':');

const addDateTarget = (targets: SearchDateTarget[], target: SearchDateTarget) => {
  const targetKey = getDateTargetKey(target);

  if (!targets.some((currentTarget) => getDateTargetKey(currentTarget) === targetKey)) {
    targets.push(target);
  }
};

const addMonthTarget = (targets: SearchDateTarget[], month: number, year?: number) => {
  if (month < 1 || month > 12) {
    return;
  }

  const monthText = String(month).padStart(2, '0');
  const yearText =
    typeof year === 'number' && year >= 1900 && year <= 2099 ? String(year) : undefined;

  addDateTarget(targets, {
    kind: 'month',
    month: monthText,
    year: yearText,
    yearMonth: yearText ? `${yearText}${monthText}` : undefined
  });
};

const parseSearchAmount = (value: string) => {
  const normalizedValue = value
    .normalize('NFKC')
    .replace(/[,\s￥¥元]/g, '')
    .trim();

  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalizedValue)) {
    return null;
  }

  const amount = Math.abs(Number(normalizedValue));

  return Number.isFinite(amount) ? amount : null;
};

const parseSearchDateTargets = (value: string): SearchDateTarget[] => {
  const rawValue = value.trim();

  if (!rawValue || !/[\d年月日号./-]/.test(rawValue)) {
    return [];
  }

  const normalizedDateValue = rawValue
    .normalize('NFKC')
    .replace(/[年./]/g, '-')
    .replace(/月/g, '-')
    .replace(/[日号]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const digits = rawValue.replace(/\D/g, '');
  const targets: SearchDateTarget[] = [];
  const addDayTarget = (year: number, month: number, day: number) => {
    const date = getValidSearchDate(year, month, day);

    if (date) {
      addDateTarget(targets, { kind: 'day', ...date });
    }
  };
  const fullDateMatch = normalizedDateValue.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const shortDateMatch = normalizedDateValue.match(/^(\d{2})-(\d{1,2})-(\d{1,2})$/);
  const yearMonthMatch = normalizedDateValue.match(/^(\d{4})-(\d{1,2})$/);
  const monthDayMatch = normalizedDateValue.match(/^(\d{1,2})-(\d{1,2})$/);

  if (fullDateMatch) {
    addDayTarget(Number(fullDateMatch[1]), Number(fullDateMatch[2]), Number(fullDateMatch[3]));
    return targets;
  }

  if (shortDateMatch) {
    addDayTarget(
      2000 + Number(shortDateMatch[1]),
      Number(shortDateMatch[2]),
      Number(shortDateMatch[3])
    );
    return targets;
  }

  if (yearMonthMatch) {
    addMonthTarget(targets, Number(yearMonthMatch[2]), Number(yearMonthMatch[1]));
    return targets;
  }

  if (monthDayMatch) {
    const date = getValidSearchDate(
      new Date().getFullYear(),
      Number(monthDayMatch[1]),
      Number(monthDayMatch[2])
    );

    if (date) {
      addDateTarget(targets, { kind: 'month-day', monthDay: date.monthDay });
    }

    return targets;
  }

  if (digits.length === 8) {
    addDayTarget(
      Number(digits.slice(0, 4)),
      Number(digits.slice(4, 6)),
      Number(digits.slice(6, 8))
    );
  }

  if (digits.length === 6) {
    addDayTarget(
      2000 + Number(digits.slice(0, 2)),
      Number(digits.slice(2, 4)),
      Number(digits.slice(4, 6))
    );
  }

  if (digits.length === 4) {
    const monthDay = getValidSearchDate(
      new Date().getFullYear(),
      Number(digits.slice(0, 2)),
      Number(digits.slice(2, 4))
    );
    const year = Number(digits);

    if (monthDay) {
      addDateTarget(targets, { kind: 'month-day', monthDay: monthDay.monthDay });
    }

    if (year >= 1900 && year <= 2099) {
      addDateTarget(targets, { kind: 'year', year: String(year) });
    }
  }

  if (/^\d{1,2}\s*月$/.test(rawValue)) {
    addMonthTarget(targets, Number(digits));
  }

  return targets;
};

export const parseSearchIntent = (query: string): SearchIntent => ({
  query,
  terms: tokenizeSearchQuery(query).map((raw) => {
    const normalized = normalizeSearchText(raw);
    const compact = compactSearchText(raw);
    const amountValue = parseSearchAmount(raw);
    const dateTargets = parseSearchDateTargets(raw);

    return {
      raw,
      normalized,
      compact,
      isPureLetters: isPureLetterToken(raw),
      hasChinese: hasChineseSearchSignal(raw),
      isNumericIntent: amountValue !== null || dateTargets.length > 0,
      amountValue,
      dateTargets
    };
  })
});
