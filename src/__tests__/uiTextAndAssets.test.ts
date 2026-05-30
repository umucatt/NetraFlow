/// <reference types="node" />

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

const GITHUB_RELEASES_URL = 'https://github.com/umucatt/NetraFlow/releases';

test('global settings chart labels keep only the intended chart controls', () => {
  const appSource = readProjectFile('src/App.tsx');

  assert.equal(appSource.includes('功能跳转'), false);
  assert.equal(appSource.includes('L0图表'), false);
  assert.equal(appSource.includes('账户占比显示'), false);
  assert.equal(appSource.includes('账户趋势显示'), false);
  assert.equal(appSource.includes('首页缩略图表'), true);
  assert.equal(appSource.includes('资产结构显示'), true);
  assert.equal(appSource.includes('资产趋势显示'), true);
});

test('global settings security and about copy match the current release text', () => {
  const appSource = readProjectFile('src/App.tsx');
  const aboutPanelSource = readProjectFile('src/features/settings/AboutNetraFlowPanel.tsx');
  const packageJson = JSON.parse(readProjectFile('package.json')) as { version?: string };
  const packageLockJson = JSON.parse(readProjectFile('package-lock.json')) as {
    version?: string;
    packages?: Record<string, { version?: string }>;
  };

  assert.equal(appSource.includes('是否开启登陆密码保护'), true);
  assert.equal(packageJson.version, '0.9.2');
  assert.equal(packageLockJson.version, '0.9.2');
  assert.equal(packageLockJson.packages?.['']?.version, '0.9.2');
  assert.equal(appSource.includes('APP_VERSION'), true);
  assert.equal(appSource.includes('0.9.1'), false);
  assert.equal(aboutPanelSource.includes('获取信息'), true);
  assert.equal(appSource.includes(GITHUB_RELEASES_URL), true);
  assert.equal(`${appSource}\n${aboutPanelSource}`.includes('联系我'), false);
  assert.equal(`${appSource}\n${aboutPanelSource}`.includes('碎碎念'), false);
  assert.equal(`${appSource}\n${aboutPanelSource}`.includes('最后，也是很重要的一点'), false);
});

test('page surfaces and right panel page frames stay scoped', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const searchPreviewPanelSource = readProjectFile('src/components/search/SearchPreviewPanel.tsx');
  const accountActionsSource = readProjectFile('src/features/account/AccountActionsPanel.tsx');
  const dangerActionsSource = readProjectFile('src/features/account/AccountDangerActionsPanel.tsx');
  const globalSettingsPageSource = appSource.slice(
    appSource.indexOf('const renderGlobalSettingsPage'),
    appSource.indexOf('const renderGlobalSettingsNavigation')
  );
  const mainPanelSource = appSource.slice(
    appSource.indexOf('const isSecuritySettingsPageDisabled'),
    appSource.indexOf('{isFlashNoteOpen ? null : (')
  );
  const historyActionsSource = appSource.slice(
    appSource.indexOf('const renderHistoryActions'),
    appSource.indexOf('const renderSnapshotActions')
  );
  const snapshotActionsSource = appSource.slice(
    appSource.indexOf('const renderSnapshotActions'),
    appSource.indexOf('const renderArchivedActions')
  );
  const globalSettingsNavSource = appSource.slice(
    appSource.indexOf('const renderGlobalSettingsNavigation'),
    appSource.indexOf('const getRollupRiskLabel')
  );
  const rollupActionsSource = appSource.slice(
    appSource.indexOf('const renderRollupImportActions'),
    appSource.indexOf('const renderHomeActions')
  );
  const homeActionsSource = appSource.slice(
    appSource.indexOf('const renderHomeActions'),
    appSource.indexOf('const renderPasswordDisableConfirm')
  );
  const cardBlock = stylesSource.match(/\.card\s*\{[^}]*\}/s)?.[0] ?? '';
  const rightActionPanelBlocks = Array.from(
    stylesSource.matchAll(/\.right-action-panel\s*\{[^}]*\}/gs),
    (match) => match[0]
  ).join('\n');
  const layerPanelBlock = stylesSource.slice(
    stylesSource.indexOf('.layout-layer--left > section,'),
    stylesSource.indexOf('.layout-layer--search .search-panel')
  );
  const modalBackdropBlock = stylesSource.match(/\.modal-backdrop\s*\{[^}]*\}/s)?.[0] ?? '';
  const disabledLeftPageBlock =
    stylesSource.match(/\.left-browse-panel\.example-mode-disabled-panel\s*\{[^}]*\}/s)?.[0] ??
    '';

  assert.equal(mainPanelSource.includes("globalSettingsSection === 'security' && isExampleMode"), true);
  assert.equal(
    mainPanelSource.includes('example-mode-disabled-panel example-mode-disabled-panel--left-page'),
    true
  );
  assert.equal(globalSettingsPageSource.includes('example-mode-disabled-panel'), false);
  assert.equal(
    mainPanelSource.indexOf('renderGlobalSettingsPage()') <
      mainPanelSource.indexOf('example-mode-disabled-panel__banner'),
    true
  );
  assert.match(disabledLeftPageBlock, /border-radius: var\(--radius-page\);/);

  assert.equal(homeActionsSource.includes('renderRightPanelPage('), true);
  assert.equal(historyActionsSource.includes('renderRightPanelPage('), true);
  assert.equal(snapshotActionsSource.includes('right-panel-page right-panel-page--snapshot'), true);
  assert.equal(snapshotActionsSource.includes('right-panel-spacer'), false);
  assert.equal(snapshotActionsSource.includes('返回历史记录'), true);
  assert.equal(appSource.includes(['backup', 'Rem', 'inderPrompt'].join('')), false);
  [
    '\u5feb\u7167\u63d0\u9192',
    '\u63d0\u9192\u5468\u671f',
    '\u66f4\u6539\u63d0\u9192\u5468\u671f'
  ].forEach((removedText) => assert.equal(appSource.includes(removedText), false));
  assert.equal(globalSettingsNavSource.includes('renderRightPanelPage('), true);
  assert.equal(rollupActionsSource.includes('right-panel-page--rollup-import-actions'), true);
  assert.equal(searchPreviewPanelSource.includes('right-panel-page--search-preview'), true);
  assert.equal(searchPreviewPanelSource.includes('RightPanelSection'), false);
  assert.equal(accountActionsSource.includes('RightPanelSection'), false);
  assert.equal(dangerActionsSource.includes('RightPanelSection'), false);

  assert.equal(stylesSource.includes('--panel-bg: rgba('), false);
  assert.equal(stylesSource.includes('--surface-bg: rgba('), false);
  assert.equal(cardBlock.includes('backdrop-filter'), false);
  assert.equal(rightActionPanelBlocks.includes('backdrop-filter'), false);
  assert.equal(layerPanelBlock.includes('backdrop-filter'), false);
  assert.equal(layerPanelBlock.includes('background: var(--panel-bg) !important;'), true);
  assert.equal(modalBackdropBlock.includes('backdrop-filter'), true);
});

test('about GitHub link uses the shared external IPC allowlist without user-facing failure toast', () => {
  const appSource = readProjectFile('src/App.tsx');
  const electronMainSource = readProjectFile('electron/main.ts');
  const openGithubBlock = appSource.slice(
    appSource.indexOf('const openGithubReleases'),
    appSource.indexOf('const closeConfirmationDialog')
  );

  assert.equal(appSource.includes(`const GITHUB_RELEASES_URL = '${GITHUB_RELEASES_URL}'`), true);
  assert.equal(openGithubBlock.includes('openExternalInfoLink('), true);
  assert.equal(openGithubBlock.includes('GITHUB_RELEASES_URL'), true);
  assert.equal(openGithubBlock.includes('Failed to open GitHub releases.'), true);
  assert.equal(openGithubBlock.includes('window.open'), false);
  assert.equal(openGithubBlock.includes('location.href'), false);
  assert.equal(appSource.includes('showToast(errorMessage'), false);

  assert.equal(electronMainSource.includes(`const GITHUB_RELEASES_URL = '${GITHUB_RELEASES_URL}'`), true);
  assert.equal(electronMainSource.includes('ALLOWED_GITHUB_RELEASES_HOSTS'), true);
  assert.equal(electronMainSource.includes("'github.com'"), true);
  assert.equal(electronMainSource.includes("'www.github.com'"), true);
  assert.equal(electronMainSource.includes("parsedUrl.protocol === 'https:'"), true);
  assert.equal(
    electronMainSource.includes(
      "parsedUrl.pathname.replace(/\\/$/, '') === '/umucatt/NetraFlow/releases'"
    ),
    true
  );
  assert.equal(electronMainSource.includes('await shell.openExternal(url)'), true);
  assert.equal(electronMainSource.includes('url !== BILIBILI_PROFILE_URL'), false);
});

test('home account type swatches and source icons are wired through source', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const iconIndexSource = readProjectFile('src/assets/icons/index.ts');
  const homeActionsSource = appSource.slice(
    appSource.indexOf('const renderHomeActions'),
    appSource.indexOf('const renderPasswordDisableConfirm')
  );
  const homeHeadingSource = appSource.slice(
    appSource.indexOf('className="net-worth-summary__heading"'),
    appSource.indexOf('className={`net-worth-change')
  );

  assert.equal(appSource.includes('homeGroupLegendColorByName.get(group.name)'), true);
  assert.equal(appSource.includes('account-type-legend-swatch'), true);
  assert.equal(iconIndexSource.includes('nf-action-add.svg?raw'), true);
  assert.equal(iconIndexSource.includes('nf-rollup-source-wide.svg?raw'), true);
  assert.equal(appSource.includes('className="rollup-import-source-icon"'), true);
  assert.equal(appSource.includes('className="home-action-entry__icon"'), true);
  assert.equal(homeActionsSource.includes('home-example-mode-badge'), true);
  assert.equal(homeActionsSource.includes('titleAccessory'), false);
  assert.equal(homeActionsSource.includes("isExampleMode ? <div className=\"home-example-mode-badge\">示例模式</div> : null"), true);
  assert.equal(homeHeadingSource.includes('示例模式'), false);
  assert.equal(stylesSource.includes('--nf-control-height: 40px;'), true);
  assert.equal(stylesSource.includes('--right-panel-action-height: var(--nf-control-height);'), true);
  assert.equal(stylesSource.includes('--right-panel-action-gap: var(--nf-control-gap);'), true);
  assert.match(stylesSource, /\.right-panel-title-row\s*\{[^}]*align-items: center;[^}]*justify-content: space-between;[^}]*\}/s);
  assert.match(stylesSource, /\.right-panel-action\s*\{[^}]*min-height: var\(--right-panel-action-height\);[^}]*padding: 0 13px;[^}]*align-content: center;[^}]*\}/s);
  assert.match(stylesSource, /\.home-example-mode-badge\s*\{[^}]*justify-self: end;[^}]*\}/s);
  assert.match(stylesSource, /\.home-action-entry__icon\s*\{[^}]*width: 28px;[^}]*height: 28px;[^}]*align-items: center;[^}]*justify-content: center;[^}]*\}/s);
  assert.equal(existsSync(new URL('../../../src/assets/icons/common/nf-action-add.svg', import.meta.url)), true);
  assert.equal(existsSync(new URL('../../../src/assets/icons/source/nf-rollup-source-wide.svg', import.meta.url)), true);
});

test('chart visual text selection rules stay scoped away from legends', () => {
  const appSource = readProjectFile('src/App.tsx');
  const allocationPanelSource = readProjectFile('src/features/charts/AssetAllocationPanel.tsx');
  const trendPanelSource = readProjectFile('src/features/charts/AssetTrendPanel.tsx');
  const legendSource = readProjectFile('src/features/charts/ChartLegendList.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const chartSource = [appSource, allocationPanelSource, trendPanelSource].join('\n');
  const svgTextNodeCount = chartSource.match(/<text(?:\s|>)/g)?.length ?? 0;
  const chartSvgTextClassCount = chartSource.match(/chart-svg-text/g)?.length ?? 0;

  assert.match(
    stylesSource,
    /\.chart-visual-text,\s*\.chart-visual-text \*\s*\{[^}]*user-select: none;[^}]*-webkit-user-select: none;[^}]*cursor: default;[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.chart-svg-text\s*\{[^}]*user-select: none;[^}]*-webkit-user-select: none;[^}]*cursor: default;[^}]*pointer-events: none;[^}]*\}/s
  );
  assert.equal(svgTextNodeCount, chartSvgTextClassCount);
  assert.equal(legendSource.includes('chart-visual-text'), false);
  assert.equal(legendSource.includes('chart-svg-text'), false);
});

