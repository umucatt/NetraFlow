export const ACCOUNT_MARK_MAX_CHARS = 4;
const AUTO_ACCOUNT_MARK_CHARS = 2;

export type AccountMarkLayout = 'single' | 'inline' | 'stack-2-1' | 'stack-2-2';

export type AccountMarkSource = 'custom' | 'auto';

export type AccountMarkAccount = {
  name: string;
  alias?: string;
};

export type AccountMarkDisplay = {
  text: string;
  rows: string[];
  layout: AccountMarkLayout;
  source: AccountMarkSource;
};

const takeChars = (value: string, maxChars: number) =>
  Array.from(value).slice(0, maxChars).join('');

export const limitAccountAliasInput = (value: string) =>
  takeChars(value, ACCOUNT_MARK_MAX_CHARS);

export const getEffectiveAccountAbbreviation = (input: string) =>
  limitAccountAliasInput(input.trim());

export const getAutomaticAccountMark = (accountName: string) =>
  takeChars(accountName.trim(), AUTO_ACCOUNT_MARK_CHARS) || '?';

export const getAccountDisplayMark = (account: AccountMarkAccount) => {
  const customMark = getEffectiveAccountAbbreviation(account.alias ?? '');

  return customMark || getAutomaticAccountMark(account.name);
};

export const getAccountMarkRows = (mark: string) => {
  const chars = Array.from(limitAccountAliasInput(mark));

  if (chars.length <= 2) {
    return [chars.join('') || '?'];
  }

  return [chars.slice(0, 2).join(''), chars.slice(2).join('')];
};

export const getAccountMarkLayout = (mark: string): AccountMarkLayout => {
  const length = Array.from(limitAccountAliasInput(mark)).length;

  if (length <= 1) {
    return 'single';
  }

  if (length === 2) {
    return 'inline';
  }

  if (length === 3) {
    return 'stack-2-1';
  }

  return 'stack-2-2';
};

export const getAccountMarkDisplay = (account: AccountMarkAccount): AccountMarkDisplay => {
  const customMark = getEffectiveAccountAbbreviation(account.alias ?? '');
  const text = customMark || getAutomaticAccountMark(account.name);

  return {
    text,
    rows: getAccountMarkRows(text),
    layout: getAccountMarkLayout(text),
    source: customMark ? 'custom' : 'auto'
  };
};
