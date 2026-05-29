import { roundToMoneyPrecision } from '../../money';

export const formatChartNumber = (amount: number | null, maximumFractionDigits = 2) => {
  if (amount === null || !Number.isFinite(amount)) {
    return '-';
  }

  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits
  }).format(roundToMoneyPrecision(amount));
};

export const formatChartPercent = (numerator: number, denominator: number) => {
  if (denominator <= 0) {
    return '0%';
  }

  return `${((Math.abs(numerator) / Math.abs(denominator)) * 100).toFixed(1)}%`;
};