test('rollup prompt display stays selectable without touching paste input', () => {
  const promptPanelSource = readProjectFile('src/features/rollupImport/RollupPromptPanel.tsx');
  const dropzoneSource = readProjectFile('src/features/rollupImport/RollupImportDropzone.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const promptDisplayBlock = stylesSource.match(/\.rollup-prompt-display,\s*\.rollup-prompt-display \*\s*\{[^}]*\}/s)?.[0] ?? '';

  assert.match(
    stylesSource,
    /\.rollup-prompt-display,\s*\.rollup-prompt-display \*\s*\{[^}]*user-select: text;[^}]*-webkit-user-select: text;[^}]*cursor: text;[^}]*\}/s
  );
  assert.equal(promptDisplayBlock.includes('pointer-events'), false);
  assert.equal(promptPanelSource.includes('className="rollup-import-display rollup-prompt-display"'), true);
  assert.equal(dropzoneSource.includes('className="rollup-import-textarea"'), true);
  assert.equal(dropzoneSource.includes('rollup-import-textarea rollup-prompt-display'), false);
});

test('app-wide selection is disabled except editable and copyable text areas', () => {
  const stylesSource = readProjectFile('src/styles.css');
  const bodyBlock = stylesSource.match(/body\s*\{[^}]*\}/s)?.[0] ?? '';
  const selectableBlock =
    stylesSource.match(
      /input,\s*textarea,\s*select,\s*pre,\s*code,\s*\[contenteditable\]:not\(\[contenteditable="false"\]\),\s*\[data-selectable-text="true"\],\s*\[data-copyable-text="true"\],\s*\.rollup-import-display,\s*\.rollup-import-display \*\s*\{[^}]*\}/s
    )?.[0] ?? '';

  assert.equal(bodyBlock.includes('user-select: none;'), true);
  assert.equal(bodyBlock.includes('-webkit-user-select: none;'), true);
  assert.equal(bodyBlock.includes('pointer-events'), false);
  assert.equal(selectableBlock.includes('user-select: text;'), true);
  assert.equal(selectableBlock.includes('-webkit-user-select: text;'), true);
  assert.equal(selectableBlock.includes('pointer-events'), false);
});

test('rollup import page copy, confirmation layout, and account picker use current UI contract', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const rollupLogicSource = readProjectFile('src/rollupImportLogic.ts');
  const rollupPageSource = [
    readProjectFile('src/features/rollupImport/RollupImportPage.tsx'),
    readProjectFile('src/features/rollupImport/RollupPromptPanel.tsx'),
    readProjectFile('src/features/rollupImport/RollupImportDropzone.tsx'),
    readProjectFile('src/features/rollupImport/RollupRiskSummary.tsx'),
    readProjectFile('src/features/rollupImport/RollupReviewPanel.tsx'),
    readProjectFile('src/features/rollupImport/RollupAccountAssignmentList.tsx'),
    readProjectFile('src/features/rollupImport/RollupRecordGroupList.tsx')
  ].join('\n');
  const rollupActionsSource = appSource.slice(
    appSource.indexOf('const renderRollupImportActions'),
    appSource.indexOf('const renderHomeActions')
  );

  assert.equal(rollupPageSource.includes('<p className="eyebrow">汇总导入</p>'), false);
  assert.equal(rollupPageSource.includes('<h1>汇总记录导入</h1>'), true);
  assert.equal(rollupActionsSource.includes("'操作区'"), false);
  assert.equal(rollupActionsSource.includes("'汇总导入'"), true);
  assert.equal(
    rollupActionsSource.match(/null,\s*'right-panel-page--rollup-import-actions'/g)?.length ?? 0,
    2
  );
  assert.equal(
    appSource.includes('NetraFlow 不会连接外部平台，也不会导入原始账单明细，只接收你手动导入的汇总处理结果'),
    false
  );
  assert.equal(appSource.includes('提示词解释：面向使用者的说明，帮助你了解如何准备材料与使用外部工具。'), false);
  assert.equal(appSource.includes('提示词：面向外部 AI 的任务说明，用于生成 NetraFlow 可导入的汇总 JSON。'), false);
  assert.equal(appSource.includes('NetraFlow 不内置 AI 或识别模型，也不会连接外部平台。'), false);
  assert.equal(
    appSource.includes('风险等级只表示 NetraFlow 是否发现明显格式或结构问题，不代表外部整理结果已经被证明正确。'),
    false
  );
  assert.equal(appSource.includes('高风险汇总导入'), false);
  assert.equal(rollupLogicSource.includes('这个汇总文件内容已经导入过。'), false);
  assert.equal(rollupPageSource.includes('<span>mode</span>'), false);
  assert.equal(rollupPageSource.includes('<span>模式</span>'), true);
  assert.equal(rollupPageSource.includes('className="rollup-account-chip-group"'), true);
  assert.equal(rollupPageSource.includes('className={`rollup-account-chip'), true);
  assert.equal(rollupPageSource.includes('<AccountMark account={account} className="account-mark--flash" />'), true);
  assert.equal(rollupPageSource.includes('<select'), false);
  assert.match(stylesSource, /\.rollup-import-confirm-panel\s*\{[^}]*grid-auto-rows: max-content;[^}]*align-content: start;[^}]*\}/s);
  assert.match(stylesSource, /\.rollup-record-row strong\s*\{[^}]*justify-self: start;[^}]*text-align: left;[^}]*\}/s);
  assert.equal(stylesSource.includes('.rollup-account-chip-group + .rollup-account-chip-group'), true);
});

test('overview return entries stay wired from about and rollup import', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const globalNavSource = appSource.slice(
    appSource.indexOf('const GLOBAL_SETTINGS_NAV_ITEMS'),
    appSource.indexOf('const getRollupRiskLabel')
  );
  const rollupActionsSource = appSource.slice(
    appSource.indexOf('const renderRollupImportActions'),
    appSource.indexOf('const renderHomeActions')
  );
  const rollupReviewPanelSource = readProjectFile('src/features/rollupImport/RollupReviewPanel.tsx');

  assert.equal(globalNavSource.includes('关于净流'), true);
  assert.equal(globalNavSource.includes('global-settings-nav__return'), true);
  assert.equal(globalNavSource.indexOf('关于净流') < globalNavSource.indexOf('返回资产总览'), true);
  assert.equal(globalNavSource.includes('onClick={closeGlobalSettings}'), true);
  assert.equal(rollupActionsSource.match(/label: '返回资产总览'/g)?.length ?? 0, 1);
  assert.equal(rollupReviewPanelSource.includes('label="返回资产总览"'), true);
  assert.equal(rollupActionsSource.includes('onClick: closeRollupImport'), true);
  assert.equal(rollupActionsSource.includes('onClose={closeRollupImport}'), true);
  assert.equal(stylesSource.includes('right-panel-page--rollup-import-actions'), true);
});

test('global search includes manual settings category without old result containers', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const searchTypesSource = readProjectFile('src/search/searchTypes.ts');
  const searchPanelSource = readProjectFile('src/components/search/GlobalSearchPanel.tsx');
  const searchPreviewPanelSource = readProjectFile('src/components/search/SearchPreviewPanel.tsx');
  const searchTabsSource = readProjectFile('src/components/search/SearchCategoryTabs.tsx');
  const searchItemSource = readProjectFile('src/components/search/SearchResultItem.tsx');
  const searchListSource = readProjectFile('src/components/search/SearchResultList.tsx');
  const searchCategoriesBlock = stylesSource.match(/\.search-categories\s*\{[^}]*\}/s)?.[0] ?? '';

  assert.equal(
    searchPanelSource.includes('placeholder="搜索账户、历史记录、快照或设置项"'),
    true
  );
  assert.match(
    searchTypesSource,
    /SEARCH_CATEGORY_TABS[\s\S]*'all'[\s\S]*'account'[\s\S]*'history'[\s\S]*'snapshot'[\s\S]*'settings'/
  );
  assert.equal(searchTypesSource.includes("settings: '设置项'"), true);
  assert.equal(searchTypesSource.includes("export const SEARCH_RESULT_CATEGORIES"), true);
  assert.equal(appSource.includes('settingsItems: GLOBAL_SETTINGS_SEARCH_ITEMS'), true);
  assert.equal(appSource.includes("if (target.category === 'settings')"), true);
  assert.equal(appSource.includes('setGlobalSettingsSection(nextSection)'), true);
  assert.equal(appSource.includes('setIsGlobalSettingsOpen(true)'), true);
  assert.equal(
    searchTabsSource.includes('className="search-categories segmented-control global-search-filter-tabs"'),
    true
  );
  assert.equal(searchTabsSource.includes('global-search-filter-tab__label'), true);
  assert.equal(searchTabsSource.includes(' is-selected search-category-tab--active'), true);
  assert.match(searchCategoriesBlock, /display:\s*flex/);
  assert.match(searchCategoriesBlock, /align-items:\s*center/);
  assert.equal(searchCategoriesBlock.includes('overflow-x: auto'), false);
  assert.match(stylesSource, /\.search-category-tab\s*\{[^}]*white-space: nowrap;[^}]*\}/s);
  assert.match(
    stylesSource,
    /\.search-category-tab__label,\s*\.global-search-filter-tab__label\s*\{[^}]*white-space: nowrap;[^}]*word-break: keep-all;[^}]*\}/s
  );
  assert.equal(stylesSource.includes('--global-search-input-height'), true);
  assert.match(
    stylesSource,
    /\.search-field\s*\{[^}]*height: var\(--global-search-input-height\);[^}]*min-height: var\(--global-search-input-height\);[^}]*max-height: var\(--global-search-input-height\);[^}]*\}/s
  );
  assert.equal(stylesSource.includes('--global-search-input-height: var(--nf-control-height);'), true);
  assert.equal(appSource.includes(['显示', '全部分类'].join('')), false);
  assert.equal(
    appSource.includes(['在左侧输入关键词后，', '这里会显示当前结果摘要。'].join('')),
    false
  );
  assert.equal(appSource.includes('<SearchPreviewPanel'), true);
  assert.equal(searchPreviewPanelSource.includes('键入关键词开始搜索'), true);
  assert.equal(searchPreviewPanelSource.includes('暂无预览项'), true);
  assert.equal(searchPreviewPanelSource.includes('global-search-preview-empty'), true);
  assert.equal(
    searchPreviewPanelSource.match(/className="right-panel-preview right-panel-preview--search-empty"/g)?.length ?? 0,
    2
  );
  assert.equal(searchPreviewPanelSource.includes('right-panel-preview--search-empty'), true);
  assert.match(
    stylesSource,
    /\.global-search-preview-empty\s*\{[^}]*font-size: 0\.9em;[^}]*color: var\(--text-subtle\);[^}]*font-weight: 400;[^}]*\}/s
  );
  assert.equal(appSource.includes(['按现有搜索跳转逻辑', '定位当前结果'].join('')), false);
  assert.equal(searchItemSource.includes("history: '记录'"), true);
  assert.equal(searchItemSource.includes("snapshot: '快照'"), true);
  assert.equal(searchItemSource.includes("settings: '设置'"), true);
  assert.equal(searchItemSource.includes("settings: '设置项'"), false);
  assert.equal(searchItemSource.includes('search-result-mark--icon'), false);
  assert.match(stylesSource, /\.search-results\s*\{[^}]*grid-auto-rows: max-content;[^}]*align-content: start;[^}]*\}/s);
  assert.match(stylesSource, /\.search-section__list\s*\{[^}]*grid-auto-rows: max-content;[^}]*align-content: start;[^}]*\}/s);
  assert.match(stylesSource, /\.search-result-button\s*\{[^}]*align-self: start;[^}]*min-height: 60px;[^}]*\}/s);
  assert.equal(searchListSource.includes('AssetStructurePanel'), false);
  assert.equal(searchListSource.includes('AssetTrendPanel'), false);
  assert.equal(searchListSource.includes('l0-chart'), false);
  const searchPreviewSource = searchPreviewPanelSource;
  assert.equal(searchPreviewSource.includes("return '历史记录';"), true);
  assert.equal(searchPreviewSource.includes('const getHistoryPreviewTypeModeLabel'), true);
  assert.equal(searchPreviewSource.includes('return `${result.record.type}-${mode}`;'), true);
  assert.equal(searchPreviewSource.includes("return '手动';"), true);
  assert.equal(searchPreviewSource.includes("result.category === 'history'"), true);
  assert.equal(searchPreviewSource.includes("if (result.category === 'settings')"), true);
  assert.equal(searchPreviewSource.includes('return <p>{result.subtitle}</p>;'), true);
  assert.equal(
    searchPreviewSource.indexOf('<span>来源</span>') <
      searchPreviewSource.indexOf('<span>备注</span>'),
    true
  );
  assert.equal(
    searchPreviewSource.indexOf("if (result.category === 'settings')") <
      searchPreviewSource.indexOf('return <p>{result.subtitle}</p>;'),
    true
  );
});

