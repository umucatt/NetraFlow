/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import QuickEntryAccountPicker from './QuickEntryAccountPicker';
import {
  getQuickEntryAccountNameTooltipContent,
  isQuickEntryAccountNameOverflowing
} from './quickEntryAccountNameOverflow';

const createMeasuredText = (
  scrollWidth: number,
  clientWidth: number
) => ({
  scrollWidth,
  clientWidth
});

const readProjectSource = (path: string) =>
  readFileSync(new URL(`../../../../${path}`, import.meta.url), 'utf8');

test('quick entry account name tooltip is disabled when rendered text is not overflowing', () => {
  const element = createMeasuredText(88, 120);

  assert.equal(isQuickEntryAccountNameOverflowing(element), false);
  assert.equal(getQuickEntryAccountNameTooltipContent('日常现金账户', element), undefined);
});

test('quick entry account name tooltip uses the full name when rendered text is overflowing', () => {
  const element = createMeasuredText(121, 120);

  assert.equal(isQuickEntryAccountNameOverflowing(element), true);
  assert.equal(
    getQuickEntryAccountNameTooltipContent('工资卡-招商银行', element),
    '工资卡-招商银行'
  );
});

test('quick entry account name tooltip is based on DOM width instead of character length', () => {
  const longNameThatFits = '很长很长但实际宽度足够显示的账户名称';
  const shortNameThatOverflows = '现金';

  assert.equal(
    getQuickEntryAccountNameTooltipContent(longNameThatFits, createMeasuredText(160, 160)),
    undefined
  );
  assert.equal(
    getQuickEntryAccountNameTooltipContent(shortNameThatOverflows, createMeasuredText(42, 20)),
    '现金'
  );
});

test('quick entry account name tooltip follows width changes in both directions', () => {
  const element = createMeasuredText(100, 120);

  assert.equal(getQuickEntryAccountNameTooltipContent('备用金账户', element), undefined);

  element.clientWidth = 80;
  assert.equal(getQuickEntryAccountNameTooltipContent('备用金账户', element), '备用金账户');

  element.clientWidth = 140;
  assert.equal(getQuickEntryAccountNameTooltipContent('备用金账户', element), undefined);
});

test('quick entry account picker does not emit native title before DOM overflow is measured', () => {
  const html = renderToStaticMarkup(
    React.createElement(QuickEntryAccountPicker, {
      groups: [
        {
          id: 'cash',
          name: '现金',
          accounts: [
            {
              id: 'cash-daily',
              name: '日常现金账户',
              groupId: 'cash',
              groupName: '现金'
            }
          ]
        }
      ],
      selectedAccountId: 'cash-daily',
      onChooseAccount: () => {}
    })
  );

  assert.equal(html.includes('title='), false);
  assert.equal(html.includes('nf-tooltip-trigger'), true);
  assert.equal(html.includes('quick-single-entry-account-picker'), true);
  assert.equal(html.includes('日常现金账户'), true);
});

test('quick entry account chip keeps the existing single-line ellipsis styles', () => {
  const stylesSource = readProjectSource('src/styles.css');
  const accountNameStyleBlock =
    stylesSource.match(/\.flash-note-account-chip span\s*\{[^}]*\}/s)?.[0] ?? '';
  const quickEntryAccountNameStyleBlock =
    stylesSource.match(/\.quick-single-entry-account-picker \.flash-note-account-chip span\s*\{[^}]*\}/s)
      ?.[0] ?? '';

  assert.match(accountNameStyleBlock, /overflow: hidden;/);
  assert.match(accountNameStyleBlock, /text-overflow: ellipsis;/);
  assert.match(accountNameStyleBlock, /white-space: nowrap;/);
  assert.match(quickEntryAccountNameStyleBlock, /min-width: 0;/);
  assert.match(quickEntryAccountNameStyleBlock, /width: 100%;/);
});

test('quick entry account picker updates conditional NetraFlow tooltip from rendered width changes', () => {
  const pickerSource = readProjectSource('src/features/quickEntry/QuickEntryAccountPicker.tsx');

  assert.equal(pickerSource.includes('NfTooltip'), true);
  assert.equal(
    pickerSource.includes(
      'getQuickEntryAccountNameTooltipContent(account.name, accountNameRef.current)'
    ),
    true
  );
  assert.equal(pickerSource.includes('content={accountNameTooltipContent}'), true);
  assert.equal(pickerSource.includes('disabled={!accountNameTooltipContent}'), true);
  assert.equal(pickerSource.includes('title='), false);
  assert.equal(pickerSource.includes('new ResizeObserver(updateAccountNameTooltipContent)'), true);
  assert.equal(
    pickerSource.includes("window.addEventListener('resize', updateAccountNameTooltipContent)"),
    true
  );
});
