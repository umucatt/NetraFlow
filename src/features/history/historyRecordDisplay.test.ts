/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../../../../${path}`, import.meta.url), 'utf8');

const readProjectStyles = () => {
  const stylesEntrySource = readProjectFile('src/styles.css');
  const importSources = Array.from(
    stylesEntrySource.matchAll(/^@import ['"]\.\/(.+)['"];$/gm),
    (match) => readProjectFile(`src/${match[1]}`)
  );
  const stylesEntryBody = stylesEntrySource
    .replace(/^@import ['"].+['"];\r?\n/gm, '')
    .replace(/^\r?\n/, '');

  return [...importSources, stylesEntryBody].join('\n');
};

test('account history displays use date-only labels while snapshots keep precise time', () => {
  const appSource = readProjectFile('src/App.tsx');
  const rightPanelRendererSource = readProjectFile('src/app/rightPanel/RightPanelRenderer.tsx');
  const backupListSource = readProjectFile('src/features/history/BackupRecordList.tsx');
  const searchEngineSource = readProjectFile('src/search/searchEngine.ts');

  assert.equal(appSource.includes('formatShortTime: formatHistoryRecordDate'), true);
  assert.equal(rightPanelRendererSource.includes('<SearchPreviewPanel {...search} />'), true);
  assert.equal(
    appSource.includes('return `${year}-${month}-${day} ${hour}:${minute}:${second}`;'),
    true
  );
  assert.equal(backupListSource.includes('{formatPreciseBackupTime(record.backedUpAt)}'), true);
  assert.equal(backupListSource.includes("label: '历史记录'"), true);
  assert.equal(backupListSource.includes('快照总条数'), false);
  assert.equal(
    searchEngineSource.includes('title: options.formatPreciseBackupTime(record.backedUpAt)'),
    true
  );
});

test('snapshot import records render above snapshot records with local hidden scrolling', () => {
  const historyBackupLayerSource = readProjectFile(
    'src/app/historyBackupLayer/HistoryBackupLayer.tsx'
  );
  const importListSource = readProjectFile(
    'src/features/history/SnapshotImportRecordList.tsx'
  );
  const stylesSource = readProjectStyles();

  assert.equal(importListSource.includes('<strong>快照导入记录</strong>'), true);
  assert.equal(importListSource.includes('暂无导入记录'), true);
  assert.equal(importListSource.includes('formatPreciseBackupTime(record.importedAt)} 导入'), true);
  assert.equal(importListSource.includes('快照生成于'), true);
  assert.equal(importListSource.includes('生成时间未知'), true);
  assert.equal(importListSource.includes('历史记录 {record.historyRecordCount} 条 · 实际变更'), true);
  assert.equal(importListSource.includes('VISIBLE_IMPORT_RECORD_COUNT = 2'), true);
  assert.equal(importListSource.includes('hasHiddenRecords'), true);
  assert.equal(importListSource.includes('visibleRecordHeight'), true);
  assert.equal(importListSource.includes('snapshot-import-record-frame--overflow'), true);
  assert.equal(importListSource.includes('snapshot-import-record-scroll'), true);
  assert.equal(
    historyBackupLayerSource.indexOf('<SnapshotImportRecordList') <
      historyBackupLayerSource.indexOf('<BackupRecordList'),
    true
  );
  assert.match(
    stylesSource,
    /\.snapshot-import-record-frame--overflow::after\s*\{[^}]*linear-gradient\([^}]*pointer-events: none;[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.snapshot-import-record-scroll\s*\{[^}]*overflow-y: auto;[^}]*overscroll-behavior: contain;[^}]*scrollbar-width: none;[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.snapshot-import-record-scroll::-webkit-scrollbar\s*\{[^}]*display: none;[^}]*\}/s
  );
});

test('flash write timestamps are scoped to new flash records without history migration', () => {
  const appSource = readProjectFile('src/App.tsx');
  const flashWriteLogicSource = readProjectFile(
    'src/features/flashNote/flashNoteWriteLogic.ts'
  );
  const normalizeHistorySource = appSource.slice(
    appSource.indexOf('const normalizeHistory'),
    appSource.indexOf('const getBackupFieldValue')
  );

  assert.equal(
    flashWriteLogicSource.includes(
      'createHistoryTimestampForBusinessDate(row.date, writeTime, index)'
    ),
    true
  );
  assert.equal(flashWriteLogicSource.includes('T12:00:00'), false);
  assert.equal(normalizeHistorySource.includes('createHistoryTimestampForBusinessDate'), false);
});

test('history record summary badges keep semantic placement and source markers', () => {
  const historyListSource = readProjectFile('src/features/history/HistoryRecordList.tsx');
  const stylesSource = readProjectStyles();

  assert.equal(historyListSource.includes('history-card-meta'), false);
  assert.equal(historyListSource.includes('history-meta-chip'), false);
  assert.equal(historyListSource.includes('history-card-grid'), true);
  assert.equal(historyListSource.includes('history-card-title-row'), true);
  assert.equal(historyListSource.includes('history-card-amount-row'), true);
  assert.equal(historyListSource.includes('history-card-date-row'), true);
  assert.equal(historyListSource.includes('history-card-right-cell'), true);
  assert.equal(historyListSource.includes('history-type-badge'), true);
  assert.equal(historyListSource.includes('history-delta-badge'), true);
  assert.equal(historyListSource.includes('history-count-badge'), true);
  assert.equal(historyListSource.includes("source === 'flash-note'"), true);
  assert.equal(historyListSource.includes("source === 'rollup'"), true);
  assert.equal(
    historyListSource.indexOf('history-type-badge') <
      historyListSource.indexOf('history-delta-badge'),
    true
  );
  assert.equal(
    historyListSource.indexOf('history-count-badge') <
      historyListSource.indexOf('history-flash-source'),
    true
  );

  assert.equal(stylesSource.includes('.history-badge-base'), true);
  assert.equal(stylesSource.includes('.history-type-badge'), true);
  assert.equal(stylesSource.includes('.history-delta-badge'), true);
  assert.equal(stylesSource.includes('.history-count-badge'), true);
  assert.match(
    stylesSource,
    /\.history-card-grid\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(44px, max-content\);[^}]*align-items: center;[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.history-card-right-cell\s*\{[^}]*grid-column: 2;[^}]*justify-self: end;[^}]*align-self: center;[^}]*\}/s
  );
});

test('history record notes render after dates without expanding group summaries', () => {
  const historyListSource = readProjectFile('src/features/history/HistoryRecordList.tsx');
  const stylesSource = readProjectStyles();

  assert.equal(historyListSource.includes('showNote?: boolean'), true);
  assert.equal(
    historyListSource.includes('const shouldShowNote = showNote && Boolean(record.note);'),
    true
  );
  assert.equal(historyListSource.includes('history-card-date-note'), true);
  assert.equal(historyListSource.includes('history-card-date-row'), true);
  assert.equal(historyListSource.includes('className="history-card-date"'), true);
  assert.equal(
    historyListSource.includes('className="history-card-note-inline">备注：{record.note}</span>'),
    true
  );
  assert.equal(historyListSource.includes('className="history-card-note">'), false);
  assert.equal(historyListSource.includes('showNote: false'), true);
  assert.equal(
    historyListSource.indexOf('showNote: false') <
      historyListSource.indexOf('children: expanded'),
    true
  );
  assert.match(
    stylesSource,
    /\.history-card-note-inline\s*\{[^}]*overflow: hidden;[^}]*text-overflow: ellipsis;[^}]*white-space: nowrap;[^}]*\}/s
  );
});

test('account history folded group summaries suppress source markers without reserving marker space', () => {
  const historyListSource = readProjectFile('src/features/history/HistoryRecordList.tsx');
  const contentSource = historyListSource.slice(
    historyListSource.indexOf('const renderHistoryCardContent'),
    historyListSource.indexOf('const renderHistoryCard =')
  );
  const groupSummarySource = historyListSource.slice(
    historyListSource.indexOf('renderHistoryCard(summaryRecord'),
    historyListSource.indexOf('children: expanded')
  );
  const nestedRecordSource = historyListSource.slice(
    historyListSource.indexOf('children: expanded'),
    historyListSource.indexOf(': undefined', historyListSource.indexOf('children: expanded'))
  );

  assert.equal(historyListSource.includes('showSourceMarker?: boolean'), true);
  assert.equal(historyListSource.includes('showSourceMarker = true'), true);
  assert.equal(
    historyListSource.includes('const source = showSourceMarker ? record.source : undefined;'),
    true
  );
  assert.equal(contentSource.includes("source === 'flash-note'"), true);
  assert.equal(contentSource.includes("source === 'rollup'"), true);
  assert.equal(contentSource.includes('showSourceMarker && !extraInfo && !source'), true);
  assert.equal(groupSummarySource.includes('showSourceMarker: false'), true);
  assert.equal(groupSummarySource.includes('history-flash-source'), false);
  assert.equal(groupSummarySource.includes('history-rollup-source'), false);
  assert.equal(groupSummarySource.includes('history-card-source-placeholder'), false);
  assert.equal(historyListSource.includes('records.map((record) => renderHistoryCard(record))'), true);
  assert.equal(nestedRecordSource.includes('nested: true'), true);
  assert.equal(nestedRecordSource.includes('showSourceMarker: false'), false);
});

test('global history result list drops the outer card frame while keeping record cards', () => {
  const historyListSource = readProjectFile('src/features/history/HistoryRecordList.tsx');
  const resultListSource = historyListSource.slice(
    historyListSource.indexOf('className="history-result-list-panel"')
  );

  assert.equal(historyListSource.includes('className="history-result-list-panel"'), true);
  assert.equal(historyListSource.includes('className={`history-record-card'), true);
  assert.equal(resultListSource.includes("border: '1px solid var(--border-soft)'"), false);
  assert.equal(resultListSource.includes("background: 'var(--surface-strong)'"), false);
  assert.equal(resultListSource.includes("borderRadius: 'var(--radius-section)'"), false);
  assert.equal(resultListSource.includes("padding: '12px 4px 12px 12px'"), false);
});