test('theme bootstrap resolves first frame before React mounts', () => {
  const appSource = readProjectFile('src/App.tsx');
  const indexSource = readProjectFile('index.html');
  const bootstrapSource = indexSource.slice(
    indexSource.indexOf('(function ()'),
    indexSource.indexOf('</script>')
  );

  assert.equal(appSource.includes("themeMode: 'system'"), true);
  assert.equal(indexSource.indexOf('<script>') < indexSource.indexOf('<script type="module"'), true);
  assert.equal(
    indexSource.indexOf("window.localStorage.getItem('netraflowGlobalSettings')") <
      indexSource.indexOf('src="/src/main.tsx"'),
    true
  );
  assert.equal(bootstrapSource.includes("var themeMode = 'system';"), true);
  assert.equal(bootstrapSource.includes("window.matchMedia('(prefers-color-scheme: dark)').matches"), true);
  assert.equal(bootstrapSource.includes("parsedSettings.themeMode === 'light'"), true);
  assert.equal(bootstrapSource.includes("parsedSettings.themeMode === 'dark'"), true);
  assert.equal(bootstrapSource.includes("parsedSettings.themeMode === 'system'"), true);
  assert.equal(
    bootstrapSource.includes("var resolvedTheme = themeMode === 'system' ? getSystemTheme() : themeMode;"),
    true
  );
  assert.equal(bootstrapSource.includes('document.documentElement.dataset.theme = resolvedTheme;'), true);
  assert.equal(
    bootstrapSource.includes("document.documentElement.style.setProperty('color-scheme', resolvedTheme);"),
    true
  );
});

test('page position memory copy and settings search keywords stay wired', () => {
  const appSource = readProjectFile('src/App.tsx');
  const appearanceSettingsPanelSource = readProjectFile(
    'src/features/settings/AppearanceSettingsPanel.tsx'
  );
  const pagePositionSearchItemStart = appSource.indexOf("id: 'appearance-page-position-memory'");
  const searchItemSource = appSource.slice(
    pagePositionSearchItemStart,
    appSource.indexOf("id: 'charts'", pagePositionSearchItemStart)
  );
  const settingsControlSource = appearanceSettingsPanelSource;

  assert.equal(searchItemSource.includes("group: '显示与界面'"), true);
  assert.equal(searchItemSource.includes("section: 'appearance'"), true);
  assert.equal(searchItemSource.includes("blockId: 'global-settings-page-position-memory'"), true);
  [
    '页面位置记忆',
    '全局记忆',
    '覆盖后重置',
    '滚动位置',
    '堆叠组状态',
    '切换页面',
    '页面被覆盖'
  ].forEach((keyword) => {
    assert.equal(searchItemSource.includes(`'${keyword}'`), true);
  });
  assert.equal(settingsControlSource.includes('全局记忆：切换页面保留滚动位置和堆叠组状态'), true);
  assert.equal(settingsControlSource.includes('覆盖后重置：页面被覆盖将重置滚动位置和堆叠组状态'), true);
  assert.equal(settingsControlSource.includes('<br />'), true);
  assert.equal(settingsControlSource.includes('全局记忆：切换页面保留滚动位置和堆叠组状态。'), false);
  assert.equal(settingsControlSource.includes('覆盖后重置：页面被覆盖将重置滚动位置和堆叠组状态。'), false);
  assert.equal(settingsControlSource.includes('pagePositionMemoryMode'), true);
  assert.equal(appSource.includes('onPagePositionMemoryModeChange={updatePagePositionMemoryMode}'), true);
});

test('confirmation dialog and Windows app identity use restrained UI and NetraFlow metadata', () => {
  const appSource = readProjectFile('src/App.tsx');
  const confirmDialogSource = readProjectFile('src/components/dialogs/ConfirmDialog.tsx');
  const dialogShellSource = readProjectFile('src/components/dialogs/DialogShell.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const mainSource = readProjectFile('electron/main.ts');
  const packageScriptSource = readProjectFile('scripts/package-win.mjs');
  const packageJson = JSON.parse(readProjectFile('package.json')) as {
    name?: string;
    productName?: string;
    scripts?: { dist?: string; 'dist:installer'?: string; 'dist:portable'?: string };
    build?: {
      appId?: string;
      productName?: string;
      directories?: { output?: string };
      afterPack?: string;
      extraFiles?: Array<{
        from?: string;
        to?: string;
        filter?: string[];
      }>;
      win?: {
        icon?: string;
        artifactName?: string;
        executableName?: string;
        target?: unknown;
        signAndEditExecutable?: boolean;
      };
      nsis?: {
        oneClick?: boolean;
        perMachine?: boolean;
        allowToChangeInstallationDirectory?: boolean;
        createDesktopShortcut?: boolean;
        createStartMenuShortcut?: boolean;
        runAfterFinish?: boolean;
        shortcutName?: string;
        uninstallDisplayName?: string;
        installerIcon?: string;
        uninstallerIcon?: string;
        include?: string;
      };
    };
  };
  assert.equal(appSource.includes("eyebrow: '放弃编辑'"), false);
  assert.equal(appSource.includes('eyebrow: null'), false);
  assert.equal(appSource.includes('<ConfirmDialog'), true);
  assert.equal(confirmDialogSource.includes('eyebrow={eyebrow}'), true);
  assert.equal(dialogShellSource.includes('eyebrow ? ('), true);
  assert.equal(confirmDialogSource.includes('modal-button--primary'), false);
  assert.equal(confirmDialogSource.includes('modal-button modal-button--secondary'), true);
  assert.equal(confirmDialogSource.includes("tone === 'danger'"), true);
  assert.match(stylesSource, /\.modal-button--danger\s*\{[^}]*border-color: var\(--danger-border\);[^}]*background: var\(--surface-strong\);[^}]*color: var\(--danger-text\);[^}]*\}/s);
  assert.match(stylesSource, /\.modal-button:hover:not\(:disabled\),\s*\.modal-button:focus-visible:not\(:disabled\)\s*\{[^}]*background: var\(--surface-hover\);[^}]*transform: translateY\(-1px\);[^}]*\}/s);
  assert.match(stylesSource, /\.modal-button:active:not\(:disabled\)\s*\{[^}]*transform: translateY\(1px\);[^}]*\}/s);
  assert.equal(packageJson.name, 'netraflow');
  assert.equal(packageJson.productName, 'NetraFlow');
  assert.equal(packageJson.build?.appId, 'com.netraflow.app');
  assert.equal(packageJson.build?.productName, 'NetraFlow');
  assert.equal(packageJson.build?.directories?.output, 'release/installer');
  assert.equal(packageJson.build?.afterPack, 'scripts/after-pack-installer.mjs');
  assert.deepEqual(packageJson.build?.extraFiles?.[0], {
    from: 'build/licenses',
    to: 'licenses',
    filter: ['LICENSE.NotoSansCJK.txt', 'LICENSE.NotoSansSymbols2.txt']
  });
  assert.equal(packageJson.build?.win?.icon, 'public/icons/netraflow.ico');
  assert.equal(packageJson.build?.win?.artifactName, 'NetraFlow_${version}_Setup.${ext}');
  assert.equal(packageJson.build?.win?.executableName, 'NetraFlow');
  assert.equal(packageJson.build?.win?.signAndEditExecutable, false);
  assert.equal(JSON.stringify(packageJson.build?.win?.target).includes('"target":"nsis"'), true);
  assert.equal(JSON.stringify(packageJson.build?.win?.target).includes('"x64"'), true);
  assert.equal(packageJson.build?.nsis?.oneClick, false);
  assert.equal(packageJson.build?.nsis?.perMachine, true);
  assert.equal(packageJson.build?.nsis?.allowToChangeInstallationDirectory, true);
  assert.equal(packageJson.build?.nsis?.createDesktopShortcut, false);
  assert.equal(packageJson.build?.nsis?.createStartMenuShortcut, true);
  assert.equal(packageJson.build?.nsis?.runAfterFinish, false);
  assert.equal(packageJson.build?.nsis?.shortcutName, 'NetraFlow');
  assert.equal(packageJson.build?.nsis?.uninstallDisplayName, 'NetraFlow');
  assert.equal(packageJson.build?.nsis?.installerIcon, 'public/icons/netraflow.ico');
  assert.equal(packageJson.build?.nsis?.uninstallerIcon, 'public/icons/netraflow.ico');
  assert.equal(packageJson.build?.nsis?.include, 'build/installer/installer.nsh');
  assert.equal(packageJson.scripts?.dist, 'node scripts/package-win.mjs');
  assert.equal(
    packageJson.scripts?.['dist:installer'],
    'npm run build && cross-env CSC_IDENTITY_AUTO_DISCOVERY=false ELECTRON_BUILDER_DISABLE_BUILD_CACHE=true electron-builder --win nsis --x64 --publish never'
  );
  assert.equal(packageJson.scripts?.['dist:portable'], 'npm run build && node scripts/package-portable.mjs');
  assert.equal(mainSource.includes("app.setName(APP_NAME);"), true);
  assert.equal(mainSource.includes("process.platform === 'win32'"), true);
  assert.equal(mainSource.includes("app.setAppUserModelId('com.netraflow.app')"), true);
  assert.equal(mainSource.includes('const isPortableBuild = () =>'), true);
  assert.equal(mainSource.includes("process.env.NETRAFLOW_PORTABLE === '1'"), true);
  assert.equal(mainSource.includes("path.join(process.resourcesPath, 'app', 'portable.flag')"), true);
  assert.equal(mainSource.includes("path.join(process.resourcesPath, 'portable.flag')"), true);
  assert.equal(mainSource.includes('if (isPortableBuild())'), true);
  assert.equal(mainSource.includes("app.setPath('userData', path.join(path.dirname(process.execPath), 'userData'))"), true);
  assert.equal(mainSource.includes('process.resourcesPath'), true);
  assert.equal(mainSource.includes('title: APP_NAME'), true);
  assert.equal(packageScriptSource.includes('createVersionResource'), true);
  assert.equal(packageScriptSource.includes('getPeResourceContext'), true);
  assert.equal(packageScriptSource.includes('FileDescription'), true);
  assert.equal(packageScriptSource.includes('ProductName'), true);
  assert.equal(packageScriptSource.includes('NETRAFLOW_DIST_ROOT'), true);
});

