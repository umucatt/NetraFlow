import type { AccountTypeNature } from './types';

export const isPositiveNature = (nature: AccountTypeNature) =>
  nature === 'asset' || nature === 'receivable';

export const toStoredAmountByNature = (nature: AccountTypeNature, amount: number) =>
  nature === 'liability' ? -Math.abs(amount) : Math.abs(amount);

export const getLegacyNature = (groupName: string): AccountTypeNature =>
  groupName === '负债' ? 'liability' : 'asset';