test('account history folded groups have a subtle group class without changing count text', () => {
  const historyListSource = readProjectFile('src/features/history/HistoryRecordList.tsx');
  const stylesSource = readProjectStyles();

  assert.equal(historyListSource.includes('history-record-card--group'), true);
  assert.equal(historyListSource.includes('history-record-card--nested'), true);
  assert.equal(historyListSource.includes('`${group.records.length}条记录`'), true);
  assert.equal(historyListSource.includes('条记录>'), false);
  assert.match(stylesSource, /\.history-record-card--group\s*\{[^}]*outline:/s);
  assert.match(stylesSource, /\.history-record-card--group::before\s*\{[^}]*width: 3px;/s);
});

test('history calendar uses density blocks instead of old record-count dots', () => {
  const calendarSource = readProjectFile('src/features/history/HistoryCalendarPanel.tsx');
  const calendarLogicSource = readProjectFile('src/features/history/historyCalendarLogic.ts');
  const stylesSource = readProjectStyles();

  assert.equal(calendarSource.includes('history-calendar-day__density'), true);
  assert.equal(calendarSource.includes('history-calendar-day__dots'), false);
  assert.equal(calendarSource.includes('dotCount'), false);
  assert.equal(calendarLogicSource.includes('getHistoryRecordDensityLevel'), true);
  assert.equal(stylesSource.includes('.history-calendar-day__density'), true);
  assert.equal(stylesSource.includes('.history-calendar-day__dots'), false);
  assert.equal(stylesSource.includes('--history-density-fill'), true);
  assert.equal(stylesSource.includes('--history-density-track-color: color-mix(in srgb, var(--accent-bg) 42%, transparent);'), true);
  assert.equal(stylesSource.includes('--history-density-fill-color: color-mix(in srgb, var(--accent-text) 52%, transparent);'), true);
  assert.match(
    stylesSource,
    /\.history-calendar-day__density\s*\{[^}]*bottom: 4px;[^}]*width: 18px;[^}]*height: 5px;[^}]*border-radius: var\(--radius-chip\);[^}]*\}/s
  );
  assert.equal(stylesSource.includes('--history-density-fill: 28%;'), true);
  assert.equal(stylesSource.includes('--history-density-fill: 52%;'), true);
  assert.equal(stylesSource.includes('--history-density-fill: 76%;'), true);
  assert.equal(stylesSource.includes('--history-density-fill: 100%;'), true);
});