test('Windows installer install directory and uninstall cleanup rules are wired', () => {
  const installerSource = readProjectFile('build/installer/installer.nsh');
  const packageSource = readProjectFile('package.json');

  assert.equal(installerSource.includes('!include LogicLib.nsh'), true);
  assert.equal(installerSource.includes('!define NETRAFLOW_INSTALL_DIR_NAME "NetraFlow"'), true);
  assert.equal(installerSource.includes('Function NetraFlowFindDefaultInstallDir'), true);
  assert.equal(installerSource.includes('ReadEnvStr $NetraFlowWindowsDir "WINDIR"'), true);
  assert.equal(installerSource.includes('StrCpy $NetraFlowDriveLetters "DEFGHIJKLMNOPQRSTUVWXYZ"'), true);
  assert.equal(installerSource.includes('GetLogicalDrives'), false);
  assert.equal(installerSource.includes('GetDriveType'), true);
  assert.equal(installerSource.includes('$0 == 3'), true);
  assert.equal(installerSource.includes('$NetraFlowDriveLetter != $NetraFlowSystemDrive'), true);
  assert.equal(installerSource.includes('${Break}'), true);
  assert.equal(installerSource.includes('StrCpy $INSTDIR "$NetraFlowPreferredDrive:\\${NETRAFLOW_INSTALL_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('!undef APP_FILENAME'), true);
  assert.equal(installerSource.includes('!define APP_FILENAME "${NETRAFLOW_INSTALL_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('Var NetraFlowDefaultInstallDirApplied'), false);
  assert.equal(installerSource.includes('Function NetraFlowNormalizeInstallDir'), true);
  assert.equal(installerSource.includes('Function .onVerifyInstDir'), true);
  assert.equal(installerSource.includes('MUI_PAGE_CUSTOMFUNCTION_LEAVE'), false);
  assert.equal(installerSource.includes('Function NetraFlowApplyDefaultInstallDir'), true);
  assert.equal(installerSource.includes('Function NetraFlowInstallModeLeave'), false);
  assert.equal(installerSource.includes('Function NetraFlowInstFilesPre'), false);
  assert.equal(installerSource.includes('!macro customPageAfterChangeDir'), false);
  assert.equal(installerSource.includes('MUI_PAGE_CUSTOMFUNCTION_PRE'), false);
  assert.equal(installerSource.includes('!macro customFinishPage'), true);
  assert.equal(installerSource.includes('!define MUI_FINISHPAGE_RUN_TEXT "运行 ${NETRAFLOW_PRODUCT_NAME}"'), true);
  assert.equal(installerSource.includes('!define MUI_FINISHPAGE_RUN_NOTCHECKED'), true);
  assert.equal(installerSource.includes('!define MUI_FINISHPAGE_SHOWREADME_TEXT "创建桌面快捷方式"'), true);
  assert.equal(installerSource.includes('!define MUI_FINISHPAGE_SHOWREADME_NOTCHECKED'), true);
  assert.equal(installerSource.includes('Function NetraFlowCreateDesktopShortcutAfterFinish'), true);
  assert.equal(installerSource.includes('CreateShortCut "$DESKTOP\\${NETRAFLOW_PRODUCT_NAME}.lnk" "$appExe"'), true);
  assert.equal(installerSource.includes('StrCpy $0 "$CMDLINE"'), true);
  assert.equal(installerSource.includes('$4 == "/D="'), true);
  assert.equal(installerSource.includes('Call NetraFlowFindDefaultInstallDir'), true);
  assert.equal(installerSource.includes('StrCpy $INSTDIR "$NetraFlowSelectedDir\\${NETRAFLOW_INSTALL_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('StrCpy $NetraFlowSelectedTail $NetraFlowSelectedDir "" -1'), true);
  assert.equal(installerSource.includes('StrCpy $NetraFlowSelectedDir $NetraFlowSelectedDir -1'), true);
  assert.equal(installerSource.includes('StrCpy $NetraFlowSelectedTail $NetraFlowSelectedDir 10 -10'), true);
  assert.equal(installerSource.includes('StrCpy $INSTDIR "$NetraFlowSelectedDir${NETRAFLOW_INSTALL_DIR_NAME}"'), false);
  assert.equal(installerSource.includes('!macro preInit'), false);
  assert.equal(installerSource.includes('!macro customInit'), true);
  assert.equal(installerSource.includes('"\\NertaFlow\\NetraFlow"'), false);
  assert.equal(installerSource.includes('"\\NertaFlow\\NertaFlow"'), false);
  assert.equal(installerSource.includes('"\\Software\\NertaFlow\\NetraFlow"'), false);
  assert.equal(packageSource.includes('"afterPack": "scripts/after-pack-installer.mjs"'), true);
  assert.equal(packageSource.includes('"APP_PACKAGE_URL"'), false);
  assert.equal(installerSource.includes('RMDir /r "$APPDATA\\${NETRAFLOW_PRODUCT_NAME}"'), true);
  assert.equal(installerSource.includes('RMDir /r "$APPDATA\\netraflow"'), true);
  assert.equal(installerSource.includes('RMDir /r "$LOCALAPPDATA\\${NETRAFLOW_PRODUCT_NAME}"'), true);
  assert.equal(installerSource.includes('RMDir /r "$LOCALAPPDATA\\netraflow"'), true);
  assert.equal(installerSource.includes('RMDir /r "$INSTDIR\\userData"'), true);
  assert.equal(installerSource.includes('RMDir /r "$LOCALAPPDATA\\netraflow-updater"'), true);
  assert.equal(installerSource.includes('RMDir /r "$LOCALAPPDATA\\Programs\\${NETRAFLOW_PRODUCT_NAME}"'), true);
  assert.equal(installerSource.includes('Function un.NetraFlowRemoveKnownUserDataDirs'), true);
  assert.equal(installerSource.includes('StrCpy $NetraFlowUsersRoot "$NetraFlowUsersRoot\\Users"'), true);
  assert.equal(installerSource.includes('!insertmacro NetraFlowRemoveUserRuntimeData "$NetraFlowUserPath"'), true);
  assert.equal(installerSource.includes('!macro NetraFlowRemoveKnownInstallContents TARGET_DIR'), false);
  assert.equal(installerSource.includes('DeleteRegKey HKCU "Software\\${NETRAFLOW_PRODUCT_NAME}"'), true);
  assert.equal(installerSource.includes('DeleteRegKey HKLM "Software\\${NETRAFLOW_PRODUCT_NAME}"'), true);
  assert.equal(installerSource.includes('DeleteRegKey HKCU "Software\\netraflow"'), true);
  assert.equal(installerSource.includes('DeleteRegKey HKLM "Software\\netraflow"'), true);
  assert.equal(installerSource.includes('DeleteRegKey HKCU "Software\\${NETRAFLOW_APP_ID}"'), true);
  assert.equal(installerSource.includes('DeleteRegKey HKLM "Software\\${NETRAFLOW_APP_ID}"'), true);
  assert.equal(installerSource.includes('DeleteRegKey HKCU "Software\\${APP_GUID}"'), true);
  assert.equal(installerSource.includes('DeleteRegKey HKLM "Software\\${APP_GUID}"'), true);
  assert.equal(
    installerSource.includes('DeleteRegKey HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${NETRAFLOW_APP_ID}"'),
    true
  );
  assert.equal(
    installerSource.includes('DeleteRegKey HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${UNINSTALL_APP_KEY}"'),
    true
  );
  assert.equal(
    installerSource.includes('DeleteRegKey HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${NETRAFLOW_APP_ID}"'),
    true
  );
  assert.equal(
    installerSource.includes('DeleteRegKey HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\${UNINSTALL_APP_KEY}"'),
    true
  );
  assert.equal(
    installerSource.includes('DeleteRegKey HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${NETRAFLOW_PRODUCT_NAME}.exe"'),
    true
  );
  assert.equal(
    installerSource.includes('DeleteRegKey HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\App Paths\\${NETRAFLOW_PRODUCT_NAME}.exe"'),
    true
  );
  assert.equal(
    installerSource.includes('DeleteRegValue HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "${NETRAFLOW_PRODUCT_NAME}"'),
    true
  );
  assert.equal(
    installerSource.includes('DeleteRegValue HKLM "Software\\Microsoft\\Windows\\CurrentVersion\\Run" "${NETRAFLOW_APP_ID}"'),
    true
  );
  assert.equal(
    installerSource.includes('DeleteRegValue HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved\\Run" "${NETRAFLOW_PRODUCT_NAME}"'),
    true
  );
  assert.equal(
    installerSource.includes('DeleteRegValue HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\FeatureUsage\\AppSwitched" "$INSTDIR\\${NETRAFLOW_PRODUCT_NAME}.exe"'),
    true
  );
  assert.equal(installerSource.includes('SetRegView 64'), true);
  assert.equal(installerSource.includes('SetRegView 32'), true);
  assert.equal(installerSource.includes('Delete "$DESKTOP\\${NETRAFLOW_PRODUCT_NAME}.lnk"'), true);
  assert.equal(installerSource.includes('Delete "$SMPROGRAMS\\${NETRAFLOW_PRODUCT_NAME}.lnk"'), true);
  assert.equal(installerSource.includes('Delete "$APPDATA\\Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar\\${NETRAFLOW_PRODUCT_NAME}.lnk"'), true);
  assert.equal(installerSource.includes('${If} $R3 == "\\NetraFlow"'), false);
  assert.equal(installerSource.includes('${OrIf} $R3 == "\\NertaFlow"'), false);
  assert.equal(installerSource.includes('RMDir /r "$R0"'), false);
  assert.equal(installerSource.includes('RMDir "$R0"'), false);
  assert.equal(installerSource.includes('RMDir /r "$NetraFlowPreferredDrive:\\"'), false);
  assert.equal(installerSource.includes('RMDir /r "$INSTDIR"'), true);
});

test('packaged first launch starts with empty real data and excludes runtime storage', () => {
  const appSource = readProjectFile('src/App.tsx');
  const packageJson = JSON.parse(readProjectFile('package.json')) as { build?: { files?: string[] } };
  const packageScriptSource = readProjectFile('scripts/package-win.mjs');
  const firstWelcomeStart = appSource.indexOf('const renderFirstWelcome = () =>');
  const firstWelcomeSource = appSource.slice(
    firstWelcomeStart,
    appSource.indexOf("if (firstWelcomeStage === 'story')", firstWelcomeStart)
  );
  const chooseFirstWelcomeStoryRouteSource = appSource.slice(
    appSource.indexOf('const chooseFirstWelcomeStoryRoute'),
    appSource.indexOf('const switchExampleTemplate')
  );

  assert.equal(appSource.includes('const initialGroups: AssetGroup[] = [];'), true);
  assert.equal(appSource.includes('default-cash'), false);
  assert.equal(appSource.includes('default-bank-card'), false);
  assert.equal(appSource.includes('default-stock'), false);
  assert.equal(appSource.includes('default-credit-card'), false);
  assert.equal(firstWelcomeSource.includes('onClick={completeFirstWelcome}'), true);
  assert.equal(firstWelcomeSource.includes('createExampleData'), false);
  assert.equal(firstWelcomeSource.includes('startExampleMode'), false);
  assert.equal(chooseFirstWelcomeStoryRouteSource.includes('completeFirstWelcome();'), true);
  assert.equal(chooseFirstWelcomeStoryRouteSource.includes('startExampleMode(templateId);'), true);
  assert.equal(appSource.includes('applyExampleGeneratedData(createExampleData(templateId))'), true);

  for (const excludedPath of [
    '!**/userData/**',
    '!**/Local Storage/**',
    '!**/IndexedDB/**',
    '!**/Cache/**',
    '!**/Code Cache/**',
    '!**/GPUCache/**',
    '!**/Session Storage/**',
    '!**/Preferences',
    '!**/Local State',
    '!**/blob_storage/**',
    '!**/DawnCache/**',
    '!**/DawnWebGPUCache/**',
    '!**/Network/**',
    '!**/Shared Dictionary/**',
    '!release/**',
    '!**/AppData/**'
  ]) {
    assert.equal(packageJson.build?.files?.includes(excludedPath), true);
  }

  assert.equal(packageScriptSource.includes('const runtimeDataEntryNames = new Set(['), true);
  assert.equal(packageScriptSource.includes("'Local Storage'"), true);
  assert.equal(packageScriptSource.includes("'IndexedDB'"), true);
  assert.equal(packageScriptSource.includes("'Preferences'"), true);
  assert.equal(packageScriptSource.includes('removeRuntimeDataEntries(appDir);'), true);
});

test('portable Windows package script creates an isolated zip bundle without installer artifacts', () => {
  const packageJson = JSON.parse(readProjectFile('package.json')) as {
    scripts?: { 'dist:portable'?: string };
  };
  const mainSource = readProjectFile('electron/main.ts');
  const portableScriptSource = readProjectFile('scripts/package-portable.mjs');

  assert.equal(packageJson.scripts?.['dist:portable'], 'npm run build && node scripts/package-portable.mjs');
  assert.equal(portableScriptSource.includes("path.join(rootDir, 'release', 'portable')"), true);
  assert.equal(portableScriptSource.includes('`${bundleName}_Portable.zip`'), true);
  assert.equal(portableScriptSource.includes("writeFileSync(path.join(appDir, 'portable.flag')"), true);
  assert.equal(mainSource.includes("path.join(process.resourcesPath, 'app', 'portable.flag')"), true);
  assert.equal(mainSource.includes("path.join(path.dirname(process.execPath), 'userData')"), true);
  assert.equal(portableScriptSource.includes('Compress-Archive'), true);
  assert.equal(portableScriptSource.includes("electron-winstaller', 'vendor', 'rcedit.exe'"), true);
  assert.equal(portableScriptSource.includes("'--set-icon'"), true);
  assert.equal(portableScriptSource.includes("'public', 'icons', 'netraflow.ico'"), true);
  assert.equal(portableScriptSource.includes('copyNotoLicenses'), true);
  assert.equal(portableScriptSource.includes("'LICENSE.NotoSansCJK.txt'"), true);
  assert.equal(portableScriptSource.includes("'LICENSE.NotoSansSymbols2.txt'"), true);
  assert.equal(portableScriptSource.includes("'LICENSE.electron.txt'"), true);
  assert.equal(portableScriptSource.includes("'LICENSES.chromium.html'"), true);
  assert.equal(portableScriptSource.includes('assertNoForbiddenPortableEntries(portableRootDir)'), true);
  for (const forbiddenEntry of [
    "'userData'",
    "'Local Storage'",
    "'IndexedDB'",
    "'Cache'",
    "'Code Cache'",
    "'GPUCache'",
    "'Session Storage'",
    "'Preferences'",
    "'Local State'",
    "'blob_storage'",
    "'DawnCache'",
    "'DawnWebGPUCache'",
    "'Network'",
    "'Shared Dictionary'",
    "'AppData'",
    "'netraflow-updater'",
    "'installer.exe'",
    '`Uninstall ${productName}.exe`',
    "'uninstallerIcon.ico'",
    "'installerIcon.ico'"
  ]) {
    assert.equal(portableScriptSource.includes(forbiddenEntry), true);
  }
  assert.equal(portableScriptSource.includes('/\\.blockmap$/i'), true);
  assert.equal(portableScriptSource.includes('/^NetraFlow_.*_Setup\\.exe$/i'), true);
  assert.equal(portableScriptSource.includes('electron-builder --win nsis'), false);
  assert.equal(portableScriptSource.includes('createDesktopShortcut'), false);
  assert.equal(portableScriptSource.includes('createStartMenuShortcut'), false);
  assert.equal(portableScriptSource.includes('DeleteRegKey'), false);
});

test('Windows installer bundles Noto font license files beside the installed app', () => {
  const cjkLicense = readProjectFile('build/licenses/LICENSE.NotoSansCJK.txt');
  const symbolsLicense = readProjectFile('build/licenses/LICENSE.NotoSansSymbols2.txt');
  const packageJson = JSON.parse(readProjectFile('package.json')) as {
    build?: {
      extraFiles?: Array<{
        from?: string;
        to?: string;
        filter?: string[];
      }>;
    };
  };

  assert.equal(existsSync(new URL('../../../build/licenses/LICENSE.NotoSansCJK.txt', import.meta.url)), true);
  assert.equal(existsSync(new URL('../../../build/licenses/LICENSE.NotoSansSymbols2.txt', import.meta.url)), true);
  assert.equal(cjkLicense.includes('NotoSansCJKsc-Regular.otf'), true);
  assert.equal(cjkLicense.includes('NotoSansCJKsc-Medium.otf'), true);
  assert.equal(cjkLicense.includes('NotoSansCJKsc-Bold.otf'), true);
  assert.equal(symbolsLicense.includes('NotoSansSymbols2-Regular.ttf'), true);
  assert.equal(cjkLicense.includes('SIL OPEN FONT LICENSE Version 1.1'), true);
  assert.equal(symbolsLicense.includes('SIL OPEN FONT LICENSE Version 1.1'), true);
  assert.deepEqual(packageJson.build?.extraFiles?.[0]?.filter, [
    'LICENSE.NotoSansCJK.txt',
    'LICENSE.NotoSansSymbols2.txt'
  ]);
  assert.equal(packageJson.build?.extraFiles?.[0]?.to, 'licenses');
});

test('Windows installer uses local rcedit afterPack for executable icon resources', () => {
  const afterPackSource = readProjectFile('scripts/after-pack-installer.mjs');

  assert.equal(afterPackSource.includes("electron-winstaller', 'vendor', 'rcedit.exe'"), true);
  assert.equal(afterPackSource.includes("'public', 'icons', 'netraflow.ico'"), true);
  assert.equal(afterPackSource.includes("'--set-icon'"), true);
  assert.equal(afterPackSource.includes("'FileDescription'"), true);
  assert.equal(afterPackSource.includes("'ProductName'"), true);
  assert.equal(afterPackSource.includes('winCodeSign'), false);
  assert.equal(existsSync(new URL('../../../public/icons/netraflow.ico', import.meta.url)), true);
});

test('Windows taskbar lock uses Jump List IPC without tray or background hiding', () => {
  const mainSource = readProjectFile('electron/main.ts');
  const preloadSource = readProjectFile('electron/preload.ts');
  const appSource = readProjectFile('src/App.tsx');
  const typesSource = readProjectFile('src/vite-env.d.ts');

  assert.equal(mainSource.includes('new Tray'), false);
  assert.equal(mainSource.includes('.hide()'), false);
  assert.equal(mainSource.includes('autoUpdater'), false);
  assert.equal(mainSource.includes('electron-updater'), false);
  assert.equal(mainSource.includes('event.preventDefault()'), false);
  assert.equal(mainSource.includes("app.on('window-all-closed'"), true);
  assert.equal(mainSource.includes("process.platform !== 'darwin'"), true);
  assert.equal(mainSource.includes('app.quit();'), true);
  assert.equal(mainSource.includes('app.setUserTasks(['), true);
  assert.equal(mainSource.includes("title: '锁定'"), true);
  assert.equal(mainSource.includes("description: '锁定 NetraFlow'"), true);
  assert.equal(mainSource.includes("arguments: '--lock'"), true);
  assert.equal(mainSource.includes('app.requestSingleInstanceLock()'), true);
  assert.equal(mainSource.includes("app.on('second-instance'"), true);
  assert.equal(mainSource.includes("argv.includes('--lock')"), true);
  assert.equal(mainSource.includes("targetWindow.webContents.send('netraflow-lock')"), true);
  assert.equal(preloadSource.includes('onNetraFlowLock'), true);
  assert.equal(preloadSource.includes("ipcRenderer.on('netraflow-lock'"), true);
  assert.equal(preloadSource.includes("ipcRenderer.removeListener('netraflow-lock'"), true);
  assert.equal(typesSource.includes('onNetraFlowLock?: (listener: () => void) => () => void;'), true);
  assert.equal(appSource.includes('api.onNetraFlowLock(() => {'), true);
  assert.equal(appSource.includes("showToast('请先开启登陆密码保护', 'info')"), true);
  assert.equal(appSource.includes('setIsLocked(true);'), true);
  assert.equal(appSource.includes('verifyPassword(unlockPasswordInput, globalSettings.passwordHash)'), true);
});

test('history panel opacity and two-column title alignment use shared structure classes', () => {
  const appSource = readProjectFile('src/App.tsx');
  const historyPanelSource = readProjectFile('src/features/history/HistoryPanel.tsx');
  const historyFilterSource = readProjectFile('src/features/history/HistoryFilterToolbar.tsx');
  const historyCalendarSource = readProjectFile('src/features/history/HistoryCalendarPanel.tsx');
  const historyListSource = readProjectFile('src/features/history/HistoryRecordList.tsx');
  const historySource = [
    appSource,
    historyPanelSource,
    historyFilterSource,
    historyCalendarSource,
    historyListSource
  ].join('\n');
  const stylesSource = readProjectFile('src/styles.css');

  assert.equal(historySource.includes('className="history-browse-panel two-column-page-panel"'), true);
  assert.equal(historySource.includes('className="history-filter-panel"'), true);
  assert.equal(historySource.includes('className="history-calendar-panel"'), true);
  assert.equal(historySource.includes('className="history-result-list-panel"'), true);
  assert.equal(historySource.includes("background: 'var(--panel-bg-strong)'"), true);
  assert.equal(stylesSource.includes('--two-column-panel-padding: 22px;'), true);
  assert.equal(stylesSource.includes('--right-panel-padding: var(--two-column-panel-padding);'), true);
  assert.match(stylesSource, /\.left-browse-panel\.card\s*\{[^}]*padding: var\(--two-column-panel-padding\);[^}]*\}/s);
  assert.match(stylesSource, /\.right-action-panel\s*\{[^}]*padding: var\(--right-panel-padding\);[^}]*\}/s);
  assert.match(stylesSource, /\.layout-layer--left \.search-panel\s*\{[^}]*padding: var\(--two-column-panel-padding\) !important;[^}]*\}/s);
});

