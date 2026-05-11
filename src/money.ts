export const MONEY_FRACTION_DIGITS = 2;

const MONEY_PRECISION_SCALE = 10 ** MONEY_FRACTION_DIGITS;
const COMPACT_MONEY_UNITS = [
  { threshold: 1_000_000_000, suffix: 'B' },
  { threshold: 1_000_000, suffix: 'M' },
  { threshold: 1_000, suffix: 'K' }
] as const;

export type MoneyFormatOptions = {
  compact?: boolean;
};

export type HomeMoneyFormatOptions = MoneyFormatOptions & {
  currency?: boolean | string;
};

export type MoneyInputOptions = {
  allowNegative?: boolean;
};

export const roundToMoneyPrecision = (value: number) => {
  if (!Number.isFinite(value)) {
    return value;
  }

  const sign = value < 0 ? -1 : 1;
  const rounded =
    (Math.round((Math.abs(value) + Number.EPSILON) * MONEY_PRECISION_SCALE) /
      MONEY_PRECISION_SCALE) *
    sign;

  return Object.is(rounded, -0) ? 0 : rounded;
};

const formatPlainMoneyNumber = (value: number) =>
  new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: MONEY_FRACTION_DIGITS
  }).format(roundToMoneyPrecision(value));

export const formatCompactMoneyValue = (value: number) => {
  const roundedValue = roundToMoneyPrecision(value);
  const sign = roundedValue < 0 ? '-' : '';
  const absoluteValue = Math.abs(roundedValue);
  const unit = COMPACT_MONEY_UNITS.find((item) => absoluteValue >= item.threshold);

  if (!unit) {
    return `${sign}${formatPlainMoneyNumber(absoluteValue)}`;
  }

  const compactValue = roundToMoneyPrecision(absoluteValue / unit.threshold).toFixed(
    MONEY_FRACTION_DIGITS
  );

  return `${sign}${compactValue}${unit.suffix}`;
};

export const formatMoneyValue = (
  value: number | null,
  options: MoneyFormatOptions = {}
) => {
  if (value === null || !Number.isFinite(value)) {
    return '-';
  }

  return options.compact ? formatCompactMoneyValue(value) : formatPlainMoneyNumber(value);
};

const getCurrencySymbol = (currency: string) =>
  new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0
  })
    .formatToParts(0)
    .find((part) => part.type === 'currency')?.value ?? currency;

export const formatCurrencyMoneyValue = (
  value: number | null,
  options: MoneyFormatOptions & { currency?: string } = {}
) => {
  if (value === null || !Number.isFinite(value)) {
    return '-';
  }

  const currency = options.currency ?? 'CNY';
  const roundedValue = roundToMoneyPrecision(value);

  if (options.compact) {
    const sign = roundedValue < 0 ? '-' : '';
    return `${sign}${getCurrencySymbol(currency)}${formatCompactMoneyValue(Math.abs(roundedValue))}`;
  }

  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    maximumFractionDigits: MONEY_FRACTION_DIGITS
  }).format(roundedValue);
};

const roundToHomeMoneyInteger = (value: number) => {
  if (!Number.isFinite(value)) {
    return value;
  }

  const sign = value < 0 ? -1 : 1;
  const rounded = Math.round(Math.abs(value) + Number.EPSILON) * sign;

  return Object.is(rounded, -0) ? 0 : rounded;
};

export const formatHomeMoney = (
  value: number | null,
  options: HomeMoneyFormatOptions = {}
) => {
  if (value === null || !Number.isFinite(value)) {
    return '-';
  }

  const currencyOption = options.currency;
  const shouldShowCurrency = currencyOption !== false;

  if (options.compact) {
    const roundedValue = roundToMoneyPrecision(value);
    const sign = roundedValue < 0 ? '-' : '';
    const compactValue = formatCompactMoneyValue(Math.abs(roundedValue));

    if (!shouldShowCurrency) {
      return `${sign}${compactValue}`;
    }

    const currency = typeof currencyOption === 'string' ? currencyOption : 'CNY';
    return `${sign}${getCurrencySymbol(currency)}${compactValue}`;
  }

  const roundedValue = roundToHomeMoneyInteger(value);

  if (!shouldShowCurrency) {
    return new Intl.NumberFormat('zh-CN', {
      maximumFractionDigits: 0
    }).format(roundedValue);
  }

  const currency = typeof currencyOption === 'string' ? currencyOption : 'CNY';

  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(roundedValue);
};

export const normalizeMoneyInput = (
  value: string,
  options: MoneyInputOptions = {}
) => {
  const allowNegative = options.allowNegative === true;
  const isNegative = allowNegative && value.trimStart().startsWith('-');
  const sanitizedValue = value.replace(/-/g, '').replace(/[^\d.]/g, '');
  const decimalIndex = sanitizedValue.indexOf('.');

  if (decimalIndex < 0) {
    return `${isNegative ? '-' : ''}${sanitizedValue}`;
  }

  const integerPart = sanitizedValue.slice(0, decimalIndex);
  const decimalPart = sanitizedValue
    .slice(decimalIndex + 1)
    .replace(/\./g, '')
    .slice(0, MONEY_FRACTION_DIGITS);

  return `${isNegative ? '-' : ''}${integerPart}.${decimalPart}`;
};

export const isMoneyInput = (value: string, options: MoneyInputOptions = {}) => {
  const pattern =
    options.allowNegative === true
      ? /^-?\d*(?:\.\d{0,2})?$/
      : /^\d*(?:\.\d{0,2})?$/;

  return value === '' || (options.allowNegative === true && value === '-') || pattern.test(value);
};

export const parseMoneyInput = (
  value: string,
  options: MoneyInputOptions = {}
) => {
  const trimmedValue = value.trim();

  if (
    !trimmedValue ||
    trimmedValue === '-' ||
    trimmedValue === '.' ||
    trimmedValue === '-.'
  ) {
    return null;
  }

  const normalizedValue = normalizeMoneyInput(trimmedValue, options);

  if (!isMoneyInput(normalizedValue, options)) {
    return null;
  }

  const amount = Number(normalizedValue);
  return Number.isFinite(amount) ? roundToMoneyPrecision(amount) : null;
};

export const formatMoneyInputValue = (value: number) =>
  new Intl.NumberFormat('en-US', {
    useGrouping: false,
    maximumFractionDigits: MONEY_FRACTION_DIGITS
  }).format(roundToMoneyPrecision(value));
