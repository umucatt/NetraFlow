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
  assert.equal(appSource.includes('获取信息'), true);
  assert.equal(appSource.includes(GITHUB_RELEASES_URL), true);
  assert.equal(appSource.includes('联系我'), false);
  assert.equal(appSource.includes('碎碎念'), false);
  assert.equal(appSource.includes('最后，也是很重要的一点'), false);
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
  const stylesSource = readProjectFile('src/styles.css');
  const legendStart = appSource.indexOf('function ChartLegendList');
  const legendEnd = appSource.indexOf('const useMeasuredWidth');
  const legendSource = appSource.slice(legendStart, legendEnd);
  const svgTextNodeCount = appSource.match(/<text(?:\s|>)/g)?.length ?? 0;
  const chartSvgTextClassCount = appSource.match(/chart-svg-text/g)?.length ?? 0;

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
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const promptDisplayBlock = stylesSource.match(/\.rollup-prompt-display,\s*\.rollup-prompt-display \*\s*\{[^}]*\}/s)?.[0] ?? '';

  assert.match(
    stylesSource,
    /\.rollup-prompt-display,\s*\.rollup-prompt-display \*\s*\{[^}]*user-select: text;[^}]*-webkit-user-select: text;[^}]*cursor: text;[^}]*\}/s
  );
  assert.equal(promptDisplayBlock.includes('pointer-events'), false);
  assert.equal(appSource.includes('className="rollup-import-display rollup-prompt-display"'), true);
  assert.equal(appSource.includes('className="rollup-import-textarea"'), true);
  assert.equal(appSource.includes('rollup-import-textarea rollup-prompt-display'), false);
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
  const rollupPageSource = appSource.slice(
    appSource.indexOf('const renderRollupPromptPanel'),
    appSource.indexOf('const renderHomeActions')
  );

  assert.equal(rollupPageSource.includes('<p className="eyebrow">汇总导入</p>'), false);
  assert.equal(rollupPageSource.includes('<h1>汇总记录导入</h1>'), true);
  assert.equal(rollupPageSource.includes("'操作区'"), false);
  assert.equal(rollupPageSource.includes("'汇总导入'"), true);
  assert.equal(
    rollupPageSource.match(/null,\s*'right-panel-section--rollup-import-actions'/g)?.length ?? 0,
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

  assert.equal(globalNavSource.includes('关于净流'), true);
  assert.equal(globalNavSource.includes('global-settings-nav__return'), true);
  assert.equal(globalNavSource.indexOf('关于净流') < globalNavSource.indexOf('返回资产总览'), true);
  assert.equal(globalNavSource.includes('onClick={closeGlobalSettings}'), true);
  assert.equal(rollupActionsSource.match(/label: '返回资产总览'/g)?.length ?? 0, 2);
  assert.equal(rollupActionsSource.includes('onClick: closeRollupImport'), true);
  assert.equal(stylesSource.includes('right-panel-section--rollup-import-actions'), true);
});

test('global search includes manual settings category without old result containers', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const searchTypesSource = readProjectFile('src/search/searchTypes.ts');
  const searchPanelSource = readProjectFile('src/components/search/GlobalSearchPanel.tsx');
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
  assert.equal(appSource.includes('键入关键词开始搜索'), true);
  assert.equal(appSource.includes('暂无预览项'), true);
  assert.equal(appSource.includes('global-search-preview-empty'), true);
  assert.equal(
    appSource.match(/className="right-panel-preview right-panel-preview--search-empty"/g)?.length ?? 0,
    2
  );
  assert.equal(appSource.includes('right-panel-preview--search-empty'), true);
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
  const searchPreviewSource = appSource.slice(
    appSource.indexOf('const getSearchPreviewTypeLabel'),
    appSource.indexOf('const renderSearchPreview =')
  );
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
  const pagePositionSearchItemStart = appSource.indexOf("id: 'appearance-page-position-memory'");
  const searchItemSource = appSource.slice(
    pagePositionSearchItemStart,
    appSource.indexOf("id: 'charts'", pagePositionSearchItemStart)
  );
  const settingsControlSource = appSource.slice(
    appSource.indexOf('<div id="global-settings-page-position-memory">'),
    appSource.indexOf("if (globalSettingsSection === 'charts')")
  );

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
  assert.equal(settingsControlSource.includes("globalSettings.pagePositionMemoryMode"), true);
  assert.equal(settingsControlSource.includes("updatePagePositionMemoryMode"), true);
});