test('local Noto fonts, emoji fallback, and about-page license copy stay wired', () => {
  const appSource = readProjectFile('src/App.tsx');
  const aboutPanelSource = readProjectFile('src/features/settings/AboutNetraFlowPanel.tsx');
  const stylesSource = readProjectFile('src/styles.css');

  assert.match(stylesSource, /^@font-face\s*\{[\s\S]*font-family: 'NF Noto Sans CJK SC';/);
  assert.equal(stylesSource.includes("NotoSansCJKsc-Regular.otf"), true);
  assert.equal(stylesSource.includes("NotoSansCJKsc-Medium.otf"), true);
  assert.equal(stylesSource.includes("NotoSansCJKsc-Bold.otf"), true);
  assert.equal(stylesSource.includes("NotoSansSymbols2-Regular.ttf"), true);
  assert.match(
    stylesSource,
    /--nf-font-sans:[\s\S]*'NF Noto Sans CJK SC'[\s\S]*'NF Noto Symbols 2'[\s\S]*'Segoe UI Emoji'[\s\S]*'Apple Color Emoji'[\s\S]*'Noto Color Emoji'[\s\S]*sans-serif;/
  );
  assert.match(stylesSource, /body\s*\{[^}]*font-family: var\(--nf-font-sans\);[^}]*\}/s);
  assert.equal(aboutPanelSource.includes('开源许可'), true);
  assert.equal(aboutPanelSource.includes('className="about-netraflow__license-label">字体</p>'), true);
  assert.equal(aboutPanelSource.includes('<h3 id="netraflow-font-license-title">字体</h3>'), false);
  assert.equal(aboutPanelSource.includes('NetraFlow 内置使用 Noto Sans CJK SC 与 Noto Sans Symbols 2'), true);
  assert.equal(aboutPanelSource.includes('NetraFlow 内置使用 Noto Sans CJK SC 与 Noto Sans Symbols 2。'), false);
  assert.equal(aboutPanelSource.includes('Noto Fonts 由 The Noto Project Authors 提供'), true);
  assert.equal(aboutPanelSource.includes('授权使用。'), false);
  assert.ok(
    aboutPanelSource.indexOf('about-netraflow__license') <
      aboutPanelSource.indexOf('about-netraflow__contact')
  );
  const aboutPageSource = aboutPanelSource;
  const contactToCatSource = aboutPageSource.slice(
    aboutPageSource.indexOf('about-netraflow__contact'),
    aboutPageSource.indexOf('className="about-netraflow__cat"')
  );
  assert.equal(appSource.includes('NETRAFLOW_MEMO_PARAGRAPHS'), false);
  assert.equal(`${appSource}\n${aboutPanelSource}`.includes('about-netraflow__memo'), false);
  assert.equal(stylesSource.includes('about-netraflow__memo'), false);
  assert.equal(`${appSource}\n${aboutPanelSource}`.includes('<strong>净流 NetraFlow</strong>'), false);
  assert.equal(`${appSource}\n${aboutPanelSource}`.includes('借助 ChatGPT 和 Codex、Windsurf'), false);
  assert.equal(aboutPanelSource.includes('<h3 id="netraflow-contact-title">获取信息</h3>'), true);
  assert.equal(aboutPanelSource.includes('about-netraflow__info-button--bilibili'), true);
  assert.equal(aboutPanelSource.includes('about-netraflow__info-button--github'), true);
  assert.equal(aboutPanelSource.includes('NfGithubIcon'), true);
  assert.equal(appSource.includes(GITHUB_RELEASES_URL), true);
  assert.equal(existsSync(new URL('../../../src/assets/icons/common/nf-github.svg', import.meta.url)), true);
  assert.equal(contactToCatSource.includes('</section>'), true);
  assert.match(
    stylesSource,
    /\.about-netraflow__cat,\s*\.about-netraflow__cat \*\s*\{[^}]*user-select: auto;[^}]*-webkit-user-select: auto;[^}]*cursor: pointer;[^}]*\}/s
  );
  assert.equal(
    existsSync(new URL('../../../src/assets/fonts/noto/OFL.txt', import.meta.url)),
    true
  );
  assert.equal(
    existsSync(new URL('../../../src/assets/fonts/noto/NOTICE.md', import.meta.url)),
    true
  );
});

test('account add and restore page copy uses archived metadata without extra title text', () => {
  const appSource = readProjectFile('src/App.tsx');
  const accountEditorSource = readProjectFile('src/features/account/AccountEditorDialog.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const restorePanelSource = accountEditorSource.slice(
    accountEditorSource.indexOf('className="account-add-restore-panel"'),
    accountEditorSource.indexOf('className="account-add-restore-panel account-add-restore-panel--form"')
  );

  assert.equal(restorePanelSource.includes('账户新增 / 恢复'), false);
  assert.equal(restorePanelSource.includes('简易搜索'), false);
  assert.equal(appSource.includes('归档旧账户'), false);
  assert.equal(appSource.includes('归档旧帐户'), false);
  assert.equal(appSource.includes('<AccountRestoreDialog'), true);
  assert.equal(restorePanelSource.includes('getRestoreTitle(account)'), true);
  assert.equal(
    restorePanelSource.includes('getArchivedAtLabel(account.archivedAt)'),
    true
  );
  assert.equal(
    restorePanelSource.includes('account-operation-button account-restore-card__restore-button'),
    true
  );
  assert.equal(stylesSource.includes('--account-add-panel-bg: var(--panel-bg);'), true);
  assert.equal(stylesSource.includes('.account-restore-card__restore-button'), true);
});

test('deleted original account category restore uses an explicit unselected category chooser', () => {
  const appSource = readProjectFile('src/App.tsx');
  const accountDataSource = readProjectFile('src/app/accountData.ts');
  const accountEditorSource = readProjectFile('src/features/account/AccountEditorDialog.tsx');
  const targetDialogSource = accountEditorSource.slice(
    accountEditorSource.indexOf('function AccountRestoreTargetDialog'),
    accountEditorSource.indexOf('type AccountCreateDialogProps')
  );
  const restoreLogicSource = appSource.slice(
    appSource.indexOf('const completeArchivedRestoreSource'),
    appSource.indexOf('const clearDeletedAssetGroupUiState')
  );
  const archivedAccountsSource = accountDataSource.slice(
    accountDataSource.indexOf('export const getArchivedAccountEntries'),
    accountDataSource.indexOf('export const restoreArchivedAccountToGroup')
  );

  assert.equal(
    targetDialogSource.includes('原账户类别已删除，请选择恢复到哪个账户类别'),
    true
  );
  assert.equal(targetDialogSource.includes('quick-single-entry-account-picker'), true);
  assert.equal(targetDialogSource.includes('groups.map((group)'), true);
  assert.equal(targetDialogSource.includes('is-selected'), false);
  assert.equal(targetDialogSource.includes('新建账户类型'), false);
  assert.equal(targetDialogSource.includes('NfActionAddIcon'), false);
  assert.equal(targetDialogSource.includes('accountTypeGhostText'), false);
  assert.equal(appSource.includes('<AccountRestoreTargetDialog'), true);
  assert.equal(restoreLogicSource.includes('getArchivedAccountRestoreGroup({ groupId }, assetGroups)'), true);
  assert.equal(restoreLogicSource.includes('setPendingArchivedRestore({ accountId: account.id, source })'), true);
  assert.equal(restoreLogicSource.includes('restoreArchivedAccountToGroup('), true);
  assert.equal(restoreLogicSource.includes('targetGroup.id'), true);
  assert.equal(restoreLogicSource.includes('completeArchivedRestoreSource(source)'), true);
  assert.equal(appSource.includes('getArchivedAccountEntries(groups, accounts, history)'), true);
  assert.equal(archivedAccountsSource.includes('archivedAccountsWithCurrentGroup'), true);
  assert.equal(
    archivedAccountsSource.includes(
      '.filter((account) => account.archived && !archivedAccountIdsWithCurrentGroup.has(account.id))'
    ),
    true
  );
  [
    "restoreAccount(archivedMatch.groupId, archivedMatch, 'same-name-account')",
    "restoreAccount(selectedAccount.groupId, selectedAccountEntry, 'account-detail')",
    "restoreAccount(account.groupId, account, 'archived-accounts-list')",
    "restoreAccount(account.groupId, account, 'account-restore-dialog')"
  ].forEach((expectedSource) => assert.equal(appSource.includes(expectedSource), true));
});

