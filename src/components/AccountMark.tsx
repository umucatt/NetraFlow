import type { CSSProperties } from 'react';

import {
  getAccountMarkDisplay,
  type AccountMarkAccount
} from '../accountMark';

type AccountMarkProps = {
  account: AccountMarkAccount;
  className?: string;
  style?: CSSProperties;
};

function AccountMark({ account, className, style }: AccountMarkProps) {
  const mark = getAccountMarkDisplay(account);
  const classes = ['account-mark', `account-mark--${mark.layout}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span aria-hidden="true" className={classes} style={style}>
      {mark.rows.map((row, index) => (
        <span key={`${index}-${row}`}>{row}</span>
      ))}
    </span>
  );
}

export default AccountMark;