test('confirmation dialog and Windows app identity use restrained UI and NetraFlow metadata', () => {
  const appSource = readProjectFile('src/App.tsx');
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
        shortcutName?: string;
        uninstallDisplayName?: string;
        installerIcon?: string;
        uninstallerIcon?: string;
        include?: string;
      };
    };
  };
  const dialogSource = appSource.slice(
    appSource.indexOf('{confirmationDialog ? ('),
    appSource.indexOf('{resetConfirmation ? (')
  );

  assert.equal(appSource.includes("eyebrow: '放弃编辑'"), false);
  assert.equal(appSource.includes('eyebrow: null'), false);
  assert.equal(dialogSource.includes('{confirmationDialog.eyebrow ? ('), true);
  assert.equal(dialogSource.includes('modal-button--primary'), false);
  assert.equal(dialogSource.includes('modal-button modal-button--secondary'), true);
  assert.equal(dialogSource.includes('confirmationDialog.tone === \'danger\''), true);
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
  assert.equal(packageJson.build?.nsis?.perMachine, false);
  assert.equal(packageJson.build?.nsis?.allowToChangeInstallationDirectory, true);
  assert.equal(packageJson.build?.nsis?.createDesktopShortcut, true);
  assert.equal(packageJson.build?.nsis?.createStartMenuShortcut, true);
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

  assert.equal(installerSource.includes('!define NETRAFLOW_INSTALL_DIR_NAME "NertaFlow"'), true);
  assert.equal(installerSource.includes('Function NetraFlowFindDefaultInstallDir'), true);
  assert.equal(installerSource.includes('ReadEnvStr $NetraFlowWindowsDir "WINDIR"'), true);
  assert.equal(installerSource.includes('GetLogicalDrives'), true);
  assert.equal(installerSource.includes('GetDriveType'), true);
  assert.equal(installerSource.includes('$0 == 3'), true);
  assert.equal(installerSource.includes('$NetraFlowDriveLetter != $NetraFlowSystemDrive'), true);
  assert.equal(installerSource.includes('StrCpy $INSTDIR "$NetraFlowPreferredDrive:\\${NETRAFLOW_INSTALL_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('!undef APP_FILENAME'), true);
  assert.equal(installerSource.includes('!define APP_FILENAME "${NETRAFLOW_INSTALL_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('Function NetraFlowNormalizeInstallDir'), true);
  assert.equal(installerSource.includes('Function .onVerifyInstDir'), true);
  assert.equal(installerSource.includes('!define MUI_PAGE_CUSTOMFUNCTION_LEAVE NetraFlowInstallModeLeave'), true);
  assert.equal(installerSource.includes('Function NetraFlowApplyDefaultInstallDir'), true);
  assert.equal(installerSource.includes('Function NetraFlowInstallModeLeave'), true);
  assert.equal(installerSource.includes('Function NetraFlowInstFilesPre'), false);
  assert.equal(installerSource.includes('!macro customPageAfterChangeDir'), false);
  assert.equal(installerSource.includes('MUI_PAGE_CUSTOMFUNCTION_PRE'), false);
  assert.equal(installerSource.includes('StrCpy $0 "$CMDLINE"'), true);
  assert.equal(installerSource.includes('$4 == "/D="'), true);
  assert.equal(installerSource.includes('Call NetraFlowFindDefaultInstallDir'), true);
  assert.equal(installerSource.includes('StrCpy $INSTDIR "$NetraFlowSelectedDir\\${NETRAFLOW_INSTALL_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('StrCpy $INSTDIR "$NetraFlowSelectedDir${NETRAFLOW_INSTALL_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('StrCpy $NetraFlowSelectedDir "$NetraFlowSelectedDir" -10'), true);
  assert.equal(installerSource.includes('StrCpy $INSTDIR "$NetraFlowSelectedDir" -9'), true);
  assert.equal(installerSource.includes('StrCpy $INSTDIR "$INSTDIR${NETRAFLOW_INSTALL_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('"\\NertaFlow\\NetraFlow"'), true);
  assert.equal(installerSource.includes('"\\NertaFlow\\NertaFlow"'), true);
  assert.equal(installerSource.includes('"\\Software\\NertaFlow\\NetraFlow"'), false);
  assert.equal(packageSource.includes('"afterPack": "scripts/after-pack-installer.mjs"'), true);
  assert.equal(packageSource.includes('"APP_PACKAGE_URL"'), false);
  assert.equal(installerSource.includes('RMDir /r "$APPDATA\\${NETRAFLOW_PRODUCT_NAME}"'), true);
  assert.equal(installerSource.includes('RMDir /r "$LOCALAPPDATA\\${NETRAFLOW_PRODUCT_NAME}"'), true);
  assert.equal(installerSource.includes('RMDir /r "$INSTDIR\\userData"'), true);
  assert.equal(installerSource.includes('Delete "$LOCALAPPDATA\\netraflow-updater\\installer.exe"'), true);
  assert.equal(installerSource.includes('RMDir /r "$LOCALAPPDATA\\netraflow-updater"'), true);
  assert.equal(installerSource.includes('Delete "$INSTDIR\\uninstallerIcon.ico"'), true);
  assert.equal(installerSource.includes('Delete "$INSTDIR\\installerIcon.ico"'), true);
  assert.equal(installerSource.includes('Delete "$INSTDIR\\netraflow.ico"'), true);
  assert.equal(installerSource.includes('Delete "$INSTDIR\\NetraFlow.ico"'), true);
  assert.equal(installerSource.includes('Delete "${TARGET_DIR}\\uninstallerIcon.ico"'), true);
  assert.equal(installerSource.includes('Delete "${TARGET_DIR}\\installerIcon.ico"'), true);
  assert.equal(installerSource.includes('Delete "${TARGET_DIR}\\netraflow.ico"'), true);
  assert.equal(installerSource.includes('Delete "${TARGET_DIR}\\NetraFlow.ico"'), true);
  assert.equal(installerSource.includes('!macro NetraFlowRemoveKnownInstallContents TARGET_DIR'), true);
  assert.equal(installerSource.includes('!insertmacro NetraFlowRemoveKnownInstallContents "$R0"'), true);
  assert.equal(installerSource.includes('!insertmacro NetraFlowRemoveKnownInstallContents "$R0\\NetraFlow"'), true);
  assert.equal(installerSource.includes('!insertmacro NetraFlowRemoveKnownInstallContents "$R0\\NertaFlow"'), true);
  assert.equal(installerSource.includes('RMDir "$INSTDIR\\${NETRAFLOW_PRODUCT_NAME}"'), true);
  assert.equal(installerSource.includes('RMDir "$INSTDIR\\${NETRAFLOW_INSTALL_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('DeleteRegKey HKCU "Software\\${NETRAFLOW_PRODUCT_NAME}"'), true);
  assert.equal(installerSource.includes('DeleteRegKey HKCU "Software\\${NETRAFLOW_APP_ID}"'), true);
  assert.equal(installerSource.includes('Delete "$DESKTOP\\${NETRAFLOW_PRODUCT_NAME}.lnk"'), true);
  assert.equal(installerSource.includes('Delete "$SMPROGRAMS\\${NETRAFLOW_PRODUCT_NAME}.lnk"'), true);
  assert.equal(installerSource.includes('Delete "$APPDATA\\Microsoft\\Internet Explorer\\Quick Launch\\User Pinned\\TaskBar\\${NETRAFLOW_PRODUCT_NAME}.lnk"'), true);
  assert.equal(installerSource.includes('${If} $R3 == "\\NetraFlow"'), true);
  assert.equal(installerSource.includes('${OrIf} $R3 == "\\NertaFlow"'), true);
  assert.equal(installerSource.includes('RMDir /r "$R0"'), false);
  assert.equal(installerSource.includes('RMDir "$R0"'), true);
  assert.equal(installerSource.includes('RMDir /r "$NetraFlowPreferredDrive:\\"'), false);
  assert.equal(installerSource.includes('RMDir /r "$INSTDIR"'), false);
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
  const stylesSource = readProjectFile('src/styles.css');

  assert.equal(appSource.includes('className="history-browse-panel two-column-page-panel"'), true);
  assert.equal(appSource.includes('className="history-filter-panel"'), true);
  assert.equal(appSource.includes('className="history-calendar-panel"'), true);
  assert.equal(appSource.includes('className="history-result-list-panel"'), true);
  assert.equal(appSource.includes("background: 'var(--panel-bg-strong)'"), true);
  assert.equal(stylesSource.includes('--two-column-panel-padding: 22px;'), true);
  assert.equal(stylesSource.includes('--right-panel-padding: var(--two-column-panel-padding);'), true);
  assert.match(stylesSource, /\.left-browse-panel\.card\s*\{[^}]*padding: var\(--two-column-panel-padding\);[^}]*\}/s);
  assert.match(stylesSource, /\.right-action-panel\s*\{[^}]*padding: var\(--right-panel-padding\);[^}]*\}/s);
  assert.match(stylesSource, /\.layout-layer--left \.search-panel\s*\{[^}]*padding: var\(--two-column-panel-padding\) !important;[^}]*\}/s);
});

test('local Noto fonts, emoji fallback, and about-page license copy stay wired', () => {
  const appSource = readProjectFile('src/App.tsx');
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
  assert.equal(appSource.includes('开源许可'), true);
  assert.equal(appSource.includes('className="about-netraflow__license-label">字体</p>'), true);
  assert.equal(appSource.includes('<h3 id="netraflow-font-license-title">字体</h3>'), false);
  assert.equal(appSource.includes('NetraFlow 内置使用 Noto Sans CJK SC 与 Noto Sans Symbols 2'), true);
  assert.equal(appSource.includes('NetraFlow 内置使用 Noto Sans CJK SC 与 Noto Sans Symbols 2。'), false);
  assert.equal(appSource.includes('Noto Fonts 由 The Noto Project Authors 提供'), true);
  assert.equal(appSource.includes('授权使用。'), false);
  assert.ok(
    appSource.indexOf('about-netraflow__license') <
      appSource.indexOf('about-netraflow__contact')
  );
  const aboutPageSource = appSource.slice(
    appSource.indexOf('<section className="about-netraflow">'),
    appSource.indexOf('const renderGlobalSettingsPage')
  );
  const contactToCatSource = aboutPageSource.slice(
    aboutPageSource.indexOf('about-netraflow__contact'),
    aboutPageSource.indexOf('className="about-netraflow__cat"')
  );
  assert.equal(appSource.includes('NETRAFLOW_MEMO_PARAGRAPHS'), false);
  assert.equal(appSource.includes('about-netraflow__memo'), false);
  assert.equal(stylesSource.includes('about-netraflow__memo'), false);
  assert.equal(appSource.includes('<strong>净流 NetraFlow</strong>'), false);
  assert.equal(appSource.includes('借助 ChatGPT 和 Codex、Windsurf'), false);
  assert.equal(appSource.includes('<h3 id="netraflow-contact-title">获取信息</h3>'), true);
  assert.equal(appSource.includes('about-netraflow__info-button--bilibili'), true);
  assert.equal(appSource.includes('about-netraflow__info-button--github'), true);
  assert.equal(appSource.includes('NfGithubIcon'), true);
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
  const stylesSource = readProjectFile('src/styles.css');
  const restorePanelSource = appSource.slice(
    appSource.indexOf('className="account-add-restore-panel"'),
    appSource.indexOf('className="account-add-restore-panel account-add-restore-panel--form"')
  );

  assert.equal(restorePanelSource.includes('账户新增 / 恢复'), false);
  assert.equal(restorePanelSource.includes('简易搜索'), false);
  assert.equal(appSource.includes('归档旧账户'), false);
  assert.equal(appSource.includes('归档旧帐户'), false);
  assert.equal(restorePanelSource.includes('getArchivedAccountRestoreTitle(account)'), true);
  assert.equal(
    restorePanelSource.includes('getArchivedAccountArchivedAtLabel(account.archivedAt)'),
    true
  );
  assert.equal(
    restorePanelSource.includes('account-operation-button account-restore-card__restore-button'),
    true
  );
  assert.equal(stylesSource.includes('--account-add-panel-bg: var(--panel-bg-strong);'), true);
  assert.equal(stylesSource.includes('.account-restore-card__restore-button'), true);
});

test('quick entry picker and example account aliases use current title and mark rules', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const exampleDataSource = readProjectFile('src/exampleData.ts');
  const quickPickerSource = appSource.slice(
    appSource.indexOf('{isQuickSingleEntryAccountPickerOpen ? ('),
    appSource.indexOf('{editingAccount && currentAccount ? (')
  );

  assert.equal(quickPickerSource.includes('<p className="eyebrow">记一笔</p>'), false);
  assert.equal(quickPickerSource.includes('<h2 id="quick-single-entry-title">选择账户</h2>'), true);
  assert.equal(appSource.includes('quick-single-entry-account-group'), true);
  assert.match(
    stylesSource,
    /\.quick-single-entry-account-picker\s*\{[^}]*gap: 0;[^}]*\}/s
  );
  assert.match(
    stylesSource,
    /\.quick-single-entry-account-picker \.flash-note-account-group\s*\{[^}]*align-items: center;[^}]*min-height: 54px;[^}]*padding-block: 10px;[^}]*\}/s
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
  const stylesSource = readProjectFile('src/styles.css');
  const accountDetailSource = appSource.slice(
    appSource.indexOf('selectedAccount && selectedAccountEntry ? ('),
    appSource.indexOf('<h2 style={{ margin: 0, fontSize: \'1.2rem\' }}>账户变动记录</h2>')
  );
  const accountTrendPanelSource = appSource.slice(
    appSource.indexOf('function AccountTrendPanel'),
    appSource.indexOf('function GroupDetailStructurePanel')
  );
  const accountActionsSource = appSource.slice(
    appSource.indexOf('const renderAccountActions'),
    appSource.indexOf('const renderDangerActions')
  );
  const dangerActionsSource = appSource.slice(
    appSource.indexOf('const renderDangerActions'),
    appSource.indexOf('const renderHistoryActions')
  );
  const amountEditorSource = appSource.slice(
    appSource.indexOf('{editingAccount && currentAccount ? ('),
    appSource.indexOf('{editingAccountInfo && accountInfoEntry ? (')
  );
  const accountInfoEditorSource = appSource.slice(
    appSource.indexOf('{editingAccountInfo && accountInfoEntry ? ('),
    appSource.indexOf('{isAddingAccount ? (')
  );

  assert.equal(accountDetailSource.includes('<p className="eyebrow"'), false);
  assert.equal(accountDetailSource.includes('className="account-detail-title">{selectedAccountTitle}</h1>'), true);
  assert.equal(accountDetailSource.includes('l0-chart-button l0-chart-button--trend account-detail-chart-thumbnail'), true);
  assert.match(stylesSource, /\.account-detail-title\s*\{[^}]*font-size: var\(--chart-page-title-size\);[^}]*\}/s);
  assert.equal(accountTrendPanelSource.includes('ChartLegendList'), false);
  assert.equal(accountTrendPanelSource.includes('accountName'), false);
  assert.match(stylesSource, /\.account-detail-header\s*\{[^}]*display: flex;[^}]*justify-content: space-between;[^}]*\}/s);
  assert.match(stylesSource, /\.account-detail-chart-thumbnail\s*\{[^}]*flex: 0 1 min\(292px, 42%\);[^}]*width: min\(292px, 100%\);[^}]*\}/s);
  assert.match(stylesSource, /@media \(max-width: 760px\)\s*\{[\s\S]*\.account-detail-header\s*\{[^}]*flex-wrap: wrap;[^}]*\}[\s\S]*\.account-detail-chart-thumbnail\s*\{[^}]*flex-basis: min\(292px, 100%\);[^}]*\}/);
  assert.equal(accountActionsSource.includes("'账户变更'"), true);
  assert.equal(accountActionsSource.includes("'账户操作'"), false);
  assert.equal(accountActionsSource.includes("label: '账户图表'"), false);
  assert.equal(accountActionsSource.includes('openAccountChartsPage'), false);
  assert.equal(accountActionsSource.includes('className="right-panel-preview"'), false);
  assert.equal(dangerActionsSource.includes('归档与删除需要再次确认'), false);
  assert.equal(dangerActionsSource.includes('归档后可在账户新增 / 恢复中重新启用'), false);
  assert.equal(dangerActionsSource.includes('删除后不可恢复'), false);
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
  assert.equal(appSource.includes('setExpandedGroupNames((currentNames) =>'), true);
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
  const stylesSource = readProjectFile('src/styles.css');

  assert.equal(appSource.includes('className="account-type-select-row"'), true);
  assert.equal(appSource.includes('className="account-add-form-button account-add-form-button--secondary"'), true);
  assert.equal(appSource.includes('className="account-add-form-button account-add-form-button--primary"'), true);
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
  const groupStructureSource = appSource.slice(
    appSource.indexOf('function GroupDetailStructurePanel'),
    appSource.indexOf('const getGroupDetailTrendBoundaryMessage')
  );

  assert.equal(appSource.includes(['首页显示', '资产统计数值类型'].join('')), false);
  assert.equal(appSource.includes('资产统计数值类型'), true);
  assert.equal(appSource.includes('<h2>资产占比</h2>'), true);
  assert.equal(appSource.includes(['<p className="eyebrow">', '资产结构', '</p>'].join('')), false);
  assert.equal(appSource.includes('<h2>资产趋势</h2>'), true);
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
  const packageJson = JSON.parse(readProjectFile('package.json')) as { version?: string };

  const popupSources = [
    appSource.slice(appSource.indexOf('const enterExampleMode'), appSource.indexOf('const getUserSettingsExportPayload')),
    appSource.slice(appSource.indexOf('const requestFirstPasswordSetup'), appSource.indexOf('const closeConfirmationDialog')),
    appSource.slice(appSource.indexOf('const renderFlashExitConfirm'), appSource.indexOf('const getChangeDisplay')),
    appSource.slice(appSource.indexOf('const confirmRollupImportWrite'), appSource.indexOf('const chooseQuickSingleEntryAccount')),
    appSource.slice(appSource.indexOf('const selectAutoBackupDirectory'), appSource.indexOf('const selectCalendarDate')),
    appSource.slice(appSource.indexOf('const renderPasswordDisableConfirm'), appSource.indexOf('const renderLockScreen')),
    appSource.slice(appSource.indexOf('{backupReminderPrompt ? ('), appSource.indexOf('{confirmationDialog ? (')),
    appSource.slice(appSource.indexOf('{confirmationDialog ? ('), appSource.indexOf('{editingAccount && currentAccount ? (')),
    appSource.slice(appSource.indexOf('{accountTypeEditor && isAccountTypeEditorVisible ? ('), appSource.indexOf('{renderFirstWelcome()}'))
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
  assert.equal(changelogSource.includes('### 闪记精简'), true);
  assert.equal(changelogSource.includes('### 全局搜索重构'), true);
  assert.equal(changelogSource.includes('新增 GitHub Releases 链接'), true);
  assert.equal(changelogSource.includes('当前版本更新为 0.9.2'), true);
});

test('flash note visual copy removes extra eyebrows and keeps mode labels explicit', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectFile('src/styles.css');
  const flashModeSource = appSource.slice(
    appSource.indexOf('const renderFlashModeSelectionStage'),
    appSource.indexOf('const getFlashTypewriterWeeks')
  );
  const flashExitSource = appSource.slice(
    appSource.indexOf('const renderFlashExitConfirm'),
    appSource.indexOf('const renderFlashReturnDateConfirm')
  );

  assert.equal(flashModeSource.includes('<p className="eyebrow">输入模式</p>'), false);
  assert.equal(flashModeSource.includes('净值变动（change）'), true);
  assert.equal(flashModeSource.includes('账户余额（balance）'), true);
  assert.equal(flashExitSource.includes('退出闪记'), false);
  assert.match(stylesSource, /\.flash-note-mode-select\s*\{[^}]*place-items: center;[^}]*\}/s);
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