test('quick entry picker and example account aliases use current title and mark rules', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const exampleDataSource = readProjectFile('src/exampleData.ts');
  const quickEntryHostSource = appSource.slice(
    appSource.indexOf('{isQuickSingleEntryAccountPickerOpen ? ('),
    appSource.indexOf('{editingAccount && currentAccount ? (')
  );
  const quickPanelSource = readProjectFile('src/features/quickEntry/QuickEntryPanel.tsx');
  const quickPickerSource = readProjectFile('src/features/quickEntry/QuickEntryAccountPicker.tsx');

  assert.equal(quickEntryHostSource.includes('<QuickEntryPanel'), true);
  assert.equal(`${quickEntryHostSource}\n${quickPanelSource}`.includes('<p className="eyebrow">记一笔</p>'), false);
  assert.equal(quickPanelSource.includes("<h2 id={titleId}>{title}</h2>"), true);
  assert.equal(quickPanelSource.includes("title = '选择账户'"), true);
  assert.equal(quickPickerSource.includes('quick-single-entry-account-group'), true);
  assert.match(
    stylesSource,
    /\.quick-single-entry-account-picker\s*\{[^}]*gap: 0;[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.quick-single-entry-account-picker \.flash-note-account-group\s*\{[^}]*align-items: center;[^}]*min-height: 46px;[^}]*padding-block: 7px;[^}]*\}/s
  );
  const quickEntryDividerBlock =
    stylesSource.match(
      /\.quick-single-entry-account-group \+ \.quick-single-entry-account-group\s*\{[^}]*\}/s
    )?.[0] ?? '';
  assert.match(
    stylesSource,
    /\.quick-single-entry-account-group \+ \.quick-single-entry-account-group\s*\{[^}]*border-top: 1px solid var\(--border-subtle, var\(--border-soft\)\);[^}]*margin-top: 0;[^}]*\}/s
  );
  assert.equal(quickEntryDividerBlock.includes('padding-top'), false);
  assert.equal(exampleDataSource.includes('const getExampleAccountAlias'), true);
  assert.equal(exampleDataSource.includes('getAutomaticAccountMark(definition.name)'), true);
  assert.equal(exampleDataSource.includes('alias: getExampleAccountAlias(definition)'), true);
  assert.equal(appSource.includes('getLegacyExampleAccountMark'), false);
});

test('account detail operation copy and editor previews stay visually scoped', () => {
  const appSource = readProjectFile('src/App.tsx');
  const accountDetailPanelSource = readProjectFile(
    'src/features/account/AccountDetailPanel.tsx'
  );
  const accountHistoryListSource = readProjectFile(
    'src/features/account/AccountHistoryList.tsx'
  );
  const accountHistoryItemSource = readProjectFile(
    'src/features/account/AccountHistoryItem.tsx'
  );
  const accountActionsSource = readProjectFile(
    'src/features/account/AccountActionsPanel.tsx'
  );
  const accountChartSettingsSource = readProjectFile(
    'src/features/account/AccountChartSettingsPanel.tsx'
  );
  const dangerActionsSource = readProjectFile(
    'src/features/account/AccountDangerActionsPanel.tsx'
  );
  const accountEditorSource = readProjectFile('src/features/account/AccountEditorDialog.tsx');
  const quickFormSource = readProjectFile('src/features/quickEntry/QuickEntryForm.tsx');
  const accountInfoEditorSource = readProjectFile(
    'src/features/account/AccountInfoEditorDialog.tsx'
  );
  const stylesSource = readProjectFile('src/styles.css');
  const accountTrendPanelSource = appSource.slice(
    appSource.indexOf('function AccountTrendPanel'),
    appSource.indexOf('function GroupDetailStructurePanel')
  );
  const amountEditorSource = `${accountEditorSource}\n${quickFormSource}`;

  assert.equal(appSource.includes('<AccountDetailPanel'), true);
  assert.equal(appSource.includes('<AccountHistoryList'), true);
  assert.equal(appSource.includes('<AccountAmountEditorDialog'), true);
  assert.equal(appSource.includes('<AccountInfoEditorDialog'), true);
  assert.equal(accountDetailPanelSource.includes('<p className="eyebrow"'), false);
  assert.equal(accountDetailPanelSource.includes('className="account-detail-title">{title}</h1>'), true);
  assert.equal(accountDetailPanelSource.includes('l0-chart-button l0-chart-button--trend account-detail-chart-thumbnail'), true);
  assert.equal(accountHistoryListSource.includes('AccountHistoryGroup'), true);
  assert.equal(accountHistoryItemSource.includes('compareRecords'), true);
  assert.match(stylesSource, /\.account-detail-title\s*\{[^}]*font-size: var\(--chart-page-title-size\);[^}]*\}/s);
  assert.equal(accountTrendPanelSource.includes('ChartLegendList'), false);
  assert.equal(accountTrendPanelSource.includes('accountName'), false);
  assert.match(stylesSource, /\.account-detail-header\s*\{[^}]*display: flex;[^}]*justify-content: space-between;[^}]*\}/s);
  assert.match(stylesSource, /\.account-detail-chart-thumbnail\s*\{[^}]*flex: 0 1 min\(292px, 42%\);[^}]*width: min\(292px, 100%\);[^}]*\}/s);
  assert.match(stylesSource, /@media \(max-width: 760px\)\s*\{[\s\S]*\.account-detail-header\s*\{[^}]*flex-wrap: wrap;[^}]*\}[\s\S]*\.account-detail-chart-thumbnail\s*\{[^}]*flex-basis: min\(292px, 100%\);[^}]*\}/);
  assert.equal(accountActionsSource.includes('className="right-panel-page"'), true);
  assert.equal(accountActionsSource.includes('<h2 className="right-panel-title">账户变更</h2>'), true);
  assert.equal(accountActionsSource.includes('RightPanelSection'), false);
  assert.equal(accountActionsSource.includes('账户操作'), false);
  assert.equal(accountActionsSource.includes('账户图表'), false);
  assert.equal(accountActionsSource.includes('openAccountChartsPage'), false);
  assert.equal(accountActionsSource.includes('className="right-panel-preview"'), false);
  assert.equal(accountChartSettingsSource.includes('title="图表参数设置"'), true);
  assert.equal(accountChartSettingsSource.includes('由全局图表设置锁定'), true);
  assert.equal(accountChartSettingsSource.includes('contentOverlay'), true);
  assert.equal(accountChartSettingsSource.includes('chart-settings-lock-note'), false);
  assert.equal(accountChartSettingsSource.includes('className="right-panel-page"'), true);
  assert.equal(accountChartSettingsSource.includes('className="right-panel-page-action"'), true);
  assert.equal(accountChartSettingsSource.includes('footer={<RightPanelActionButton'), false);
  assert.equal(
    accountChartSettingsSource.indexOf('</RightPanelSection>') <
      accountChartSettingsSource.indexOf('className="right-panel-page-action"'),
    true
  );
  assert.equal(stylesSource.includes('.chart-settings-locked-panel'), true);
  assert.equal(accountChartSettingsSource.includes('renderSegmentedControl'), true);
  assert.equal(accountChartSettingsSource.includes('updateLocalAccountDetailChartSettings'), false);
  assert.equal(dangerActionsSource.includes('归档与删除需要再次确认'), false);
  assert.equal(dangerActionsSource.includes('RightPanelSection'), false);
  assert.equal(dangerActionsSource.includes('归档后可在账户新增 / 恢复中重新启用'), false);
  assert.equal(dangerActionsSource.includes('删除后不可恢复'), false);
  assert.equal(dangerActionsSource.includes('<RightPanelActionButton label="归档账户" tone="danger"'), false);
  assert.equal(dangerActionsSource.includes('<RightPanelActionButton label="归档账户" onClick={onArchiveAccount} />'), true);
  assert.equal(dangerActionsSource.includes('<RightPanelActionButton label="删除账户" tone="danger"'), true);
  assert.equal(amountEditorSource.includes('<p className="eyebrow"'), false);
  assert.equal(accountInfoEditorSource.includes('<p className="eyebrow"'), false);
  assert.equal(accountInfoEditorSource.includes('account-alias-preview__name'), false);
  assert.equal(amountEditorSource.includes('<span>变更：</span>'), true);
  assert.equal(amountEditorSource.includes('change-preview-amount-line'), true);
  assert.match(stylesSource, /\.change-preview-amount-line\s*\{[^}]*white-space: nowrap;[^}]*\}/s);
  assert.match(stylesSource, /\.account-operation-calendar__day:disabled\s*\{[^}]*pointer-events: none;[^}]*\}/s);
});

test('page coverage scroll reset stays scoped away from view and form state', () => {
  const appSource = readProjectFile('src/App.tsx');
  const scrollEffectsSource = appSource.slice(
    appSource.indexOf('const previousMainPageKey = previousMainPageKeyRef.current;'),
    appSource.indexOf('const renderRightPanelSection')
  );

  assert.equal(appSource.includes("type PageCoverage = 'full' | 'right-panel-only' | 'none';"), true);
  assert.equal(appSource.includes('const getPageCoverage = ('), true);
  assert.equal(appSource.includes("getPageCoverage(previousMainPageKey, mainPageKey, 'main')"), true);
  assert.equal(appSource.includes("getPageCoverage(previousRightPanelKey, rightPanelKey, 'right')"), true);
  assert.equal(appSource.includes("leftLayerCoverage === 'full' && !previousLeftLayerKey && Boolean(leftLayerKey)"), true);
  assert.equal(appSource.includes('mainContentRef.current?.scrollTo({ top: 0 });'), true);
  assert.equal(appSource.includes('leftLayerPanelRef.current?.scrollTo({ top: 0 });'), true);
  assert.equal(appSource.includes('rightActionPanelRef.current?.scrollTo({ top: 0 });'), true);
  assert.equal(appSource.includes("target.category === 'settings' && target.blockId"), true);
  assert.equal(appSource.includes('skipNextMainScrollResetRef.current = true;'), true);
  assert.equal(appSource.includes('setExpandedGroupIds((current'), true);
  assert.equal(scrollEffectsSource.includes("setDraftAmount('')"), false);
  assert.equal(scrollEffectsSource.includes("setAccountNameDraft('')"), false);
  assert.equal(scrollEffectsSource.includes("setRollupPasteText('')"), false);
  assert.equal(scrollEffectsSource.includes('window.localStorage'), false);
});

test('home asset stat label stays above amount with muted visual weight', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const homeHeadingSource = appSource.slice(
    appSource.indexOf('className="net-worth-summary__heading"'),
    appSource.indexOf('className={`net-worth-change')
  );

  assert.equal(appSource.includes('className="net-worth-summary__heading"'), true);
  assert.equal(
    homeHeadingSource.indexOf('net-worth-summary__label') <
      homeHeadingSource.indexOf('net-worth-summary__amount'),
    true
  );
  assert.equal(appSource.includes('className="net-worth-summary__amount"'), true);
  assert.equal(appSource.includes('formatHomeMoneyAmount(homeAssetStatValue'), true);
  assert.equal(appSource.includes('formatHomeMoneyAmount(group.total)'), true);
  assert.equal(appSource.includes('formatHomeMoneyAmount(account.amount)'), true);
  assert.match(
    stylesSource,
    /--home-stat-amount-size:\s*2\.6rem;[\s\S]*--home-stat-label-scale:\s*0\.42;[\s\S]*--home-stat-label-size:\s*calc\(var\(--home-stat-amount-size\) \* var\(--home-stat-label-scale\)\);/
  );
  assert.match(
    stylesSource,
    /\.net-worth-summary__heading\s*\{[^}]*display: grid;[^}]*grid-auto-rows: max-content;[^}]*font-size: var\(--home-stat-amount-size\);[^}]*line-height: 0\.95;[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.net-worth-summary__label\s*\{[^}]*color: var\(--text-muted\);[^}]*font-size: var\(--home-stat-label-size\);[^}]*font-weight: 700;[^}]*line-height: 1;[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.net-worth-change\s*\{[^}]*margin-top: calc\(var\(--home-stat-label-size\) \+ var\(--home-stat-label-to-amount-gap\)\);[^}]*\}/s
  );
});

test('account add form uses aligned add control and weak footer buttons', () => {
  const appSource = readProjectFile('src/App.tsx');
  const accountEditorSource = readProjectFile('src/features/account/AccountEditorDialog.tsx');
  const stylesSource = readProjectFile('src/styles.css');

  assert.equal(appSource.includes('<AccountCreateDialog'), true);
  assert.equal(accountEditorSource.includes('className="account-type-select-row"'), true);
  assert.equal(accountEditorSource.includes('className="account-add-form-button account-add-form-button--secondary"'), true);
  assert.equal(accountEditorSource.includes('className="account-add-form-button account-add-form-button--primary"'), true);
  assert.equal(stylesSource.includes('--account-input-height'), true);
  assert.equal(stylesSource.includes('--account-input-height: var(--nf-control-height);'), true);
  const accountTypeAddButtonBlock =
    stylesSource.match(/\.account-type-add-button\s*\{[^}]*\}/s)?.[0] ?? '';
  assert.equal(accountTypeAddButtonBlock.includes('width: var(--account-input-height);'), true);
  assert.equal(accountTypeAddButtonBlock.includes('height: var(--account-input-height);'), true);
  assert.equal(accountTypeAddButtonBlock.includes('min-height: var(--account-input-height);'), true);
  assert.equal(accountTypeAddButtonBlock.includes('align-items: center;'), true);
  assert.equal(accountTypeAddButtonBlock.includes('justify-content: center;'), true);
  assert.match(stylesSource, /\.account-add-form-button:hover,\s*\.account-add-form-button:focus-visible\s*\{/);
  assert.match(stylesSource, /\.account-add-form-button\s*\{[^}]*min-height: var\(--nf-control-height\);[^}]*padding: 0 14px;[^}]*\}/s);
  assert.match(stylesSource, /\.account-add-form-button:active\s*\{[^}]*transform: translateY\(1px\);[^}]*\}/s);
  assert.equal(/\.account-add-form-button--primary\s*\{[^}]*button-primary-bg/.test(stylesSource), false);
});

test('settings and chart copy remove duplicate labels without changing chart wiring', () => {
  const appSource = readProjectFile('src/App.tsx');
  const allocationPanelSource = readProjectFile('src/features/charts/AssetAllocationPanel.tsx');
  const trendPanelSource = readProjectFile('src/features/charts/AssetTrendPanel.tsx');
  const chartSettingsPanelSource = readProjectFile('src/features/charts/ChartSettingsPanel.tsx');
  const groupStructureSource = appSource.slice(
    appSource.indexOf('function GroupDetailStructurePanel'),
    appSource.indexOf('const getGroupDetailTrendBoundaryMessage')
  );
  const groupDetailActionsSource = appSource.slice(
    appSource.indexOf('const renderGroupDetailActions = () =>'),
    appSource.indexOf('const renderGlobalSettingsSegmented')
  );

  assert.equal(appSource.includes(['首页显示', '资产统计数值类型'].join('')), false);
  assert.equal(appSource.includes('资产统计数值类型'), true);
  assert.equal(appSource.includes('function AssetStructurePanel'), false);
  assert.equal(appSource.includes('function AssetTrendPanel'), false);
  assert.equal(appSource.includes('function ChartLegendList'), false);
  assert.equal(appSource.includes('<AssetChartsPanel'), true);
  assert.equal(appSource.includes('<AssetAllocationPanel'), true);
  assert.equal(appSource.includes('<AssetTrendPanel'), true);
  assert.equal(appSource.includes('<ChartSettingsPanel'), true);
  assert.equal(allocationPanelSource.includes('<h2>资产占比</h2>'), true);
  assert.equal(appSource.includes(['<p className="eyebrow">', '资产结构', '</p>'].join('')), false);
  assert.equal(trendPanelSource.includes('<h2>资产趋势</h2>'), true);
  assert.equal(chartSettingsPanelSource.includes('title="图表设置"'), true);
  assert.equal(chartSettingsPanelSource.includes('返回资产总览'), true);
  assert.equal(chartSettingsPanelSource.includes('className="right-panel-page"'), true);
  assert.equal(chartSettingsPanelSource.includes('className="right-panel-page-action"'), true);
  assert.equal(chartSettingsPanelSource.includes('footer={<RightPanelActionButton'), false);
  assert.equal(
    chartSettingsPanelSource.indexOf('</RightPanelSection>') <
      chartSettingsPanelSource.indexOf('className="right-panel-page-action"'),
    true
  );
  assert.equal(groupDetailActionsSource.includes('title="图表参数设置"'), true);
  assert.equal(groupDetailActionsSource.includes('footer={renderRightPanelActionButton'), false);
  assert.equal(groupDetailActionsSource.includes("className: 'right-panel-page-action'"), true);
  assert.equal(
    groupDetailActionsSource.indexOf('ariaDisabled={isLockedByGlobal}') <
      groupDetailActionsSource.indexOf("className: 'right-panel-page-action'"),
    true
  );
  assert.equal(groupStructureSource.includes('<span>当前合计</span>'), false);
  assert.equal(groupStructureSource.includes('formatChartNumber(data.signedTotal)'), false);
  assert.equal(groupStructureSource.includes('<circle cx="60" cy="60" r="38"'), true);
  assert.equal(groupStructureSource.includes('activeSegmentId={hoveredSeriesId}'), true);
  assert.equal(groupStructureSource.includes('onActiveIdChange={setHoveredSeriesId}'), true);
  assert.equal(appSource.includes('选中后立即影响正负变化数字的文本颜色和标签底色。'), false);
  assert.equal(appSource.includes('决定图表颜色按创建顺序固定分配，或按当前占比动态分配。'), false);
  assert.equal(appSource.includes('主题、正负值颜色与首页资产统计显示。'), false);
  assert.equal(appSource.includes('图表配色、首页缩略图表与全局图表控制。'), false);
  assert.equal(appSource.includes('搜索逻辑与关键词匹配方式。'), false);
  assert.equal(appSource.includes('用户配置文件、历史记录备份、快照与示例数据。'), false);
  assert.equal(appSource.includes('登录密码、自动锁定与快照加密。'), false);
  assert.equal(appSource.includes('软件信息、字体许可、联系与版本信息。'), false);
  assert.equal(appSource.includes('强相关：结果更保守，只显示更确定的匹配。'), false);
  assert.equal(appSource.includes('允许推断：允许日期、金额、拼音、近似等推断匹配。'), false);
});

test('shared control height drives right panel, settings, segmented, and modal buttons', () => {
  const stylesSource = readProjectFile('src/styles.css');

  assert.equal(stylesSource.includes('--nf-control-height: 40px;'), true);
  assert.equal(stylesSource.includes('--input-height: var(--nf-control-height);'), true);
  assert.equal(stylesSource.includes('--modal-button-height: var(--nf-control-height);'), true);
  assert.equal(stylesSource.includes('--segmented-control-height: var(--nf-control-height);'), true);
  assert.equal(stylesSource.includes('--right-panel-action-height: var(--nf-control-height);'), true);
  assert.equal(stylesSource.includes('var(--nf-control-height) - var(--segmented-control-padding) * 2'), true);
  assert.equal(stylesSource.includes('--segmented-control-height: 44px;'), false);
  assert.equal(stylesSource.includes('--segmented-control-height: 40px;'), false);
  assert.match(stylesSource, /\.segmented-control\s*\{[^}]*height: var\(--segmented-control-height\);[^}]*min-height: var\(--segmented-control-height\);[^}]*max-height: var\(--segmented-control-height\);[^}]*\}/s);
  assert.match(stylesSource, /\.segmented-control > button\s*\{[^}]*height: 100%;[^}]*min-height: var\(--segmented-control-option-height\);[^}]*max-height: var\(--segmented-control-option-height\);[^}]*\}/s);
  assert.match(stylesSource, /\.right-panel-label input,\s*\.right-panel-path-row > div\s*\{[^}]*height: var\(--input-height\);[^}]*min-height: var\(--input-height\);[^}]*padding: 0 var\(--nf-control-padding-x\);[^}]*\}/s);
  assert.match(stylesSource, /\.account-operation-panel input\.account-operation-input\s*\{[^}]*height: var\(--input-height\);[^}]*min-height: var\(--input-height\);[^}]*\}/s);
  assert.match(stylesSource, /\.global-settings-button-row button,\s*\.global-settings-reserved-button\s*\{[^}]*height: var\(--nf-control-height\);[^}]*min-height: var\(--nf-control-height\);[^}]*max-height: var\(--nf-control-height\);[^}]*\}/s);
  assert.match(stylesSource, /\.modal-button\s*\{[^}]*height: var\(--modal-button-height\);[^}]*min-height: var\(--modal-button-height\);[^}]*max-height: var\(--modal-button-height\);[^}]*padding: 0 14px;[^}]*\}/s);
  assert.match(stylesSource, /\.account-operation-button\s*\{[^}]*height: var\(--nf-control-height\);[^}]*min-height: var\(--nf-control-height\);[^}]*max-height: var\(--nf-control-height\);[^}]*padding: 0 14px;[^}]*\}/s);
  assert.match(stylesSource, /\.rollup-small-button\s*\{[^}]*min-height: var\(--nf-control-height\);[^}]*padding: 0 10px;[^}]*\}/s);
  assert.equal(/@media[\s\S]*--nf-control-height\s*:/.test(stylesSource), false);
  assert.equal(/:(?:hover|active)[^{]*\{[^}]*\b(?:height|min-height|padding|padding-block|padding-top|padding-bottom)\s*:/.test(stylesSource), false);
});

test('global settings right navigation reuses the home right panel action rhythm', () => {
  const stylesSource = readProjectFile('src/styles.css');
  const navBlock = stylesSource.match(/\.global-settings-nav\s*\{[^}]*\}/s)?.[0] ?? '';
  const navButtonBlock = stylesSource.match(/\.global-settings-nav__item\s*\{[^}]*\}/s)?.[0] ?? '';
  const navButtonStrongBlock = stylesSource.match(/\.global-settings-nav__item strong\s*\{[^}]*\}/s)?.[0] ?? '';
  const rightPanelActionBlock = stylesSource.match(/\.right-panel-action\s*\{[^}]*\}/s)?.[0] ?? '';

  assert.match(navBlock, /gap: var\(--right-panel-action-gap\);/);
  assert.match(navBlock, /row-gap: var\(--right-panel-action-gap\);/);
  assert.match(navBlock, /align-content: start;/);
  assert.match(navBlock, /align-items: stretch;/);
  assert.match(navBlock, /margin: 0;/);
  assert.match(navBlock, /padding: 0;/);
  assert.match(navButtonBlock, /box-sizing: border-box;/);
  assert.match(navButtonBlock, /display: grid;/);
  assert.match(navButtonBlock, /gap: 4px;/);
  assert.match(navButtonBlock, /align-content: center;/);
  assert.match(navButtonBlock, /align-items: center;/);
  assert.match(navButtonBlock, /height: var\(--right-panel-action-height\);/);
  assert.match(navButtonBlock, /min-height: var\(--right-panel-action-height\);/);
  assert.match(navButtonBlock, /max-height: var\(--right-panel-action-height\);/);
  assert.match(navButtonBlock, /padding: 0 13px;/);
  assert.equal(/padding-(?:block|top|bottom)\s*:/.test(navButtonBlock), false);
  assert.match(navButtonStrongBlock, /line-height: 1\.25;/);
  assert.match(rightPanelActionBlock, /min-height: var\(--right-panel-action-height\);/);
  assert.equal(/(?:^|\n)\s*height: var\(--right-panel-action-height\);/.test(rightPanelActionBlock), false);
});

test('popup and system prompt copy removes sentence periods without touching dotted technical values', () => {
  const appSource = readProjectFile('src/App.tsx');
  const confirmDialogSource = readProjectFile('src/components/dialogs/ConfirmDialog.tsx');
  const inputDialogSource = readProjectFile('src/components/dialogs/InputDialog.tsx');
  const noticeDialogSource = readProjectFile('src/components/dialogs/NoticeDialog.tsx');
  const accountEditorSource = readProjectFile('src/features/account/AccountEditorDialog.tsx');
  const accountInfoEditorSource = readProjectFile('src/features/account/AccountInfoEditorDialog.tsx');
  const passwordEditorSource = readProjectFile('src/features/settings/PasswordEditorDialog.tsx');
  const snapshotPasswordEditorSource = readProjectFile(
    'src/features/settings/SnapshotPasswordEditorDialog.tsx'
  );
  const snapshotEncryptionDisableSource = readProjectFile(
    'src/features/settings/SnapshotEncryptionDisableDialog.tsx'
  );
  const packageJson = JSON.parse(readProjectFile('package.json')) as { version?: string };

  const popupSources = [
    appSource.slice(appSource.indexOf('const enterExampleMode'), appSource.indexOf('const getUserSettingsExportPayload')),
    appSource.slice(appSource.indexOf('const requestFirstPasswordSetup'), appSource.indexOf('const closeConfirmationDialog')),
    appSource.slice(appSource.indexOf('const renderFlashExitConfirm'), appSource.indexOf('const getChangeDisplay')),
    appSource.slice(appSource.indexOf('const confirmRollupImportWrite'), appSource.indexOf('const chooseQuickSingleEntryAccount')),
    appSource.slice(appSource.indexOf('const selectAutoBackupDirectory'), appSource.indexOf('const selectCalendarDate')),
    appSource.slice(appSource.indexOf('const renderPasswordDisableConfirm'), appSource.indexOf('const renderLockScreen')),
    appSource.slice(appSource.indexOf('<ConfirmDialog'), appSource.indexOf('{resetConfirmation ? (')),
    appSource.slice(appSource.indexOf('<AccountAmountEditorDialog'), appSource.indexOf('{accountTypeEditor && isAccountTypeEditorVisible ? (')),
    appSource.slice(appSource.indexOf('{accountTypeEditor && isAccountTypeEditorVisible ? ('), appSource.indexOf('{renderFirstWelcome()}')),
    confirmDialogSource,
    inputDialogSource,
    noticeDialogSource,
    accountEditorSource,
    accountInfoEditorSource,
    passwordEditorSource,
    snapshotPasswordEditorSource,
    snapshotEncryptionDisableSource
  ].filter((source) => source.length > 0);
  const popupSource = popupSources.join('\n');
  const dialogFieldTexts = Array.from(
    popupSource.matchAll(/\b(?:title|message|confirmLabel|cancelLabel|eyebrow|label):\s*'([^']*)'/g),
    (match) => match[1]
  );
  const systemPromptTexts = Array.from(
    popupSource.matchAll(/window\.(?:alert|confirm|prompt)\(\s*'([^']*)'/g),
    (match) => match[1]
  );
  const dottedPopupText = [...dialogFieldTexts, ...systemPromptTexts].filter((text) =>
    /[。.]$/.test(text)
  );

  assert.deepEqual(dottedPopupText, []);
  assert.equal(packageJson.version, '0.9.2');
  assert.equal(appSource.includes('netraflow-settings-${year}${month}${day}-${hour}${minute}${second}.netraflow-settings.json'), true);
  assert.equal(appSource.includes("encrypted ? '.encrypted' : ''"), true);
});

test('changelog includes the 0.9.2 local release notes', () => {
  const changelogSource = readProjectFile('CHANGELOG.md');

  assert.equal(changelogSource.includes('## 0.9.2'), true);
  assert.equal(changelogSource.includes('### 闪记'), true);
  assert.equal(changelogSource.includes('### 全局搜索'), true);
  assert.equal(changelogSource.includes('### 汇总导入'), true);
  assert.equal(changelogSource.includes('新增 GitHub Releases 链接入口'), true);
  assert.equal(changelogSource.includes('当前版本更新为 0.9.2'), true);
  assert.equal(changelogSource.includes('App.tsx'), false);
  assert.equal(changelogSource.includes('RightPanelSection'), false);
  assert.equal(changelogSource.includes('npm test'), false);
});

test('flash note visual copy removes extra eyebrows and keeps mode labels explicit', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const flashSelectSource = readProjectFile('src/features/flashNote/FlashSelectStep.tsx');
  const selectionToolsSource = flashSelectSource.slice(
    flashSelectSource.indexOf('const selectionTools'),
    flashSelectSource.indexOf('const dateRuleTools')
  );
  const dateRuleToolsSource = flashSelectSource.slice(
    flashSelectSource.indexOf('const dateRuleTools'),
    flashSelectSource.indexOf('export function FlashSelectStep')
  );
  const flashExitSource = appSource.slice(
    appSource.indexOf('const renderFlashExitConfirm'),
    appSource.indexOf('const renderFlashReturnDateConfirm')
  );

  assert.equal(flashSelectSource.includes('<p className="eyebrow">输入模式</p>'), false);
  assert.equal(flashSelectSource.includes('净值变动（change）'), true);
  assert.equal(flashSelectSource.includes('账户余额（balance）'), true);
  assert.equal(flashSelectSource.includes("label: '单选'"), true);
  assert.equal(flashSelectSource.includes("label: '交集'"), false);
  assert.equal(flashSelectSource.includes("label: '合集'"), true);
  assert.equal(flashSelectSource.includes("label: '删除'"), true);
  assert.equal(flashSelectSource.includes('单选/拖选'), false);
  assert.equal(flashSelectSource.includes('合集/合并'), false);
  assert.equal(flashSelectSource.includes('删除/相减'), false);
  assert.equal(selectionToolsSource.includes("mode: 'intersect'"), false);
  assert.equal(selectionToolsSource.match(/mode: '/g)?.length ?? 0, 3);
  assert.equal(dateRuleToolsSource.match(/rule: '/g)?.length ?? 0, 3);
  assert.equal(dateRuleToolsSource.includes("rule: 'all'"), true);
  assert.equal(dateRuleToolsSource.includes("rule: 'weekday'"), true);
  assert.equal(dateRuleToolsSource.includes("rule: 'weekend'"), true);
  assert.equal(appSource.includes("'date-select'"), false);
  assert.equal(appSource.includes("'mode-select'"), false);
  assert.equal(appSource.includes("'sequence-input'"), false);
  assert.equal(appSource.includes("'correction'"), false);
  assert.equal(flashExitSource.includes('退出闪记'), false);
  assert.match(stylesSource, /\.flash-note-mode-select\s*\{[^}]*place-items: center;[^}]*\}/s);
  assert.match(
    stylesSource,
    /\.flash-note-calendar-panel\s*\{[^}]*--flash-note-month-gap: 12px;[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.flash-note-calendar-header\s*\{[^}]*display: grid;[^}]*grid-template-columns: minmax\(0, 1fr\) var\(--flash-note-month-gap\) minmax\(0, 1fr\);[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.flash-note-calendar-header > button:first-child\s*\{[^}]*grid-column: 1;[^}]*justify-self: start;[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.flash-note-calendar-header > button:last-child\s*\{[^}]*grid-column: 3;[^}]*justify-self: end;[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.flash-note-tool-row\s*\{[^}]*grid-column: 1 \/ -1;[^}]*grid-row: 1;[^}]*justify-self: center;[^}]*display: inline-flex;[^}]*width: fit-content;[^}]*justify-content: center;[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.flash-note-double-month\s*\{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[^}]*gap: var\(--flash-note-month-gap\);[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.flash-note-icon-tool\s*\{[^}]*box-sizing: border-box;[^}]*width: var\(--nf-control-height\);[^}]*min-width: var\(--nf-control-height\);[^}]*max-width: var\(--nf-control-height\);[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.flash-note-rule-tools button\s*\{[^}]*width: var\(--nf-control-height\);[^}]*min-width: var\(--nf-control-height\);[^}]*max-width: var\(--nf-control-height\);[^}]*\}/s
  );
});

test('local responsive tightening stays scoped to home stat, page titles, and right panel controls', () => {
  const stylesSource = readProjectFile('src/styles.css');
  const bodyBlock = stylesSource.match(/body\s*\{[^}]*\}/s)?.[0] ?? '';

  assert.equal(bodyBlock.includes('font-size'), false);
  assert.match(stylesSource, /@media \(max-width: 1400px\)\s*\{[\s\S]*--home-stat-amount-size: 2\.42rem;[\s\S]*\.right-action-panel\s*\{[\s\S]*--segmented-control-font-size: 0\.92rem;[\s\S]*\}/);
  assert.match(stylesSource, /@media \(max-width: 1200px\)\s*\{[\s\S]*--home-stat-amount-size: 2\.28rem;[\s\S]*\.right-action-panel\s*\{[\s\S]*--segmented-control-padding: 3px;[\s\S]*\}/);
  assert.equal(stylesSource.includes('--settings-page-title-size'), true);
  assert.equal(stylesSource.includes('--rollup-page-title-size'), true);
  assert.equal(stylesSource.includes('--chart-page-title-size'), true);
  assert.equal(stylesSource.includes('--right-panel-title-size'), true);
  assert.equal(stylesSource.includes('--right-panel-label-size'), true);
});

test('home account type edit mode exposes centered sort and delete actions', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const entryStart = appSource.indexOf('data-account-type-entry="true"');
  const entrySource = appSource.slice(
    entryStart,
    appSource.indexOf('{expanded ? (', entryStart)
  );
  const longPressSource = appSource.slice(
    appSource.indexOf('const startGroupPointerInteraction'),
    appSource.indexOf('const openCreateAccountType')
  );

  assert.equal(longPressSource.includes('interaction.longPressTriggered = true'), true);
  assert.equal(longPressSource.includes('setExpandedGroupIds([])'), true);
  assert.equal(
    longPressSource.indexOf('setExpandedGroupIds([])') <
      longPressSource.indexOf('setIsGroupEditMode(true)'),
    true
  );
  assert.equal(longPressSource.includes('setIsGroupEditMode(true)'), true);
  assert.equal(entrySource.includes('className="account-type-entry-actions"'), true);
  assert.equal(entrySource.includes('account-type-action-button--sort'), true);
  assert.equal(entrySource.includes('account-type-action-button--delete'), true);
  assert.equal(entrySource.includes('NfSortIcon'), true);
  assert.equal(entrySource.includes('NfWindowCloseIcon'), true);
  assert.equal(entrySource.includes('data-interactive'), true);
  assert.equal(entrySource.includes('disabled={!canDeleteGroup}'), true);
  assert.equal(entrySource.includes('deleteAssetGroup(group.id)'), true);
  assert.equal(entrySource.includes('canDeleteAssetGroup(group.id, accounts)'), true);
  assert.equal(entrySource.indexOf('</button>') < entrySource.indexOf('account-type-entry-actions'), true);
  assert.equal(entrySource.includes('draggable={isGroupEditMode}'), true);
  assert.equal(entrySource.includes('handleGroupDragStart(event, group.id)'), true);
  assert.equal(entrySource.includes('handleGroupDragOver(event, group.id)'), true);
  assert.equal(entrySource.includes('handleGroupDragLeave(event, group.id)'), true);
  assert.equal(entrySource.includes('handleGroupDrop(event, group.id)'), true);
  assert.equal(entrySource.includes('onDragEnd={handleGroupDragEnd}'), true);
  assert.equal(entrySource.includes('data-account-type-drop-indicator'), true);
  assert.equal(entrySource.includes('account-type-entry--drop-${groupDropPosition}'), true);
  assert.equal(appSource.includes('const getGroupDropPosition'), true);
  assert.equal(appSource.includes('setGroupDropIndicator({ groupId, position })'), true);
  assert.equal(appSource.includes('setGroupDropIndicator(null)'), true);
  assert.match(
    stylesSource,
    /\.account-type-entry-actions\s*\{[^}]*position: absolute;[^}]*top: 50%;[^}]*left: 50%;[^}]*justify-content: center;[^}]*transform: translate\(-50%, -50%\);[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.account-type-entry--drop-before::before,[\s\S]*?\.account-type-entry--drop-after::after\s*\{[^}]*background: color-mix\(in srgb, var\(--accent-border\) 68%, transparent\);[^}]*opacity: 1;[^}]*\}/s
  );
});

test('asset group delete action uses danger styling and clears dangling group ui state', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const cleanupSource = appSource.slice(
    appSource.indexOf('const clearDeletedAssetGroupUiState'),
    appSource.indexOf('const deleteAssetGroup')
  );
  const deleteSource = appSource.slice(
    appSource.indexOf('const deleteAssetGroup'),
    appSource.indexOf('const getHistoryTypeLabel')
  );
  const updateAppDataSource = appSource.slice(
    appSource.indexOf('const updateAppData'),
    appSource.indexOf('const updateAssetChartSettings')
  );

  assert.match(
    stylesSource,
    /\.account-type-action-button--delete\s*\{[^}]*border-color: var\(--danger-border\);[^}]*color: var\(--danger-text\);[^}]*cursor: pointer;[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.account-type-action-button--delete:not\(:disabled\):hover,[\s\S]*?\.account-type-action-button--delete:not\(:disabled\):focus-visible\s*\{[^}]*border-color: var\(--danger-border-strong\);[^}]*background: var\(--danger-bg\);[^}]*color: var\(--danger-text\);[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.account-type-action-button:disabled\s*\{[^}]*color: var\(--text-subtle\);[^}]*cursor: not-allowed;[^}]*opacity: 0\.46;[^}]*\}/s
  );
  assert.equal(deleteSource.includes('canDeleteAssetGroup(groupId, accounts)'), true);
  assert.equal(
    deleteSource.includes('deleteAssetGroupFromAppData({ groups: assetGroups, accounts, history }, groupId)'),
    true
  );
  assert.equal(deleteSource.includes('updateAppData(nextData)'), true);
  assert.equal(deleteSource.includes('saveAppData'), false);
  assert.equal(updateAppDataSource.includes('if (!isExampleMode)'), true);
  assert.equal(updateAppDataSource.includes('saveAppData(normalizedData)'), true);
  [
    'setExpandedGroupIds',
    "setSelectedGroupDetailId('')",
    'setSelectedAccount(null)',
    'setIsAccountChartsOpen(false)',
    'closeEditor()',
    'closeAccountInfoEditor()',
    'setFlashNoteAccount(null)',
    'closeAccountTypeEditor()',
    'setNewAccountGroupId',
    'setNewAccountTypeInput',
    'normalizeTypeSearchText(currentInput) === normalizeTypeSearchText(groupName)',
    'setRollupAccountAssignments'
  ].forEach((expectedSource) => assert.equal(cleanupSource.includes(expectedSource), true));
});
