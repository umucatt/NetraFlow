/// <reference types="node" />

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { getPageCoverage } from '../app/navigation/pageCoverageLogic';
import {
  forgetPageScrollTop,
  readPageScrollTop,
  rememberPageScrollTop
} from '../app/scroll/pageScrollMemoryLogic';

const readProjectFile = (path: string) =>
  readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

const projectRootPath = fileURLToPath(new URL('../../../', import.meta.url));

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

const readHeadProjectFile = (path: string) =>
  execFileSync('git', ['show', `HEAD:${path}`], {
    cwd: projectRootPath,
    encoding: 'utf8'
  });

const normalizeLineEndings = (source: string) => source.replace(/\r\n/g, '\n');

const extractNsisDefineText = (source: string, defineName: string) => {
  const match = source.match(new RegExp(`!define ${defineName} "([^"]*)"`));

  assert.ok(match, `Missing NSIS define ${defineName}`);

  return match[1];
};

const extractNsisDialogTexts = (source: string) =>
  Array.from(
    source.matchAll(/\$\{NSD_Create(?:Label|Checkbox)\}\s+[^\n]*\s+"([^"]*)"/g),
    (match) => match[1]
  );

const assertNoSentencePeriods = (texts: string[]) => {
  const dottedTexts = texts.filter((text) => /[。.]/.test(text));

  assert.deepEqual(dottedTexts, []);
};

const GITHUB_RELEASES_URL = 'https://github.com/umucatt/NetraFlow/releases';

test('global settings chart labels keep only the intended chart controls', () => {
  const appSource = readProjectFile('src/App.tsx');
  const settingsPageSource = readProjectFile('src/features/settings/SettingsPage.tsx');

  assert.equal(`${appSource}\n${settingsPageSource}`.includes('功能跳转'), false);
  assert.equal(`${appSource}\n${settingsPageSource}`.includes('L0图表'), false);
  assert.equal(`${appSource}\n${settingsPageSource}`.includes('账户占比显示'), false);
  assert.equal(`${appSource}\n${settingsPageSource}`.includes('账户趋势显示'), false);
  assert.equal(settingsPageSource.includes('首页缩略图表'), true);
  assert.equal(settingsPageSource.includes('资产结构显示'), true);
  assert.equal(settingsPageSource.includes('资产趋势显示'), true);
  assert.equal(appSource.includes('首页缩略图表'), false);
});

test('line chart y-axis range copy replaces adaptive y-axis wording everywhere visible', () => {
  const settingsPageSource = readProjectFile('src/features/settings/SettingsPage.tsx');
  const chartSettingsPanelSource = readProjectFile('src/features/charts/ChartSettingsPanel.tsx');
  const accountChartSettingsSource = readProjectFile(
    'src/features/account/AccountChartSettingsPanel.tsx'
  );
  const assetTrendPanelSource = readProjectFile('src/features/charts/AssetTrendPanel.tsx');
  const settingsSectionLogicSource = readProjectFile(
    'src/features/settings/settingsSectionLogic.ts'
  );
  const chartDisplayPanelSource = readProjectFile('src/features/charts/ChartDisplayPanel.tsx');
  const visibleCopySource = [
    settingsPageSource,
    chartSettingsPanelSource,
    accountChartSettingsSource,
    assetTrendPanelSource,
    settingsSectionLogicSource,
    chartDisplayPanelSource
  ].join('\n');

  assert.equal(visibleCopySource.includes('自适应纵轴'), false);
  assert.equal(visibleCopySource.includes('趋势已放大'), false);
  assert.match(
    settingsPageSource,
    /label="纵轴范围"[\s\S]*value: 'dynamic', label: '动态范围'[\s\S]*value: 'baseline', label: '基准范围'[\s\S]*currentValue=\{assetChartSettings\.trend\.adaptiveYAxis \? 'dynamic' : 'baseline'\}[\s\S]*adaptiveYAxis: value === 'dynamic'/
  );
  assert.match(
    chartSettingsPanelSource,
    /'纵轴范围'[\s\S]*value: 'dynamic', label: '动态范围'[\s\S]*value: 'baseline', label: '基准范围'[\s\S]*settings\.trend\.adaptiveYAxis \? 'dynamic' : 'baseline'[\s\S]*adaptiveYAxis: value === 'dynamic'/
  );
  assert.match(
    accountChartSettingsSource,
    /'纵轴范围'[\s\S]*value: 'dynamic', label: '动态范围'[\s\S]*value: 'baseline', label: '基准范围'[\s\S]*settings\.adaptiveYAxis \? 'dynamic' : 'baseline'[\s\S]*adaptiveYAxis: value === 'dynamic'/
  );
  assert.equal(chartDisplayPanelSource.includes('adaptiveYAxis'), false);
});

test('total and account line charts share point value label avoidance layout', () => {
  const mainContentRendererSource = readProjectFile(
    'src/app/mainContent/MainContentRenderer.tsx'
  );
  const chartDisplayPanelSource = readProjectFile('src/features/charts/ChartDisplayPanel.tsx');
  const assetTrendPanelSource = readProjectFile('src/features/charts/AssetTrendPanel.tsx');

  assert.equal(chartDisplayPanelSource.includes('<AssetTrendPanel'), true);
  assert.equal(mainContentRendererSource.includes('<AssetTrendChart'), true);
  assert.equal(assetTrendPanelSource.includes('buildSteppedLineSegments'), true);
  assert.equal(assetTrendPanelSource.includes('lineSegments: visibleLineSegments'), true);
  assert.equal(assetTrendPanelSource.includes('pointObstacles: visiblePointObstacles'), true);
  assert.equal(assetTrendPanelSource.includes('resolveLinePointLabelLayout'), true);
  assert.equal(assetTrendPanelSource.includes('placedLabelRects'), true);
  assert.equal(assetTrendPanelSource.includes("allowHide: settings.pointValueMode === 'adaptive'"), true);
  assert.equal(assetTrendPanelSource.includes('isEndPoint: index === series.values.length - 1'), true);
  assert.equal(assetTrendPanelSource.includes('if (labelLayout.hidden)'), true);
  assert.equal(assetTrendPanelSource.includes('dominantBaseline={labelLayout.dominantBaseline}'), true);
  assert.equal(chartDisplayPanelSource.includes('getChartValueLabelLayout'), true);
  assert.equal(chartDisplayPanelSource.includes('buildSteppedLineSegments'), false);
  assert.equal(chartDisplayPanelSource.includes('resolveLinePointLabelLayout'), false);
});

test('global settings security and about copy match the current release text', () => {
  const appSource = readProjectFile('src/App.tsx');
  const settingsPageSource = readProjectFile('src/features/settings/SettingsPage.tsx');
  const aboutPanelSource = readProjectFile('src/features/settings/AboutNetraFlowPanel.tsx');
  const packageJson = JSON.parse(readProjectFile('package.json')) as { version?: string };
  const packageLockJson = JSON.parse(readProjectFile('package-lock.json')) as {
    version?: string;
    packages?: Record<string, { version?: string }>;
  };

  assert.equal(settingsPageSource.includes('是否开启登陆密码保护'), true);
  assert.equal(packageJson.version, '0.9.5');
  assert.equal(packageLockJson.version, '0.9.5');
  assert.equal(packageLockJson.packages?.['']?.version, '0.9.5');
  assert.equal(appSource.includes('APP_VERSION'), true);
  assert.equal(appSource.includes('0.9.1'), false);
  assert.equal(aboutPanelSource.includes('获取信息'), true);
  assert.equal(appSource.includes(GITHUB_RELEASES_URL), true);
  assert.equal(`${appSource}\n${settingsPageSource}\n${aboutPanelSource}`.includes('联系我'), false);
  assert.equal(`${appSource}\n${settingsPageSource}\n${aboutPanelSource}`.includes('碎碎念'), false);
  assert.equal(
    `${appSource}\n${settingsPageSource}\n${aboutPanelSource}`.includes('最后，也是很重要的一点'),
    false
  );
});

test('global settings rendering and item assembly live in settings feature', () => {
  const appSource = readProjectFile('src/App.tsx');
  const mainContentRendererSource = readProjectFile(
    'src/app/mainContent/MainContentRenderer.tsx'
  );
  const rightPanelRendererSource = readProjectFile('src/app/rightPanel/RightPanelRenderer.tsx');
  const settingsPageSource = readProjectFile('src/features/settings/SettingsPage.tsx');
  const settingsSectionLogicSource = readProjectFile(
    'src/features/settings/settingsSectionLogic.ts'
  );
  const appearanceSettingsPanelSource = readProjectFile(
    'src/features/settings/AppearanceSettingsPanel.tsx'
  );
  const searchSettingsPanelSource = readProjectFile(
    'src/features/settings/SearchSettingsPanel.tsx'
  );
  const backupSettingsPanelSource = readProjectFile(
    'src/features/settings/BackupSettingsPanel.tsx'
  );
  const settingsFeatureSource = [
    settingsPageSource,
    settingsSectionLogicSource,
    appearanceSettingsPanelSource,
    searchSettingsPanelSource,
    backupSettingsPanelSource
  ].join('\n');

  assert.equal(appSource.includes('<MainContentRenderer'), true);
  assert.equal(mainContentRendererSource.includes('<SettingsPage {...settings.pageProps} />'), true);
  assert.equal(appSource.includes('<RightPanelRenderer'), true);
  assert.equal(rightPanelRendererSource.includes('<SettingsNavigationPanel'), true);
  assert.equal(appSource.includes('const renderGlobalSettingsPage'), false);
  assert.equal(appSource.includes('const renderGlobalSettingsContent'), false);
  assert.equal(appSource.includes('const renderGlobalSettingsSegmented'), false);
  assert.equal(appSource.includes('const renderGlobalSettingsControl'), false);
  assert.equal(settingsPageSource.includes('function SettingsPage'), true);
  assert.equal(settingsPageSource.includes('export function SettingsNavigationPanel'), true);
  assert.equal(settingsSectionLogicSource.includes('export const GLOBAL_SETTINGS_SEARCH_ITEMS'), true);
  assert.equal(settingsSectionLogicSource.includes('export const GLOBAL_SETTINGS_NAV_ITEMS'), true);
  assert.equal(settingsFeatureSource.includes('global-settings-page-position-memory'), true);
  assert.equal(settingsFeatureSource.includes('global-settings-search-logic'), true);
  assert.equal(settingsFeatureSource.includes('EXAMPLE_DATA_SETTINGS_BLOCK_ID'), true);
  assert.equal(settingsFeatureSource.includes('图表配色遵循'), true);
  assert.equal(settingsFeatureSource.includes('用户配置文件'), true);
  assert.equal(settingsFeatureSource.includes('是否开启登陆密码保护'), true);
  assert.equal(settingsFeatureSource.includes('快照加密'), true);
});

test('global search settings block keeps standard settings layout wiring', () => {
  const searchSettingsPanelSource = readProjectFile(
    'src/features/settings/SearchSettingsPanel.tsx'
  );
  const stylesSource = readProjectStyles();

  assert.equal(searchSettingsPanelSource.includes('id="global-settings-search-logic"'), true);
  assert.equal(searchSettingsPanelSource.includes('label="允许推断"'), true);
  assert.equal(searchSettingsPanelSource.includes("{ value: 'infer', label: '开启' }"), true);
  assert.equal(searchSettingsPanelSource.includes("{ value: 'strict', label: '关闭' }"), true);
  assert.equal(searchSettingsPanelSource.includes('onSearchLogicModeChange'), true);
  assert.equal(searchSettingsPanelSource.includes('global-settings-field--search-logic'), false);
  assert.equal(stylesSource.includes('.global-settings-field--search-logic'), false);
});

test('page surfaces and right panel page frames stay scoped', () => {
  const appSource = readProjectFile('src/App.tsx');
  const mainContentRendererSource = readProjectFile(
    'src/app/mainContent/MainContentRenderer.tsx'
  );
  const rightPanelRendererSource = readProjectFile('src/app/rightPanel/RightPanelRenderer.tsx');
  const settingsPageSource = readProjectFile('src/features/settings/SettingsPage.tsx');
  const stylesSource = readProjectStyles();
  const searchPreviewPanelSource = readProjectFile('src/components/search/SearchPreviewPanel.tsx');
  const accountActionsSource = readProjectFile('src/features/account/AccountActionsPanel.tsx');
  const dangerActionsSource = readProjectFile('src/features/account/AccountDangerActionsPanel.tsx');
  const rollupControllerSource = readProjectFile(
    'src/features/rollupImport/useRollupImportController.ts'
  );
  const globalSettingsPageSource = settingsPageSource.slice(
    settingsPageSource.indexOf('function SettingsPage'),
    settingsPageSource.indexOf('export function SettingsNavigationPanel')
  );
  const mainPanelSource = appSource.slice(
    appSource.indexOf('const isSecuritySettingsPageDisabled'),
    appSource.indexOf('const settingsPageProps')
  );
  const historyActionsSource = rightPanelRendererSource.slice(
    rightPanelRendererSource.indexOf("case 'history':"),
    rightPanelRendererSource.indexOf("case 'archived':")
  );
  const snapshotActionsSource = rightPanelRendererSource.slice(
    rightPanelRendererSource.indexOf('function SnapshotActions'),
    rightPanelRendererSource.indexOf('function GroupDetailActions')
  );
  const globalSettingsNavSource = settingsPageSource.slice(
    settingsPageSource.indexOf('export function SettingsNavigationPanel'),
    settingsPageSource.indexOf('export default SettingsPage')
  );
  const rollupActionsSource = rightPanelRendererSource.slice(
    rightPanelRendererSource.indexOf("case 'rollup-import':"),
    rightPanelRendererSource.indexOf("case 'account-danger':")
  );
  const homeActionsSource = rightPanelRendererSource.slice(
    rightPanelRendererSource.indexOf("case 'home':"),
    rightPanelRendererSource.indexOf('default:')
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
  assert.equal(mainContentRendererSource.includes('<DashboardPage {...dashboard.pageProps} />'), true);
  assert.equal(
    mainContentRendererSource.includes('<RollupImportPage {...rollupImport.pageProps} />'),
    true
  );
  assert.equal(mainContentRendererSource.includes('<SettingsPage {...settings.pageProps} />'), true);
  assert.equal(appSource.includes('mainContentAriaDisabled={isSecuritySettingsPageDisabled}'), true);
  assert.match(disabledLeftPageBlock, /border-radius: var\(--radius-page\);/);

  assert.equal(homeActionsSource.includes('renderRightPanelPage('), true);
  assert.equal(historyActionsSource.includes('renderRightPanelPage('), true);
  assert.equal(snapshotActionsSource.includes('right-panel-page right-panel-page--snapshot'), true);
  assert.equal(snapshotActionsSource.includes('right-panel-spacer'), false);
  assert.equal(appSource.includes("backupReturnTarget === 'global-settings-backup' ? '返回数据与备份' : '返回历史记录'"), false);
  assert.equal(snapshotActionsSource.includes('snapshot.returnLabel'), false);
  assert.equal(historyActionsSource.includes('关闭历史记录'), false);
  assert.equal(appSource.includes(['backup', 'Rem', 'inderPrompt'].join('')), false);
  [
    '\u5feb\u7167\u63d0\u9192',
    '\u63d0\u9192\u5468\u671f',
    '\u66f4\u6539\u63d0\u9192\u5468\u671f'
  ].forEach((removedText) => assert.equal(appSource.includes(removedText), false));
  assert.equal(globalSettingsNavSource.includes("'right-panel-page'"), true);
  assert.equal(globalSettingsNavSource.includes('className={panelClassName}'), true);
  assert.equal(appSource.includes('actionsClassName: rollupImport.actionsClassName'), true);
  assert.equal(rollupActionsSource.includes('rollupImport.actionsClassName'), true);
  assert.equal(rollupControllerSource.includes('right-panel-page--rollup-import-actions'), true);
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
    appSource.indexOf('const formatMoney')
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
  const rightPanelRendererSource = readProjectFile('src/app/rightPanel/RightPanelRenderer.tsx');
  const dashboardSummarySource = readProjectFile('src/features/dashboard/DashboardSummaryCards.tsx');
  const overviewSource = readProjectFile('src/features/overview/AssetOverviewPage.tsx');
  const stylesSource = readProjectStyles();
  const iconIndexSource = readProjectFile('src/assets/icons/index.ts');
  const homeActionsSource = rightPanelRendererSource.slice(
    rightPanelRendererSource.indexOf("case 'home':"),
    rightPanelRendererSource.indexOf('default:')
  );
  const homeHeadingSource = dashboardSummarySource.slice(
    dashboardSummarySource.indexOf('className="net-worth-summary__heading"'),
    dashboardSummarySource.indexOf('className={`net-worth-change')
  );
  const homeSurfaceSource = `${appSource}\n${dashboardSummarySource}\n${overviewSource}`;

  assert.equal(homeSurfaceSource.includes('legendColorByName.get(group.name)'), true);
  assert.equal(homeSurfaceSource.includes('account-type-legend-swatch'), true);
  assert.equal(iconIndexSource.includes('nf-action-add.svg?raw'), true);
  assert.equal(iconIndexSource.includes('nf-rollup-source-wide.svg?raw'), true);
  assert.equal(rightPanelRendererSource.includes('className="rollup-import-source-icon"'), true);
  assert.equal(rightPanelRendererSource.includes('className="home-action-entry__icon"'), true);
  assert.equal(homeActionsSource.includes('home-example-mode-badge'), true);
  assert.equal(homeActionsSource.includes('titleAccessory'), false);
  assert.equal(homeActionsSource.includes('home.isExampleMode ? ('), true);
  assert.equal(homeActionsSource.includes('type="button"'), true);
  assert.equal(homeActionsSource.includes('className="home-example-mode-badge"'), true);
  assert.equal(homeActionsSource.includes('aria-label="打开示例数据设置"'), true);
  assert.equal(appSource.includes('onOpenExampleDataSettings: openExampleDataSettingsFromHome'), true);
  assert.equal(homeActionsSource.includes('onClick={home.onOpenExampleDataSettings}'), true);
  assert.equal(homeActionsSource.includes('<div className="home-example-mode-badge">'), false);
  assert.equal(homeHeadingSource.includes('示例模式'), false);
  assert.equal(stylesSource.includes('--nf-control-height: 40px;'), true);
  assert.equal(stylesSource.includes('--right-panel-action-height: var(--nf-control-height);'), true);
  assert.equal(stylesSource.includes('--right-panel-action-gap: var(--nf-control-gap);'), true);
  assert.match(stylesSource, /\.right-panel-title-row\s*\{[^}]*align-items: center;[^}]*justify-content: space-between;[^}]*\}/s);
  assert.match(stylesSource, /\.right-panel-action\s*\{[^}]*min-height: var\(--right-panel-action-height\);[^}]*padding: 0 13px;[^}]*align-content: center;[^}]*\}/s);
  assert.match(stylesSource, /\.home-example-mode-badge\s*\{[^}]*justify-self: end;[^}]*\}/s);
  assert.match(stylesSource, /\.home-example-mode-badge\s*\{[^}]*border: 0;[^}]*cursor: pointer;[^}]*\}/s);
  assert.match(stylesSource, /\.home-example-mode-badge:hover,\s*\.home-example-mode-badge:focus-visible\s*\{[^}]*background:[^}]*color:[^}]*\}/s);
  assert.match(stylesSource, /\.home-example-mode-badge:focus-visible\s*\{[^}]*outline: 2px solid var\(--border-strong\);[^}]*outline-offset: 2px;[^}]*\}/s);
  assert.match(stylesSource, /\.home-action-entry__icon\s*\{[^}]*width: 28px;[^}]*height: 28px;[^}]*align-items: center;[^}]*justify-content: center;[^}]*\}/s);
  assert.equal(existsSync(new URL('../../../src/assets/icons/common/nf-action-add.svg', import.meta.url)), true);
  assert.equal(existsSync(new URL('../../../src/assets/icons/source/nf-rollup-source-wide.svg', import.meta.url)), true);
});

test('chart visual text selection rules stay scoped away from legends', () => {
  const appSource = readProjectFile('src/App.tsx');
  const allocationPanelSource = readProjectFile('src/features/charts/AssetAllocationPanel.tsx');
  const trendPanelSource = readProjectFile('src/features/charts/AssetTrendPanel.tsx');
  const legendSource = readProjectFile('src/features/charts/ChartLegendList.tsx');
  const stylesSource = readProjectStyles();
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
  const stylesSource = readProjectStyles();
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
  const stylesSource = readProjectStyles();
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
  const rightPanelRendererSource = readProjectFile('src/app/rightPanel/RightPanelRenderer.tsx');
  const stylesSource = readProjectStyles();
  const rollupLogicSource = readProjectFile('src/rollupImportLogic.ts');
  const rollupControllerSource = readProjectFile(
    'src/features/rollupImport/useRollupImportController.ts'
  );
  const rollupActionsPanelSource = readProjectFile(
    'src/features/rollupImport/RollupImportActionsPanel.tsx'
  );
  const rollupPageSource = [
    rollupActionsPanelSource,
    readProjectFile('src/features/rollupImport/RollupImportPage.tsx'),
    readProjectFile('src/features/rollupImport/RollupPromptPanel.tsx'),
    readProjectFile('src/features/rollupImport/RollupImportDropzone.tsx'),
    readProjectFile('src/features/rollupImport/RollupRiskSummary.tsx'),
    readProjectFile('src/features/rollupImport/RollupReviewPanel.tsx'),
    readProjectFile('src/features/rollupImport/RollupAccountAssignmentList.tsx'),
    readProjectFile('src/features/rollupImport/RollupRecordGroupList.tsx')
  ].join('\n');
  const rollupActionsSource = rightPanelRendererSource.slice(
    rightPanelRendererSource.indexOf("case 'rollup-import':"),
    rightPanelRendererSource.indexOf("case 'account-danger':")
  );

  assert.equal(rollupPageSource.includes('<p className="eyebrow">汇总导入</p>'), false);
  assert.equal(rollupPageSource.includes('<h1>汇总记录导入</h1>'), true);
  assert.equal(rollupPageSource.includes('提示词解释：面向使用者的说明，帮助你了解如何准备材料与使用外部工具'), true);
  assert.equal(rollupPageSource.includes('提示词：面向外部 AI 的任务说明，用于生成 NetraFlow 可导入的汇总 JSON'), true);
  assert.equal(rollupPageSource.includes('风险等级'), true);
  assert.equal(rollupPageSource.includes('账户关键词'), true);
  assert.equal(rollupPageSource.includes('舍弃本次导入'), true);
  assert.equal(rollupPageSource.includes('全部导入'), true);
  assert.equal(rollupActionsSource.includes("'操作区'"), false);
  assert.equal(appSource.includes('title: rollupImport.actionsTitle'), true);
  assert.equal(rollupActionsSource.includes('<RollupImportActionsPanel'), true);
  assert.equal(appSource.includes('actionsClassName: rollupImport.actionsClassName'), true);
  assert.equal(rollupActionsSource.includes('rollupImport.actionsClassName'), true);
  assert.equal(rollupControllerSource.includes("actionsTitle: importReview ? '本次导入' : '汇总导入'"), true);
  assert.equal(rollupControllerSource.includes("actionsClassName: 'right-panel-page--rollup-import-actions'"), true);
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
  assert.equal(appSource.includes('parseRollupImportJson'), false);
  assert.equal(appSource.includes('ROLLUP_IMPORT_PROMPT'), false);
  assert.equal(appSource.includes('RollupImportDropzone'), false);
  assert.equal(rollupControllerSource.includes('parseRollupImportJson'), true);
  assert.equal(rollupControllerSource.includes('areAllRollupGroupsAssigned'), true);
  assert.equal(rollupControllerSource.includes('ROLLUP_IMPORT_PROMPT'), true);
  assert.equal(rollupActionsPanelSource.includes('label="复制提示词"'), true);
  assert.equal(rollupActionsPanelSource.includes('<RollupImportDropzone'), true);
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

test('overview return entries are absent from settings and rollup import', () => {
  const rightPanelRendererSource = readProjectFile('src/app/rightPanel/RightPanelRenderer.tsx');
  const stylesSource = readProjectStyles();
  const settingsSectionLogicSource = readProjectFile(
    'src/features/settings/settingsSectionLogic.ts'
  );
  const settingsPageSource = readProjectFile('src/features/settings/SettingsPage.tsx');
  const globalNavSource = `${settingsSectionLogicSource}\n${settingsPageSource.slice(
    settingsPageSource.indexOf('export function SettingsNavigationPanel'),
    settingsPageSource.indexOf('export default SettingsPage')
  )}`;
  const rollupActionsSource = rightPanelRendererSource.slice(
    rightPanelRendererSource.indexOf("case 'rollup-import':"),
    rightPanelRendererSource.indexOf("case 'account-danger':")
  );
  const rollupActionsPanelSource = readProjectFile(
    'src/features/rollupImport/RollupImportActionsPanel.tsx'
  );
  const rollupReviewPanelSource = readProjectFile('src/features/rollupImport/RollupReviewPanel.tsx');

  assert.equal(globalNavSource.includes('关于净流'), true);
  assert.equal(globalNavSource.includes('global-settings-nav__return'), false);
  assert.equal(globalNavSource.includes('返回资产总览'), false);
  assert.equal(globalNavSource.includes('onClick={onClose}'), false);
  assert.equal(rollupActionsPanelSource.includes('label="返回资产总览"'), false);
  assert.equal(rollupReviewPanelSource.includes('label="返回资产总览"'), false);
  assert.equal(rollupActionsPanelSource.includes('onClick={props.onClose}'), false);
  assert.equal(rollupActionsPanelSource.includes('复制提示词'), true);
  assert.equal(rollupReviewPanelSource.includes('舍弃本次导入'), true);
  assert.equal(rollupReviewPanelSource.includes('全部导入'), true);
  assert.equal(rollupActionsSource.includes('<RollupImportActionsPanel'), true);
  assert.equal(stylesSource.includes('right-panel-page--rollup-import-actions'), true);
});

test('global search includes manual settings category without old result containers', () => {
  const appSource = readProjectFile('src/App.tsx');
  const rightPanelRendererSource = readProjectFile('src/app/rightPanel/RightPanelRenderer.tsx');
  const stylesSource = readProjectStyles();
  const searchTypesSource = readProjectFile('src/search/searchTypes.ts');
  const settingsSectionLogicSource = readProjectFile(
    'src/features/settings/settingsSectionLogic.ts'
  );
  const searchPanelSource = readProjectFile('src/components/search/GlobalSearchPanel.tsx');
  const searchOverlayLayerSource = readProjectFile(
    'src/app/searchOverlay/SearchOverlayLayer.tsx'
  );
  const overlayLayerPropsSource = readProjectFile('src/app/layers/createOverlayLayerProps.ts');
  const searchPreviewPanelSource = readProjectFile('src/components/search/SearchPreviewPanel.tsx');
  const searchFloatingNavigatorSource = readProjectFile(
    'src/components/search/SearchFloatingNavigator.tsx'
  );
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
  assert.equal(appSource.includes("if (intent.type === 'settings')"), true);
  assert.equal(appSource.includes('setGlobalSettingsSection(intent.section)'), true);
  assert.equal(appSource.includes('setIsGlobalSettingsOpen(true)'), true);
  assert.equal(appSource.includes('<SearchOverlayLayer'), true);
  assert.equal(appSource.includes('panelProps: globalSearch.panelProps'), true);
  assert.equal(overlayLayerPropsSource.includes('floatingNavigator: currentNavigationTarget'), true);
  assert.equal(searchOverlayLayerSource.includes('<GlobalSearchPanel {...panelProps} />'), true);
  assert.equal(
    searchOverlayLayerSource.includes('<SearchFloatingNavigator {...floatingNavigator} />'),
    true
  );
  assert.equal(
    searchOverlayLayerSource.includes(
      'className="layout-layer layout-layer--left layout-layer--search"'
    ),
    true
  );
  assert.equal(appSource.includes('<GlobalSearchPanel {...globalSearch.panelProps} />'), false);
  assert.equal(appSource.includes('<SearchFloatingNavigator'), false);
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
  assert.equal(rightPanelRendererSource.includes('<SearchPreviewPanel'), true);
  assert.equal(searchPreviewPanelSource.includes('键入关键词开始搜索'), true);
  assert.equal(searchPreviewPanelSource.includes('暂无预览项'), true);
  assert.equal(searchPreviewPanelSource.includes('global-search-preview-empty'), true);
  assert.equal(searchPreviewPanelSource.includes('退出搜索'), false);
  assert.equal(searchFloatingNavigatorSource.includes('返回'), false);
  assert.equal(searchFloatingNavigatorSource.includes('退出'), false);
  assert.equal(searchFloatingNavigatorSource.includes('上一条'), true);
  assert.equal(searchFloatingNavigatorSource.includes('下一条'), true);
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
  assert.equal(searchPreviewSource.includes('return <p>{result.subtitle}</p>;'), false);
  assert.equal(searchPreviewSource.includes('const getSettingsPreviewLocation'), true);
  assert.equal(searchPreviewSource.includes('const getSettingsPreviewSummary'), true);
  assert.equal(searchPreviewSource.includes('const getSettingsPreviewItems'), true);
  assert.equal(searchPreviewSource.includes('<span>所属位置</span>'), true);
  assert.equal(searchPreviewSource.includes('<span>说明</span>'), true);
  assert.equal(searchPreviewSource.includes('search-preview-settings__items'), true);
  assert.equal(searchPreviewSource.includes('item.previewItems ?? []).slice(0, 3)'), true);
  assert.equal(stylesSource.includes('.search-preview-settings'), true);
  assert.equal(stylesSource.includes('.search-preview-settings__items'), true);
  const settingsSearchItemsBlock = settingsSectionLogicSource.slice(
    settingsSectionLogicSource.indexOf('export const GLOBAL_SETTINGS_SEARCH_ITEMS'),
    settingsSectionLogicSource.indexOf('] satisfies SettingsSearchItem[];')
  );
  assert.equal(settingsSearchItemsBlock.includes("id: 'search-accounts'"), false);
  assert.equal(settingsSearchItemsBlock.includes("id: 'search-history'"), false);
  assert.equal(settingsSearchItemsBlock.includes("id: 'search-snapshots'"), false);
  assert.equal(settingsSearchItemsBlock.includes("id: 'search-settings-items'"), false);
  assert.equal(settingsSearchItemsBlock.includes("title: '搜索账户'"), false);
  assert.equal(settingsSearchItemsBlock.includes("title: '搜索快照'"), false);
  assert.equal(settingsSearchItemsBlock.includes("title: '搜索历史记录'"), false);
  assert.equal(settingsSearchItemsBlock.includes("title: '搜索设置项'"), false);
  assert.equal(settingsSearchItemsBlock.includes("title: '允许推断'"), true);
  assert.equal(settingsSearchItemsBlock.includes("blockId: 'global-settings-search-logic'"), true);
  assert.equal(
    searchPreviewSource.indexOf('<span>来源</span>') <
      searchPreviewSource.indexOf('<span>备注</span>'),
    true
  );
  assert.equal(
    searchPreviewSource.indexOf("if (result.category === 'settings')") <
      searchPreviewSource.indexOf('<span>所属位置</span>'),
    true
  );
});

test('overlay backdrop and back helpers live in shared overlay infrastructure', () => {
  const appSource = readProjectFile('src/App.tsx');
  const overlayBackdropSource = readProjectFile('src/app/overlay/OverlayBackdrop.tsx');
  const overlayBackSource = readProjectFile('src/app/overlay/useOverlayBack.ts');
  const overlayTypesSource = readProjectFile('src/app/overlay/overlayTypes.ts');
  const overlayIndexSource = readProjectFile('src/app/overlay/index.ts');
  const searchOverlayLayerSource = readProjectFile(
    'src/app/searchOverlay/SearchOverlayLayer.tsx'
  );
  const quickEntryLayerSource = readProjectFile(
    'src/app/quickEntryLayer/QuickEntryPickerLayer.tsx'
  );
  const flashNoteHostLayerSource = readProjectFile(
    'src/app/flashNoteLayer/FlashNoteHostLayer.tsx'
  );
  const archivedAccountsLayerSource = readProjectFile(
    'src/app/archivedAccountsLayer/ArchivedAccountsLayer.tsx'
  );
  const historyBackupLayerSource = readProjectFile(
    'src/app/historyBackupLayer/HistoryBackupLayer.tsx'
  );

  assert.equal(existsSync(new URL('../../../src/app/overlay/OverlayBackdrop.tsx', import.meta.url)), true);
  assert.equal(existsSync(new URL('../../../src/app/overlay/useOverlayBack.ts', import.meta.url)), true);
  assert.equal(existsSync(new URL('../../../src/app/overlay/overlayTypes.ts', import.meta.url)), true);
  assert.equal(existsSync(new URL('../../../src/app/overlay/index.ts', import.meta.url)), true);
  assert.equal(appSource.includes('function OverlayBackdrop'), false);
  assert.equal(appSource.includes('const useOverlayBack ='), false);
  assert.equal(appSource.includes('useOverlayBack'), true);
  assert.match(appSource, /from '\.\/app\/overlay';/);
  assert.equal(appSource.includes('const currentLayerBack: (() => void) | null ='), true);
  assert.equal(appSource.includes('currentLayerBack();'), true);
  assert.equal(overlayTypesSource.includes("HTMLAttributes<HTMLDivElement>"), true);
  assert.equal(overlayTypesSource.includes("'onClick'"), true);
  assert.equal(overlayBackdropSource.includes('export function OverlayBackdrop'), true);
  assert.equal(
    overlayBackdropSource.includes('return <div {...props} {...overlayBackProps} />;'),
    true
  );
  assert.equal(overlayBackSource.includes('onMouseDownCapture'), true);
  assert.equal(overlayBackSource.includes('onMouseUpCapture'), true);
  assert.equal(overlayBackSource.includes('event.target === event.currentTarget'), true);
  assert.equal(overlayBackSource.includes('Math.abs(event.clientX - startedOnBackdrop.x) <= 6'), true);
  assert.equal(overlayIndexSource.includes('export { OverlayBackdrop }'), true);
  [
    searchOverlayLayerSource,
    quickEntryLayerSource,
    flashNoteHostLayerSource,
    archivedAccountsLayerSource,
    historyBackupLayerSource
  ].forEach((layerSource) => {
    assert.equal(layerSource.includes('OverlayBackdrop'), true);
    assert.match(layerSource, /from '\.\.\/overlay';/);
    assert.equal(layerSource.includes('BackdropComponent'), false);
  });
});

test('theme bootstrap resolves first frame before React mounts', () => {
  const appSource = readProjectFile('src/App.tsx');
  const globalSettingsLogicSource = readProjectFile(
    'src/app/globalSettings/globalSettingsLogic.ts'
  );
  const indexSource = readProjectFile('index.html');
  const mainSource = readProjectFile('electron/main.ts');
  const bootstrapSource = indexSource.slice(
    indexSource.indexOf('(function ()'),
    indexSource.indexOf('</script>')
  );

  assert.equal(globalSettingsLogicSource.includes("themeMode: 'system'"), true);
  assert.equal(indexSource.indexOf('<script>') < indexSource.indexOf('<script type="module"'), true);
  assert.equal(
    indexSource.indexOf("window.netraflowStorage.getItem('netraflowGlobalSettings')") <
      indexSource.indexOf('src="/src/main.tsx"'),
    true
  );
  assert.equal(indexSource.includes('window.localStorage'), false);
  assert.equal(bootstrapSource.includes("var defaultThemeMode = 'system';"), true);
  assert.equal(bootstrapSource.includes("var defaultThemeStyle = 'default';"), true);
  assert.equal(bootstrapSource.includes("window.matchMedia('(prefers-color-scheme: dark)').matches"), true);
  assert.equal(bootstrapSource.includes("value === 'light' || value === 'dark' || value === 'system'"), true);
  assert.equal(bootstrapSource.includes("value === 'default' || value === 'nyaa'"), true);
  assert.equal(bootstrapSource.includes('isThemeMode(parsedSettings.themeMode)'), true);
  assert.equal(bootstrapSource.includes('parsedSettings.nyaaThemeUnlocked === true'), true);
  assert.equal(bootstrapSource.includes('isThemeStyle(parsedSettings.themeStyle)'), true);
  assert.equal(
    bootstrapSource.includes("var resolvedTheme = themeMode === 'system' ? getSystemTheme() : themeMode;"),
    true
  );
  assert.equal(bootstrapSource.includes('root.dataset.themeMode = themeMode;'), true);
  assert.equal(bootstrapSource.includes('root.dataset.theme = resolvedTheme;'), true);
  assert.equal(bootstrapSource.includes('root.dataset.resolvedTheme = resolvedTheme;'), true);
  assert.equal(bootstrapSource.includes('root.dataset.themeStyle = themeStyle;'), true);
  assert.equal(
    bootstrapSource.includes("root.style.setProperty('color-scheme', resolvedTheme);"),
    true
  );
  assert.equal(bootstrapSource.includes("'background-color'"), true);
  assert.equal(bootstrapSource.includes('getPrebootBackgroundColor(resolvedTheme, themeStyle)'), true);
  assert.equal(mainSource.includes("nativeTheme.shouldUseDarkColors ? 'dark' : 'light'"), true);
  assert.equal(mainSource.includes("const GLOBAL_SETTINGS_STORAGE_KEY = 'netraflowGlobalSettings';"), true);
  assert.equal(mainSource.includes('readNfStorageItems()[GLOBAL_SETTINGS_STORAGE_KEY]'), true);
  assert.equal(mainSource.includes('normalizeThemeBootstrapSettings(JSON.parse(storedSettings))'), true);
  assert.equal(mainSource.includes('value === \'light\' || value === \'dark\' || value === \'system\''), true);
  assert.equal(mainSource.includes('value === \'default\' || value === \'nyaa\''), true);
  assert.equal(mainSource.includes('const nyaaThemeUnlocked = value.nyaaThemeUnlocked === true;'), true);
  assert.equal(
    mainSource.includes("themeMode === 'system' ? getSystemThemeForBootstrap() : themeMode"),
    true
  );
  assert.equal(mainSource.includes('backgroundColor: getBrowserWindowBackgroundColor()'), true);
  ['#f6f3ea', '#171a1f', '#fff6fa', '#18141b'].forEach((color) => {
    assert.equal(bootstrapSource.includes(color), true);
    assert.equal(mainSource.includes(color), true);
  });
  assert.equal(appSource.includes('root.dataset.themeMode = globalSettings.themeMode;'), true);
  assert.equal(appSource.includes('root.dataset.resolvedTheme = resolvedTheme;'), true);
  assert.equal(appSource.includes("root.style.removeProperty('background-color');"), true);
});

test('NF storage adapter owns persisted renderer data and legacy localStorage migration', () => {
  const appSource = readProjectFile('src/App.tsx');
  const globalSettingsLogicSource = readProjectFile(
    'src/app/globalSettings/globalSettingsLogic.ts'
  );
  const firstWelcomeStateSource = readProjectFile(
    'src/app/firstWelcome/firstWelcomeStateLogic.ts'
  );
  const lifecycleLogicSource = readProjectFile('src/app/appDataLifecycleLogic.ts');
  const storageKeysSource = readProjectFile('src/app/storageKeys.ts');
  const nfStorageSource = readProjectFile('src/app/nfStorage.ts');
  const snapshotBackupLogicSource = readProjectFile(
    'src/features/backup/snapshotBackupLogic.ts'
  );
  const rollupControllerSource = readProjectFile(
    'src/features/rollupImport/useRollupImportController.ts'
  );
  const mainSource = readProjectFile('electron/main.ts');
  const preloadSource = readProjectFile('electron/preload.ts');
  const indexSource = readProjectFile('index.html');
  const persistedStorageSource = [
    appSource,
    lifecycleLogicSource,
    globalSettingsLogicSource,
    firstWelcomeStateSource
  ].join('\n');
  const assertNfStorageSetItem = (key: string) => {
    assert.match(persistedStorageSource, new RegExp(`nfStorage\\.setItem\\(\\s*${key}\\b`));
  };

  assert.equal(appSource.includes('window.localStorage'), false);
  assert.equal(indexSource.includes('window.localStorage'), false);
  assert.equal(nfStorageSource.includes('window.localStorage'), true);
  assert.equal(appSource.includes('migrateLegacyLocalStorageToNfStorage();'), true);
  assertNfStorageSetItem('GROUPS_STORAGE_KEY');
  assertNfStorageSetItem('ACCOUNTS_STORAGE_KEY');
  assertNfStorageSetItem('HISTORY_STORAGE_KEY');
  assertNfStorageSetItem('GLOBAL_SETTINGS_STORAGE_KEY');
  assertNfStorageSetItem('CHART_SETTINGS_STORAGE_KEY');
  assertNfStorageSetItem('BACKUP_RECORDS_STORAGE_KEY');
  assert.match(
    snapshotBackupLogicSource,
    /nfStorage\.setItem\(\s*SNAPSHOT_IMPORT_RECORDS_STORAGE_KEY\b/
  );
  assertNfStorageSetItem('FIRST_WELCOME_STORAGE_KEY');
  assert.match(
    rollupControllerSource,
    /nfStorage\.setItem\(\s*ROLLUP_IMPORT_HASHES_STORAGE_KEY\b/
  );
  assert.match(persistedStorageSource, /nfStorage\.removeItem\(\s*LAST_BACKUP_STORAGE_KEY\s*\)/);
  assert.equal(storageKeysSource.includes('export const NF_STORAGE_WHITELIST_KEYS = ['), true);
  assert.equal(storageKeysSource.includes('SNAPSHOT_IMPORT_RECORDS_STORAGE_KEY'), true);
  assert.equal(mainSource.includes("'snapshotImportRecords'"), true);
  assert.equal(storageKeysSource.includes('MIGRATION_BACKUP_STORAGE_KEY'), true);
  assert.equal(nfStorageSource.includes('collectMigratableLegacyItems'), true);
  assert.equal(nfStorageSource.includes('skippedNonWhitelistKeys'), true);
  assert.equal(nfStorageSource.includes('skippedExistingKeys'), true);
  assert.equal(nfStorageSource.includes('skippedExampleKeys'), true);
  assert.equal(nfStorageSource.includes('isExampleStorageEntry'), true);
  assert.equal(nfStorageSource.includes('NF_STORAGE_WHITELIST_KEYS.forEach((key) => {'), true);
  assert.equal(nfStorageSource.includes('getLocalStorageFallback()?.removeItem(key);'), true);
  assert.equal(preloadSource.includes("contextBridge.exposeInMainWorld('netraflowStorage'"), true);
  assert.equal(preloadSource.includes("'nf-storage:migrate-legacy-items'"), true);
  assert.equal(mainSource.includes("const NF_STORAGE_FILE_NAME = 'storage.json';"), true);
  assert.equal(mainSource.includes("path.join(getNfStorageDirectoryPath(), NF_STORAGE_FILE_NAME)"), true);
  assert.equal(mainSource.includes("const USERDATA_DIR_NAME = 'userdata';"), true);
  assert.equal(mainSource.includes("const RUNTIME_DIR_NAME = 'runtime';"), true);
  assert.equal(mainSource.includes("const WINDOWS_ACCOUNT_MARKER_FILE_NAME = '.windows-account';"), false);
  assert.equal(mainSource.includes("path.join(getAppInstallRootPath(), USERDATA_DIR_NAME)"), true);
  assert.equal(mainSource.includes("path.join(getAppInstallRootPath(), RUNTIME_DIR_NAME)"), true);
  assert.equal(mainSource.includes('const getNfStorageDirectoryPath = () => getNfUserDataRootPath();'), true);
  assert.equal(mainSource.includes('const getNfRuntimeUserDataPath = () => getNfRuntimeRootPath();'), true);
  assert.equal(mainSource.includes('getWindowsAccountKey'), false);
  assert.equal(mainSource.includes('getWindowsAccountIdentity'), false);
  assert.equal(mainSource.includes('writeWindowsAccountMarkers'), false);
  assert.equal(mainSource.includes('WINDOWS_ACCOUNT_MARKER_FILE_NAME'), false);
  assert.equal(mainSource.includes('node:crypto'), false);
  assert.equal(mainSource.includes('node:os'), false);
  assert.equal(mainSource.includes("path.join(app.getPath('appData'), APP_NAME)"), true);
  assert.equal(mainSource.includes("path.join(app.getPath('appData'), APP_NAME.toLowerCase())"), true);
  assert.equal(mainSource.includes('getLegacyPortableUserDataPath()'), true);
  assert.equal(mainSource.includes('copyLegacyLocalStorageEntry(legacyUserDataPath, runtimeUserDataPath)'), true);
  assert.equal(mainSource.includes("cpSync(sourceEntryPath, targetEntryPath"), true);
  assert.equal(mainSource.includes('force: false'), true);
  assert.equal(mainSource.includes("return `win-${digest}`;"), false);
  assert.equal(mainSource.includes("ipcMain.on('nf-storage:set-item'"), true);
  assert.equal(mainSource.includes("ipcMain.on('nf-storage:migrate-legacy-items'"), true);
  assert.equal(mainSource.includes('sanitizeNfStorageItems'), true);
  assert.equal(mainSource.includes('isExampleStorageEntry'), true);
  assert.equal(mainSource.includes('Cache'), false);
  assert.equal(mainSource.includes('Code Cache'), false);
  assert.equal(mainSource.includes('GPUCache'), false);
});

test('page position memory copy and settings search keywords stay wired', () => {
  const appSource = readProjectFile('src/App.tsx');
  const settingsPageSource = readProjectFile('src/features/settings/SettingsPage.tsx');
  const settingsSectionLogicSource = readProjectFile(
    'src/features/settings/settingsSectionLogic.ts'
  );
  const appearanceSettingsPanelSource = readProjectFile(
    'src/features/settings/AppearanceSettingsPanel.tsx'
  );
  const pagePositionSearchItemStart = settingsSectionLogicSource.indexOf(
    "id: 'appearance-page-position-memory'"
  );
  const searchItemSource = settingsSectionLogicSource.slice(
    pagePositionSearchItemStart,
    settingsSectionLogicSource.indexOf("id: 'charts'", pagePositionSearchItemStart)
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
  assert.equal(
    settingsPageSource.includes('onPagePositionMemoryModeChange={props.onPagePositionMemoryModeChange}'),
    true
  );
  assert.equal(appSource.includes('onPagePositionMemoryModeChange: updatePagePositionMemoryMode'), true);
});

test('main content position setting keeps left default and swaps only app shell columns', () => {
  const appSource = readProjectFile('src/App.tsx');
  const globalSettingsLogicSource = readProjectFile(
    'src/app/globalSettings/globalSettingsLogic.ts'
  );
  const appShellSource = readProjectFile('src/app/shell/AppShell.tsx');
  const appShellTypesSource = readProjectFile('src/app/shell/appShellTypes.ts');
  const settingsPageSource = readProjectFile('src/features/settings/SettingsPage.tsx');
  const settingsSectionLogicSource = readProjectFile(
    'src/features/settings/settingsSectionLogic.ts'
  );
  const appearanceSettingsPanelSource = readProjectFile(
    'src/features/settings/AppearanceSettingsPanel.tsx'
  );
  const securitySettingsTypesSource = readProjectFile(
    'src/features/security/securitySettingsTypes.ts'
  );
  const stylesSource = readProjectStyles();
  const defaultGlobalSettingsSource = globalSettingsLogicSource.slice(
    globalSettingsLogicSource.indexOf('export const DEFAULT_GLOBAL_SETTINGS'),
    globalSettingsLogicSource.indexOf('export const isPositiveNegativeColorMode')
  );
  const normalizeGlobalSettingsSource = globalSettingsLogicSource.slice(
    globalSettingsLogicSource.indexOf('export const normalizeGlobalSettings'),
    globalSettingsLogicSource.indexOf('export const loadGlobalSettings')
  );
  const mainContentSearchItemStart = settingsSectionLogicSource.indexOf(
    "id: 'appearance-main-content-position'"
  );
  const mainContentSearchItemSource = settingsSectionLogicSource.slice(
    mainContentSearchItemStart,
    settingsSectionLogicSource.indexOf("id: 'appearance-page-position-memory'", mainContentSearchItemStart)
  );
  const mainRightStyleSource = stylesSource.slice(
    stylesSource.indexOf('.app-shell.app-shell--main-right'),
    stylesSource.indexOf('\n.left-browse-panel {\n  width', stylesSource.indexOf('.app-shell.app-shell--main-right'))
  );

  assert.equal(securitySettingsTypesSource.includes("export type MainContentPosition = 'left' | 'right';"), true);
  assert.equal(defaultGlobalSettingsSource.includes("mainContentPosition: 'left'"), true);
  assert.equal(appSource.includes('const DEFAULT_GLOBAL_SETTINGS'), false);
  assert.equal(
    globalSettingsLogicSource.includes(
      'export const isMainContentPosition = (value: unknown): value is MainContentPosition'
    ),
    true
  );
  assert.equal(normalizeGlobalSettingsSource.includes('mainContentPosition: isMainContentPosition(value.mainContentPosition)'), true);
  assert.equal(normalizeGlobalSettingsSource.includes(': DEFAULT_GLOBAL_SETTINGS.mainContentPosition'), true);

  assert.equal(appearanceSettingsPanelSource.includes('id="global-settings-main-content-position"'), true);
  assert.equal(appearanceSettingsPanelSource.includes('label="页面重心"'), true);
  assert.equal(appearanceSettingsPanelSource.includes("{ value: 'left', label: '左侧' }"), true);
  assert.equal(appearanceSettingsPanelSource.includes("{ value: 'right', label: '右侧' }"), true);
  assert.equal(appearanceSettingsPanelSource.includes('控制双栏页面中主要内容区域的显示侧'), true);
  assert.ok(
    appearanceSettingsPanelSource.indexOf('id="global-settings-main-content-position"') <
      appearanceSettingsPanelSource.indexOf('id="global-settings-page-position-memory"')
  );
  assert.equal(settingsPageSource.includes('mainContentPosition={props.globalSettings.mainContentPosition}'), true);
  assert.equal(
    settingsPageSource.includes('onMainContentPositionChange={props.onMainContentPositionChange}'),
    true
  );
  assert.equal(appSource.includes('onMainContentPositionChange: updateMainContentPosition'), true);

  assert.equal(mainContentSearchItemSource.includes("title: '页面重心'"), true);
  assert.equal(mainContentSearchItemSource.includes("blockId: 'global-settings-main-content-position'"), true);
  assert.equal(mainContentSearchItemSource.includes("'左侧：主要内容区在左，辅助 / 操作区在右'"), true);
  assert.equal(mainContentSearchItemSource.includes("'右侧：主要内容区在右，辅助 / 操作区在左'"), true);
  assert.ok(mainContentSearchItemStart >= 0);

  assert.equal(appShellTypesSource.includes("export type AppShellMainContentPosition = 'left' | 'right';"), true);
  assert.equal(appShellTypesSource.includes('mainContentPosition?: AppShellMainContentPosition;'), true);
  assert.equal(appShellSource.includes("mainContentPosition = 'left'"), true);
  assert.equal(appShellSource.includes("mainContentPosition === 'right' ? 'app-shell--main-right' : ''"), true);
  assert.equal(
    appSource.includes("mainContentPosition={flashNote.isOpen ? 'left' : globalSettings.mainContentPosition}"),
    true
  );
  assert.match(mainRightStyleSource, /\.app-shell\.app-shell--main-right\s*\{[^}]*grid-template-columns: var\(--right-slot-width\) minmax\(760px, 1fr\);[^}]*\}/s);
  assert.match(mainRightStyleSource, /\.app-shell\.app-shell--main-right > \.left-browse-panel\s*\{[^}]*grid-column: 2;[^}]*\}/s);
  assert.match(mainRightStyleSource, /\.app-shell\.app-shell--main-right > \.right-action-panel\s*\{[^}]*grid-column: 1;[^}]*\}/s);
  assert.match(mainRightStyleSource, /\.app-shell\.app-shell--main-right > \.layout-layer--left\s*\{[^}]*grid-column: 2 !important;[^}]*\}/s);
  assert.match(mainRightStyleSource, /\.app-shell\.app-shell--main-right > \.layout-layer--right\s*\{[^}]*grid-column: 1 !important;[^}]*\}/s);
  assert.equal(mainRightStyleSource.includes('.app-shell--main-right .left-browse-panel'), false);
  assert.equal(mainRightStyleSource.includes('.app-shell--main-right .right-action-panel'), false);
  assert.equal(mainRightStyleSource.includes('.app-shell--main-right .layout-layer--left'), false);
  assert.equal(mainRightStyleSource.includes('.app-shell--main-right .layout-layer--right'), false);
  assert.match(
    stylesSource,
    /@media \(max-width: 1280px\)\s*\{[\s\S]*\.app-shell\.app-shell--main-right\s*\{[\s\S]*grid-template-columns: clamp\(280px, 32vw, 340px\) minmax\(0, 1fr\);/
  );
  assert.equal(appSource.includes('flashNote.isOpen ? null : <RightPanelRenderer {...rightPanelRendererProps} />'), true);
});

test('example mode badge jump reuses settings block navigation', () => {
  const appSource = readProjectFile('src/App.tsx');
  const backupSettingsPanelSource = readProjectFile('src/features/settings/BackupSettingsPanel.tsx');
  const settingsSectionLogicSource = readProjectFile(
    'src/features/settings/settingsSectionLogic.ts'
  );
  const exampleNavigationSource = readProjectFile('src/app/exampleModeNavigation.ts');
  const exampleSearchItemStart = settingsSectionLogicSource.indexOf('id: EXAMPLE_DATA_SETTINGS_ID');
  const exampleSearchItemSource = settingsSectionLogicSource.slice(
    exampleSearchItemStart,
    settingsSectionLogicSource.indexOf("id: 'backup-reset'", exampleSearchItemStart)
  );

  assert.equal(exampleNavigationSource.includes("EXAMPLE_DATA_SETTINGS_ID = 'backup-example-data'"), true);
  assert.equal(exampleNavigationSource.includes("EXAMPLE_DATA_SETTINGS_SECTION = 'backup'"), true);
  assert.equal(
    exampleNavigationSource.includes(
      "EXAMPLE_DATA_SETTINGS_BLOCK_ID = 'global-settings-backup-example-data'"
    ),
    true
  );
  assert.equal(exampleNavigationSource.includes("EXAMPLE_DATA_SETTINGS_SCROLL_BLOCK: ScrollLogicalPosition = 'center'"), true);
  assert.equal(exampleNavigationSource.includes("EXAMPLE_MODE_BADGE_RETURN_TARGET = 'home'"), true);
  assert.equal(exampleNavigationSource.includes('shouldHighlight: false'), true);
  assert.equal(exampleSearchItemSource.includes('section: EXAMPLE_DATA_SETTINGS_SECTION'), true);
  assert.equal(exampleSearchItemSource.includes('blockId: EXAMPLE_DATA_SETTINGS_BLOCK_ID'), true);
  assert.equal(backupSettingsPanelSource.includes('id={EXAMPLE_DATA_SETTINGS_BLOCK_ID}'), true);
  assert.equal(appSource.includes('getExampleModeBadgeSettingsNavigation(isExampleMode)'), true);
  assert.equal(
    appSource.includes(
      'openGlobalSettingsView(navigation.settingsSection, navigation.blockId, navigation.scrollBlock)'
    ),
    true
  );
  assert.equal(appSource.includes('scrollGlobalSettingsTargetIntoView(intent.blockId);'), true);
  assert.equal(appSource.includes("intent.type === 'settings' && intent.blockId"), true);
});

test('confirmation dialog and Windows app identity use restrained UI and NetraFlow metadata', () => {
  const appSource = readProjectFile('src/App.tsx');
  const appDialogLayerSource = readProjectFile('src/app/feedback/AppDialogLayer.tsx');
  const confirmDialogSource = readProjectFile('src/components/dialogs/ConfirmDialog.tsx');
  const dialogShellSource = readProjectFile('src/components/dialogs/DialogShell.tsx');
  const stylesSource = readProjectStyles();
  const mainSource = readProjectFile('electron/main.ts');
  const afterPackSource = readProjectFile('scripts/after-pack-installer.mjs');
  const packageInstallerScriptSource = readProjectFile('scripts/package-installer.mjs');
  const resourcePatchSource = readProjectFile('scripts/patch-executable-resources.mjs');
  const packageJson = JSON.parse(readProjectFile('package.json')) as {
    name?: string;
    productName?: string;
    scripts?: {
      dist?: string;
      'clean:release'?: string;
      'dist:installer'?: string;
      'dist:portable'?: string;
    };
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
        selectPerMachineByDefault?: boolean;
        allowElevation?: boolean;
        packElevateHelper?: boolean;
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
  assert.equal(appSource.includes('<AppDialogLayer'), true);
  assert.equal(appDialogLayerSource.includes('<ConfirmDialog'), true);
  assert.equal(appDialogLayerSource.includes('<InputDialog'), true);
  assert.equal(appDialogLayerSource.includes('<NoticeDialog'), true);
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
  assert.equal(packageJson.build?.nsis?.perMachine, false);
  assert.equal(packageJson.build?.nsis?.selectPerMachineByDefault, undefined);
  assert.equal(packageJson.build?.nsis?.allowElevation, false);
  assert.equal(packageJson.build?.nsis?.packElevateHelper, false);
  assert.equal(packageJson.build?.nsis?.allowToChangeInstallationDirectory, true);
  assert.equal(packageJson.build?.nsis?.createDesktopShortcut, false);
  assert.equal(packageJson.build?.nsis?.createStartMenuShortcut, true);
  assert.equal(packageJson.build?.nsis?.runAfterFinish, false);
  assert.equal(packageJson.build?.nsis?.shortcutName, 'NetraFlow');
  assert.equal(packageJson.build?.nsis?.uninstallDisplayName, 'NetraFlow');
  assert.equal(packageJson.build?.nsis?.installerIcon, 'public/icons/netraflow.ico');
  assert.equal(packageJson.build?.nsis?.uninstallerIcon, 'public/icons/netraflow.ico');
  assert.equal(packageJson.build?.nsis?.include, 'build/installer/installer.nsh');
  assert.equal(packageJson.scripts?.['clean:release'], 'node scripts/clean-release.mjs');
  assert.equal(packageJson.scripts?.dist, undefined);
  assert.equal(
    packageJson.scripts?.['dist:installer'],
    'node scripts/package-installer.mjs'
  );
  assert.equal(packageJson.scripts?.['dist:portable'], 'node scripts/package-portable.mjs');
  assert.equal(mainSource.includes("app.setName(APP_NAME);"), true);
  assert.equal(mainSource.includes("process.platform === 'win32'"), true);
  assert.equal(mainSource.includes("app.setAppUserModelId('com.netraflow.app')"), true);
  assert.equal(mainSource.includes('const isPortableBuild = () =>'), true);
  assert.equal(mainSource.includes("process.env.NETRAFLOW_PORTABLE === '1'"), true);
  assert.equal(mainSource.includes("path.join(process.resourcesPath, 'app', 'portable.flag')"), true);
  assert.equal(mainSource.includes("path.join(process.resourcesPath, 'portable.flag')"), true);
  assert.equal(mainSource.includes("const USERDATA_DIR_NAME = 'userdata';"), true);
  assert.equal(mainSource.includes("const RUNTIME_DIR_NAME = 'runtime';"), true);
  assert.equal(mainSource.includes("const LOGS_DIR_NAME = 'logs';"), true);
  assert.equal(mainSource.includes('const getAppInstallRootPath = () =>'), true);
  assert.equal(mainSource.includes('const getPortableRootPath = () =>'), true);
  assert.equal(mainSource.includes('return isPortableBuild() ? getPortableRootPath() : getPackagedInstallRootPath();'), true);
  assert.equal(mainSource.includes('path.join(getAppInstallRootPath(), USERDATA_DIR_NAME)'), true);
  assert.equal(mainSource.includes('path.join(getAppInstallRootPath(), RUNTIME_DIR_NAME)'), true);
  assert.equal(mainSource.includes('const getLegacyPortableUserDataPath = () =>'), true);
  assert.equal(mainSource.includes("path.join(path.dirname(process.execPath), LEGACY_PORTABLE_USER_DATA_DIR_NAME)"), true);
  assert.equal(mainSource.includes('stageLegacyLocalStorageIfNeeded(runtimeUserDataPath);'), true);
  assert.equal(mainSource.includes("app.setPath('userData', runtimeUserDataPath);"), true);
  assert.equal(mainSource.includes('app.setAppLogsPath(logsPath);'), true);
  assert.equal(mainSource.includes("app.setPath('userData', path.join(path.dirname(process.execPath), 'userData'))"), false);
  assert.equal(mainSource.includes("path.join(app.getPath('userData'), 'logs', 'main.log')"), false);
  assert.equal(mainSource.includes("path.join(app.getPath('logs'), 'main.log')"), true);
  assert.equal(mainSource.includes('process.resourcesPath'), true);
  assert.equal(mainSource.includes('title: APP_NAME'), true);
  assert.equal(afterPackSource.includes("import { patchExecutableResources } from './patch-executable-resources.mjs';"), true);
  assert.equal(afterPackSource.includes('patchExecutableResources(exePath, { iconPath, productName, version })'), true);
  assert.equal(resourcePatchSource.includes("node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe'"), true);
  assert.equal(resourcePatchSource.includes("'--set-icon'"), true);
  assert.equal(resourcePatchSource.includes("writeFileSync(exePath, buffer);"), false);
  assert.equal(existsSync(new URL('../../../scripts/pe-version-resource.mjs', import.meta.url)), false);
  assert.equal(packageInstallerScriptSource.includes("'dist', 'index.html'"), true);
  assert.equal(packageInstallerScriptSource.includes("'dist-electron', 'main.js'"), true);
  assert.equal(packageInstallerScriptSource.includes('Run npm run build first.'), true);
  assert.equal(packageInstallerScriptSource.includes("import { Arch, Platform, build } from 'electron-builder';"), true);
  assert.equal(packageInstallerScriptSource.includes("prepareVersionedReleaseDir('installer', version)"), true);
  assert.equal(packageInstallerScriptSource.includes("Platform.WINDOWS.createTarget(['nsis'], Arch.x64)"), true);
  assert.equal(packageInstallerScriptSource.includes("publish: 'never'"), true);
  assert.equal(packageInstallerScriptSource.includes('output: outputDir'), true);
  assert.equal(packageInstallerScriptSource.includes("rmSync(path.join(outputDir, 'win-unpacked')"), true);
  assert.equal(packageInstallerScriptSource.includes("'builder-debug.yml', 'latest.yml'"), true);
  assert.equal(packageInstallerScriptSource.includes('`${productName}_${version}_Setup.exe`'), true);
  assert.equal(/node:child_process|spawnSync|powershell|cmd(?:\.exe)?|icacls|ExecWait|nsExec::|\.ps1|\.cmd|\.bat/i.test(packageInstallerScriptSource), false);
});

test('reset number confirmation keeps disabled state without mismatch helper text', () => {
  const resetDangerDialogLayerSource = readProjectFile(
    'src/app/resetDangerDialog/ResetDangerDialogLayer.tsx'
  );

  assert.equal(resetDangerDialogLayerSource.includes('数字不匹配'), false);
  assert.equal(resetDangerDialogLayerSource.includes('global-settings-note'), false);
  assert.equal(
    resetDangerDialogLayerSource.includes('disabled={inputValue !== confirmation.code}'),
    true
  );
  assert.equal(resetDangerDialogLayerSource.includes('onClick={onCancel}'), true);
  assert.equal(resetDangerDialogLayerSource.includes('type="button"'), true);
  assert.equal(resetDangerDialogLayerSource.includes('onSubmit={handleSubmit}'), true);
});

test('toast controller and viewport use one fixed bottom-right edge slide style', () => {
  const toastControllerSource = readProjectFile('src/app/feedback/useToastController.ts');
  const toastViewportSource = readProjectFile('src/app/feedback/ToastViewport.tsx');
  const stylesSource = readProjectStyles();
  const toastViewportBlock = stylesSource.match(/\.toast-viewport\s*\{[^}]*\}/s)?.[0] ?? '';
  const toastItemBlock = stylesSource.match(/\.toast-viewport__item\s*\{[^}]*\}/s)?.[0] ?? '';
  const backupControllerSource = readProjectFile(
    'src/features/backup/useSnapshotBackupController.tsx'
  );

  assert.equal(toastControllerSource.includes('const TOAST_AUTO_DISMISS_MS = 2500;'), true);
  assert.match(stylesSource, /\.toast-viewport__item\s*\{[\s\S]*animation: nf-toast-edge-lifecycle 2500ms ease-out forwards;/);
  assert.match(stylesSource, /@keyframes nf-toast-edge-lifecycle\s*\{[\s\S]*transform: translateX\(100%\);[\s\S]*transform: translateX\(0\);[\s\S]*transform: translateX\(100%\);/);
  assert.equal(toastControllerSource.includes('setToastMessages(['), true);
  assert.equal(toastControllerSource.includes('toastTimerRefs.current = [timerId];'), true);
  assert.equal(toastControllerSource.includes('toastMessages.concat'), false);
  assert.equal(toastControllerSource.includes('...currentMessages'), false);
  assert.equal(toastControllerSource.includes('toastTimerRefs.current.push'), false);

  assert.equal(toastViewportSource.includes('className="toast-viewport"'), true);
  assert.equal(toastViewportSource.includes('className="toast-viewport__item"'), true);
  assert.equal(toastViewportSource.includes("style={{"), false);
  assert.equal(toastViewportSource.includes('<button'), false);
  assert.equal(toastViewportSource.includes('<svg'), false);
  assert.equal(toastViewportSource.includes('onClick'), false);
  assert.equal(toastViewportSource.includes('close'), false);

  assert.match(toastViewportBlock, /position: fixed;/);
  assert.match(toastViewportBlock, /right: 0;/);
  assert.match(toastViewportBlock, /bottom: 30px;/);
  assert.match(toastViewportBlock, /z-index: 120;/);
  assert.match(toastViewportBlock, /justify-items: end;/);
  assert.match(toastViewportBlock, /width: 188px;/);
  assert.match(toastViewportBlock, /max-width: calc\(100vw - 44px\);/);
  assert.match(toastViewportBlock, /pointer-events: none;/);

  assert.match(toastItemBlock, /place-items: center;/);
  assert.match(toastItemBlock, /width: 188px;/);
  assert.match(toastItemBlock, /max-width: calc\(100vw - 44px\);/);
  assert.match(toastItemBlock, /text-align: center;/);
  assert.match(toastItemBlock, /overflow-wrap: break-word;/);
  assert.match(toastItemBlock, /border-right: 0;/);
  assert.match(toastItemBlock, /border-radius: var\(--radius-section\) 0 0 var\(--radius-section\);/);
  assert.match(toastItemBlock, /background: color-mix\(in srgb, var\(--panel-bg-strong\) 92%, var\(--surface-muted\)\);/);
  assert.match(toastItemBlock, /color: var\(--text-main\);/);
  assert.equal(toastViewportSource.includes("width: 'min(320px, calc(100vw - 44px))'"), false);
  assert.equal(toastViewportSource.includes("width: 'fit-content'"), false);
  assert.equal(toastViewportSource.includes('minWidth'), false);
  assert.equal(toastViewportBlock.includes('min-width: 132px;'), false);
  assert.equal(toastItemBlock.includes('min-width: 132px;'), false);
  assert.equal(toastViewportBlock.includes('width: fit-content;'), false);
  assert.equal(toastItemBlock.includes('width: fit-content;'), false);
  assert.equal(toastViewportBlock.includes('min(320px, calc(100vw - 44px))'), false);
  assert.equal(toastItemBlock.includes('min(320px, calc(100vw - 44px))'), false);
  assert.equal(toastItemBlock.includes('rgba(22, 163, 74'), false);
  assert.equal(toastItemBlock.includes('rgba(185, 28, 28'), false);

  assert.equal(backupControllerSource.includes("showToast('自动备份进行中')"), true);
  assert.equal(backupControllerSource.includes("showToast('自动备份完成', 'success')"), true);
});

test('Windows installer install directory and uninstall cleanup rules are wired', () => {
  const installerSource = readProjectFile('build/installer/installer.nsh');
  const electronBuilderInstallerTemplateSource = readProjectFile(
    'node_modules/app-builder-lib/templates/nsis/installer.nsi'
  );
  const packageSource = readProjectFile('package.json');
  const registryCleanupSource = installerSource.slice(
    installerSource.indexOf('!macro NetraFlowCleanupRegistryRoots'),
    installerSource.indexOf('!ifdef BUILD_UNINSTALLER', installerSource.indexOf('!macro NetraFlowCleanupRegistryRoots'))
  );
  const cleanupInstallRootsSource = installerSource.slice(
    installerSource.indexOf('!macro NetraFlowCleanupInstallRoots'),
    installerSource.indexOf('!ifndef BUILD_UNINSTALLER', installerSource.indexOf('!macro NetraFlowCleanupInstallRoots'))
  );
  const uninstallFunctionsSource = installerSource.slice(
    installerSource.indexOf('!ifdef BUILD_UNINSTALLER', installerSource.indexOf('!macro NetraFlowCleanupRegistryRoots')),
    installerSource.indexOf('!macro NetraFlowCleanupInstallRoots')
  );
  const finalUninstallUiSource = installerSource.slice(
    installerSource.indexOf('!macro customUnInit'),
    installerSource.indexOf('\n!macro customUnInstall\n')
  );
  const finalUninstallBehaviorSource = [
    registryCleanupSource,
    uninstallFunctionsSource,
    cleanupInstallRootsSource,
    finalUninstallUiSource
  ].join('\n');
  const installerCustomCopyTexts = [
    'MUI_PAGE_HEADER_TEXT',
    'MUI_PAGE_HEADER_SUBTEXT',
    'MUI_DIRECTORYPAGE_TEXT_TOP',
    'MUI_DIRECTORYPAGE_TEXT_DESTINATION',
    'MUI_FINISHPAGE_RUN_TEXT',
    'MUI_FINISHPAGE_SHOWREADME_TEXT'
  ].map((defineName) => extractNsisDefineText(installerSource, defineName));
  const uninstallerCustomCopyTexts = extractNsisDialogTexts(finalUninstallUiSource);

  assert.equal(installerSource.includes('!include LogicLib.nsh'), true);
  assert.equal(installerSource.includes('!include nsDialogs.nsh'), true);
  assert.equal(installerSource.includes('!define NETRAFLOW_INSTALL_DIR_NAME "NetraFlow"'), true);
  assert.equal(installerSource.includes('!define NETRAFLOW_USERDATA_DIR_NAME "userdata"'), true);
  assert.equal(installerSource.includes('!define NETRAFLOW_RUNTIME_DIR_NAME "runtime"'), true);
  assert.equal(installerSource.includes('!define NETRAFLOW_LOGS_DIR_NAME "logs"'), true);
  assert.equal(installerSource.includes('!define NETRAFLOW_WINDOWS_ACCOUNT_MARKER_FILE_NAME ".windows-account"'), false);
  assert.equal(installerSource.includes('!macro customInstallMode'), true);
  assert.equal(installerSource.includes('StrCpy $isForceCurrentInstall "1"'), false);
  assert.equal(installerSource.includes('StrCpy $hasPerMachineInstallation "0"'), true);
  assert.equal(installerSource.includes('StrCpy $hasPerUserInstallation "1"'), true);
  assert.equal(installerSource.includes('!insertmacro setInstallModePerUser'), true);
  assert.equal(installerSource.includes('Call NetraFlowApplyDefaultInstallDir'), true);
  assert.equal(installerSource.includes('Abort'), true);
  assert.equal(
    installerSource.indexOf('!insertmacro setInstallModePerUser') <
      installerSource.indexOf('Call NetraFlowApplyDefaultInstallDir'),
    true
  );
  assertNoSentencePeriods(installerCustomCopyTexts);
  assertNoSentencePeriods(uninstallerCustomCopyTexts);
  assert.equal(extractNsisDefineText(installerSource, 'MUI_PAGE_HEADER_TEXT'), '选定安装位置');
  assert.equal(extractNsisDefineText(installerSource, 'MUI_PAGE_HEADER_SUBTEXT'), '选择 NetraFlow 的安装文件夹');
  assert.equal(extractNsisDefineText(installerSource, 'MUI_DIRECTORYPAGE_TEXT_TOP'), '可使用默认位置，也可选择其他文件夹');
  assert.equal(extractNsisDefineText(installerSource, 'MUI_DIRECTORYPAGE_TEXT_DESTINATION'), '目标文件夹');
  assert.equal(installerSource.includes('!define MUI_PAGE_HEADER_SUBTEXT "选择 NetraFlow 的安装文件夹。"'), false);
  assert.equal(installerSource.includes('!define MUI_DIRECTORYPAGE_TEXT_TOP "可使用默认位置，也可选择其他文件夹。"'), false);
  assert.equal(installerSource.includes('Setup 将安装 NetraFlow 在下列文件夹'), false);
  assert.equal(packageSource.includes('"allowElevation": false'), true);
  assert.equal(packageSource.includes('"packElevateHelper": false'), true);
  assert.equal(packageSource.includes('"allowElevation": true'), false);
  assert.equal(packageSource.includes('"packElevateHelper": true'), false);
  assert.equal(installerSource.includes('Function NetraFlowFindDefaultInstallDir'), true);
  assert.equal(installerSource.includes('ReadEnvStr $1 "SystemDrive"'), true);
  assert.equal(installerSource.includes('StrCpy $0 "DEFGHIJKLMNOPQRSTUVWXYZABC"'), true);
  assert.equal(installerSource.includes('${For} $2 0 25'), true);
  assert.equal(installerSource.includes('GetLogicalDrives'), false);
  assert.equal(installerSource.includes('GetDriveTypeW'), true);
  assert.equal(installerSource.includes('System::Call'), true);
  assert.equal(installerSource.includes('${If} $3 != $1'), true);
  assert.equal(installerSource.includes('${If} $5 == 3'), true);
  assert.equal(installerSource.includes('StrCpy $INSTDIR "$4${NETRAFLOW_INSTALL_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('StrCpy $INSTDIR "$LOCALAPPDATA\\Programs\\${NETRAFLOW_INSTALL_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('StrCpy $INSTDIR "$0\\${NETRAFLOW_INSTALL_DIR_NAME}"'), false);
  assert.equal(installerSource.includes('Function NetraFlowNormalizeInstallDir'), false);
  assert.equal(installerSource.includes('Function .onVerifyInstDir'), true);
  assert.equal(installerSource.includes('StrLen $3 $INSTDIR'), true);
  assert.equal(installerSource.includes('${If} $3 == 2'), true);
  assert.equal(installerSource.includes('${If} $3 == 3'), true);
  assert.equal(installerSource.includes('StrCpy $INSTDIR "$4${NETRAFLOW_INSTALL_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('!macro customInstall'), true);
  assert.equal(installerSource.includes('CreateDirectory "$INSTDIR\\${NETRAFLOW_USERDATA_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('CreateDirectory "$INSTDIR\\${NETRAFLOW_RUNTIME_DIR_NAME}"'), true);
  assert.equal(packageSource.includes('"afterPack": "scripts/after-pack-installer.mjs"'), true);
  assert.equal(packageSource.includes('"APP_PACKAGE_URL"'), false);
  assert.equal(packageSource.includes('"perMachine": true'), false);
  assert.equal(packageSource.includes('"perMachine": false'), true);
  assert.equal(packageSource.includes('selectPerMachineByDefault'), false);

  assert.equal(installerSource.includes('!macro customUnInstallSection'), false);
  assert.equal(installerSource.includes('MUI_UNPAGE_COMPONENTS'), false);
  assert.equal(electronBuilderInstallerTemplateSource.includes('!ifmacrodef customUnInstallSection'), true);
  assert.equal(electronBuilderInstallerTemplateSource.includes('!insertmacro MUI_UNPAGE_COMPONENTS'), true);
  assert.equal(installerSource.includes('Section "Uninstall"'), false);
  assert.equal(installerSource.includes('Section "un.Uninstall"'), false);
  assert.equal(installerSource.includes('Section "-NetraFlow final cleanup"'), false);
  assert.equal(finalUninstallUiSource.includes('Section "un.'), false);
  assert.equal(finalUninstallUiSource.includes('Section "-'), false);
  assert.equal(installerSource.includes('setInstallModePerAllUsers'), false);
  assert.equal(installerSource.includes('perMachineInstall'), false);
  assert.equal(installerSource.includes('为使用这台电脑的任何人安装'), false);
  assert.equal(installerSource.includes('仅为我安装'), false);
  assert.equal(finalUninstallUiSource.includes('!macro customUnWelcomePage'), true);
  assert.equal(finalUninstallUiSource.includes('UninstPage custom un.NetraFlowDeleteLocalUserDataPage un.NetraFlowDeleteLocalUserDataPageLeave'), true);
  assert.equal(finalUninstallUiSource.includes('StrCpy $NetraFlowDeleteLocalUserData "1"'), true);
  assert.equal(installerSource.includes('Var NetraFlowDeleteLocalUserData'), true);
  assert.equal(finalUninstallUiSource.includes('${NSD_CreateLabel} 0u 0u 100% 14u "卸载选项"'), true);
  assert.equal(finalUninstallUiSource.includes('${NSD_CreateLabel} 0u 22u 100% 16u "选择是否同时删除 NetraFlow 的本地用户数据"'), true);
  assert.equal(finalUninstallUiSource.includes('${NSD_CreateLabel} 0u 44u 100% 16u "取消勾选将保留账户、历史记录和用户设置"'), true);
  assert.equal(finalUninstallUiSource.includes('选择是否同时删除 NetraFlow 的本地用户数据。'), false);
  assert.equal(finalUninstallUiSource.includes('取消勾选将保留账户、历史记录和用户设置。'), false);
  assert.equal(finalUninstallUiSource.includes('${NSD_CreateCheckbox} 0u 76u 100% 14u "删除本地用户数据"'), true);
  assert.equal(finalUninstallUiSource.includes('${NSD_Check} $NetraFlowDeleteLocalUserDataCheckbox'), true);
  assert.equal(finalUninstallUiSource.includes('MessageBox'), false);

  assert.equal(installerSource.includes('Function un.NetraFlowResolveCurrentAccountIdentity'), false);
  assert.equal(installerSource.includes('USERPROFILE'), false);
  assert.equal(installerSource.includes('USERDOMAIN_SID'), false);
  assert.equal(installerSource.includes('USERDNSDOMAIN'), false);
  assert.equal(installerSource.includes('USERDOMAIN'), false);
  assert.equal(installerSource.includes('NetraFlowCurrentAccountKey'), false);
  assert.equal(installerSource.includes('NetraFlowResolveCurrentMarkedAccountKey'), false);
  assert.equal(installerSource.includes('NetraFlowRemoveCurrentMarkedAccountDir'), false);
  assert.equal(installerSource.includes('NETRAFLOW_WINDOWS_ACCOUNT_MARKER_FILE_NAME'), false);
  assert.equal(installerSource.includes('.windows-account'), false);
  assert.equal(cleanupInstallRootsSource.includes('Call un.NetraFlowRemoveAllAccountRuntimeDirs'), false);
  assert.equal(cleanupInstallRootsSource.includes('Call un.NetraFlowRemoveCurrentAccountRuntimeDir'), false);
  assert.equal(cleanupInstallRootsSource.includes('Call un.NetraFlowRemoveAllAccountUserDataDirs'), false);
  assert.equal(cleanupInstallRootsSource.includes('Call un.NetraFlowRemoveCurrentAccountUserDataDir'), false);
  assert.equal(cleanupInstallRootsSource.includes('${If} $NetraFlowDeleteLocalUserData == "1"'), true);
  assert.equal(cleanupInstallRootsSource.includes('Call un.NetraFlowRemoveInstallResidues'), true);
  assert.equal(cleanupInstallRootsSource.includes('!insertmacro NetraFlowRemoveRuntimeEntries $INSTDIR'), true);
  assert.equal(cleanupInstallRootsSource.includes('RMDir /r "$INSTDIR\\${NETRAFLOW_USERDATA_DIR_NAME}"'), true);
  assert.equal(cleanupInstallRootsSource.includes('!insertmacro NetraFlowRemoveInstallDirIfAllowed'), true);
  assert.equal(installerSource.includes('Push "$INSTDIR\\${NETRAFLOW_USERDATA_DIR_NAME}"'), false);
  assert.equal(installerSource.includes('RMDir /r "$INSTDIR\\${NETRAFLOW_USERDATA_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('Push "$INSTDIR\\${NETRAFLOW_RUNTIME_DIR_NAME}"'), false);
  assert.equal(installerSource.includes('!macro NetraFlowRemoveRuntimeEntries ROOT'), true);
  assert.equal(installerSource.includes('RMDir /r "${ROOT}\\${NETRAFLOW_RUNTIME_DIR_NAME}"'), true);
  assert.equal(installerSource.includes('RMDir /r "${ROOT}\\Local Storage"'), true);
  assert.equal(installerSource.includes('Delete "${ROOT}\\Preferences"'), true);
  assert.equal(finalUninstallBehaviorSource.includes('!insertmacro NetraFlowRemoveRuntimeEntries $INSTDIR'), true);
  assert.equal(installerSource.includes('!insertmacro NetraFlowRemoveRuntimeEntries $APPDATA\\${NETRAFLOW_PRODUCT_NAME}'), true);
  assert.equal(installerSource.includes('!insertmacro NetraFlowRemoveRuntimeEntries $LOCALAPPDATA\\${NETRAFLOW_PRODUCT_NAME}'), true);
  assert.equal(installerSource.includes('!macro NetraFlowRemoveUserDataIfRequested ROOT'), true);
  assert.equal(installerSource.includes('!insertmacro NetraFlowRemoveUserDataIfRequested $APPDATA\\${NETRAFLOW_PRODUCT_NAME}'), true);
  assert.equal(installerSource.includes('RMDir /r "$APPDATA\\${NETRAFLOW_PRODUCT_NAME}"'), false);
  assert.equal(installerSource.includes('RMDir /r "$LOCALAPPDATA\\${NETRAFLOW_PRODUCT_NAME}"'), false);
  assert.equal(installerSource.includes('RMDir "$APPDATA\\${NETRAFLOW_PRODUCT_NAME}"'), true);
  assert.equal(installerSource.includes('RMDir "$LOCALAPPDATA\\${NETRAFLOW_PRODUCT_NAME}"'), true);
  assert.equal(installerSource.includes('RMDir /r "$INSTDIR\\userData"'), false);
  assert.equal(installerSource.includes('RMDir /r "$INSTDIR\\userdata"'), false);
  assert.equal(installerSource.includes('RMDir /r "$INSTDIR"'), false);
  assert.equal(installerSource.includes('RMDir "$INSTDIR"'), true);
  assert.equal(installerSource.includes('RMDir /REBOOTOK'), false);
  assert.equal(installerSource.includes('${ElseIfNot} ${FileExists} "$INSTDIR\\${NETRAFLOW_USERDATA_DIR_NAME}\\*.*"'), true);
  assert.equal(installerSource.includes('!macro NetraFlowRemoveLegacyProfileDirs USER_ROOT'), false);
  assert.equal(installerSource.includes('!macro NetraFlowRemoveLegacyProfileDirs'), true);
  assert.equal(installerSource.includes('RMDir /r "$TEMP\\${NETRAFLOW_PRODUCT_NAME}"'), true);
  assert.equal(installerSource.includes('RMDir /r "${USER_ROOT}\\AppData\\Local\\Temp\\${NETRAFLOW_PRODUCT_NAME}"'), false);
  assert.equal(installerSource.includes('SetShellVarContext all'), false);
  assert.equal(installerSource.includes('Delete "$INSTDIR\\${UNINSTALL_FILENAME}"'), true);
  assert.equal(installerSource.includes('Delete /REBOOTOK'), false);
  assert.equal(installerSource.includes('Delete "$INSTDIR\\installer.exe"'), true);
  assert.equal(installerSource.includes('RMDir /r "$INSTDIR\\resources"'), true);
  assert.equal(installerSource.includes('RMDir /r "$INSTDIR\\locales"'), true);
  assert.equal(installerSource.includes('RMDir /r "$INSTDIR\\licenses"'), true);
  assert.equal(installerSource.includes('RMDir /r "${ROOT}\\${NETRAFLOW_LOGS_DIR_NAME}"'), true);
  assert.equal(finalUninstallUiSource.includes('!insertmacro NetraFlowRemoveLegacyProfileDirs'), true);

  assert.equal(/powershell/i.test(finalUninstallBehaviorSource), false);
  assert.equal(/cmd(?:\.exe)?/i.test(finalUninstallBehaviorSource), false);
  assert.equal(/reg\.exe/i.test(finalUninstallBehaviorSource), false);
  assert.equal(/icacls/i.test(finalUninstallBehaviorSource), false);
  assert.equal(finalUninstallBehaviorSource.includes('ExecWait'), false);
  assert.equal(finalUninstallBehaviorSource.includes('nsExec::'), false);
  assert.equal(/\.ps1|\.cmd|\.bat/i.test(finalUninstallBehaviorSource), false);
  assert.equal(installerSource.includes('SetRebootFlag'), false);
  assert.equal(installerSource.includes('DeleteRegKey HKCU "Software\\${NETRAFLOW_PRODUCT_NAME}"'), true);
  assert.equal(installerSource.includes('DeleteRegKey HKLM "Software\\${NETRAFLOW_PRODUCT_NAME}"'), false);
  assert.equal(installerSource.includes('DeleteRegKey HKCU "Software\\netraflow"'), true);
  assert.equal(installerSource.includes('DeleteRegKey HKLM "Software\\netraflow"'), false);
  assert.equal(installerSource.includes('DeleteRegKey HKCU "Software\\${NETRAFLOW_APP_ID}"'), true);
  assert.equal(installerSource.includes('DeleteRegKey HKLM "Software\\${NETRAFLOW_APP_ID}"'), false);
  assert.equal(installerSource.includes('AppListBackup'), false);
  assert.equal(installerSource.includes('RegEnumValueW'), false);
  assert.equal(installerSource.includes('RegEnumKeyExW'), false);
  assert.equal(installerSource.includes('RegQueryValueExW'), false);
  assert.equal(installerSource.includes('RegDeleteValueW'), false);
  assert.equal(installerSource.includes('NetraFlowDeleteAppListBackup'), false);
  assert.equal(installerSource.includes('NetraFlowMarkIfValueContains'), false);
  assert.equal(installerSource.includes('NetraFlowMarkIfRawDataContains'), false);
  assert.equal(installerSource.includes('NetraFlowMarkIfRegValueDataContainsNeedles'), false);
  assert.equal(installerSource.includes('W~com.netraflow.app'), false);
  assert.equal(installerSource.includes('EnumRegValue'), false);
  assert.equal(installerSource.includes('ReadRegStr'), false);
  assert.equal(installerSource.includes('EnumRegValue $1 HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\AppListBackup" $0'), false);
  assert.equal(installerSource.includes('ReadRegStr $2 HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\AppListBackup" "$1"'), false);
  assert.equal(installerSource.includes('DeleteRegValue HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\AppListBackup" "$1"'), false);
  assert.equal(installerSource.includes('DeleteRegKey HKCU "Software\\Microsoft\\Windows\\CurrentVersion\\AppListBackup"'), false);
  assert.equal(installerSource.includes('Function un.onUninstSuccess'), true);
  assert.equal(
    installerSource.indexOf('Function un.onUninstSuccess') >
      installerSource.indexOf('Function un.NetraFlowDeleteLocalUserDataPageLeave'),
    true
  );
  assert.equal(installerSource.includes('SetRegView 64'), false);
  assert.equal(installerSource.includes('SetRegView 32'), false);
  assert.equal(installerSource.includes('${If} $R3 == "\\NetraFlow"'), false);
  assert.equal(installerSource.includes('${OrIf} $R3 == "\\NertaFlow"'), false);
  assert.equal(installerSource.includes('RMDir /r "$R0"'), false);
  assert.equal(installerSource.includes('RMDir "$R0"'), false);
  assert.equal(installerSource.includes('RMDir /r "$NetraFlowPreferredDrive:\\"'), false);
});

test('packaged first launch starts with empty real data and excludes runtime storage', () => {
  const appSource = readProjectFile('src/App.tsx');
  const firstWelcomeStateSource = readProjectFile(
    'src/app/firstWelcome/firstWelcomeStateLogic.ts'
  );
  const firstWelcomeLayerSource = readProjectFile(
    'src/app/firstWelcome/FirstWelcomeLayer.tsx'
  );
  const secretConsoleLayerSource = readProjectFile(
    'src/app/secretConsole/SecretConsoleLayer.tsx'
  );
  const lifecycleControllerSource = readProjectFile(
    'src/app/useAppDataLifecycleController.tsx'
  );
  const packageJson = JSON.parse(readProjectFile('package.json')) as { build?: { files?: string[] } };
  const portableScriptSource = readProjectFile('scripts/package-portable.mjs');
  const chooseFirstWelcomeStoryRouteSource = lifecycleControllerSource.slice(
    lifecycleControllerSource.indexOf('const chooseFirstWelcomeStoryRoute'),
    lifecycleControllerSource.indexOf('const switchExampleTemplate')
  );
  const applyExampleGeneratedDataSource = lifecycleControllerSource.slice(
    lifecycleControllerSource.indexOf('const applyExampleGeneratedData'),
    lifecycleControllerSource.indexOf('const startExampleMode')
  );

  assert.equal(appSource.includes('const initialGroups: AssetGroup[] = [];'), true);
  assert.equal(appSource.includes('default-cash'), false);
  assert.equal(appSource.includes('default-bank-card'), false);
  assert.equal(appSource.includes('default-stock'), false);
  assert.equal(appSource.includes('default-credit-card'), false);
  assert.equal(appSource.includes('const DEFAULT_FIRST_WELCOME_STATE'), false);
  assert.equal(firstWelcomeStateSource.includes('export const DEFAULT_FIRST_WELCOME_STATE'), true);
  assert.equal(firstWelcomeStateSource.includes('const FIRST_WELCOME_FOOTPRINT_STORAGE_KEYS'), true);
  assert.equal(firstWelcomeStateSource.includes('export const normalizeFirstWelcomeState'), true);
  assert.equal(firstWelcomeStateSource.includes('export const loadFirstWelcomeState'), true);
  assert.equal(firstWelcomeStateSource.includes('export const saveFirstWelcomeState'), true);
  assert.equal(firstWelcomeStateSource.includes('export const shouldShowFirstWelcome'), true);
  assert.equal(firstWelcomeStateSource.includes('FIRST_WELCOME_STORAGE_KEY'), true);
  assert.equal(firstWelcomeStateSource.includes('GLOBAL_SETTINGS_STORAGE_KEY'), true);
  assert.equal(appSource.includes('<FirstWelcomeLayer'), true);
  assert.equal(appSource.includes('<SecretConsoleLayer'), true);
  assert.equal(firstWelcomeLayerSource.includes('Halo, 你好像是第一次来到净流，需要跟我一起看看吗？'), true);
  assert.equal(firstWelcomeLayerSource.includes('className="modal-card first-welcome-modal"'), true);
  assert.equal(firstWelcomeLayerSource.includes('onClick={onComplete}'), true);
  assert.equal(firstWelcomeLayerSource.includes('createExampleData'), false);
  assert.equal(firstWelcomeLayerSource.includes('startExampleMode'), false);
  assert.equal(secretConsoleLayerSource.includes('className="secret-console-layer"'), true);
  assert.equal(secretConsoleLayerSource.includes('aria-label="隐藏控制台"'), true);
  assert.equal(appSource.includes('const runSecretConsoleCommand = (rawCommand: string) =>'), true);
  assert.equal(chooseFirstWelcomeStoryRouteSource.includes('completeFirstWelcome();'), true);
  assert.equal(chooseFirstWelcomeStoryRouteSource.includes('startExampleMode(templateId);'), true);
  assert.equal(
    lifecycleControllerSource.includes('applyExampleGeneratedData(createExampleData(templateId))'),
    true
  );
  assert.equal(applyExampleGeneratedDataSource.includes('saveAppData'), false);
  assert.equal(applyExampleGeneratedDataSource.includes('applyLifecycleSnapshot('), true);
  assert.equal(applyExampleGeneratedDataSource.includes('false'), true);
  assert.equal(lifecycleControllerSource.includes('applyBackupState('), true);

  for (const excludedPath of [
    '!**/userData/**',
    '!**/userdata/**',
    '!**/runtime/**',
    '!**/logs/**',
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

  assert.equal(portableScriptSource.includes('const runtimeDataEntryNames = new Set(['), true);
  assert.equal(/powershell/i.test(portableScriptSource), false);
  assert.equal(/cmd(?:\.exe)?/i.test(portableScriptSource), false);
  assert.equal(/icacls/i.test(portableScriptSource), false);
  assert.equal(/\.ps1|\.cmd|\.bat/i.test(portableScriptSource), false);
  assert.equal(portableScriptSource.includes("'userdata'"), true);
  assert.equal(portableScriptSource.includes("'runtime'"), true);
  assert.equal(portableScriptSource.includes("'logs'"), true);
  assert.equal(portableScriptSource.includes("'Local Storage'"), true);
  assert.equal(portableScriptSource.includes("'IndexedDB'"), true);
  assert.equal(portableScriptSource.includes("'Preferences'"), true);
  assert.equal(portableScriptSource.includes('removeRuntimeDataEntries(appDir);'), true);
  assert.equal(portableScriptSource.includes('removeRuntimeDataEntries(portableRootDir);'), true);
});

test('portable Windows package script creates an isolated zip bundle without installer artifacts', () => {
  const packageJson = JSON.parse(readProjectFile('package.json')) as {
    scripts?: { 'dist:portable'?: string };
  };
  const mainSource = readProjectFile('electron/main.ts');
  const portableScriptSource = readProjectFile('scripts/package-portable.mjs');

  assert.equal(packageJson.scripts?.['dist:portable'], 'node scripts/package-portable.mjs');
  assert.equal(portableScriptSource.includes("prepareVersionedReleaseDir('portable', version)"), true);
  assert.equal(portableScriptSource.includes('`${bundleName}_Portable.zip`'), true);
  assert.equal(portableScriptSource.includes("writeFileSync(path.join(appDir, 'portable.flag')"), true);
  assert.equal(mainSource.includes("path.join(process.resourcesPath, 'app', 'portable.flag')"), true);
  assert.equal(mainSource.includes("path.join(app.getPath('appData'), APP_NAME)"), true);
  assert.equal(mainSource.includes("path.join(getAppInstallRootPath(), USERDATA_DIR_NAME)"), true);
  assert.equal(mainSource.includes("path.join(getAppInstallRootPath(), RUNTIME_DIR_NAME)"), true);
  assert.equal(mainSource.includes('getWindowsAccountKey'), false);
  assert.equal(mainSource.includes('.windows-account'), false);
  assert.equal(mainSource.includes("path.join(path.dirname(process.execPath), LEGACY_PORTABLE_USER_DATA_DIR_NAME)"), true);
  assert.equal(mainSource.includes("app.setPath('userData', path.join(path.dirname(process.execPath), 'userData'))"), false);
  assert.equal(mainSource.includes("'Cache'"), false);
  assert.equal(mainSource.includes("'Code Cache'"), false);
  assert.equal(portableScriptSource.includes('createZipFromDirectory(portableRootDir, zipPath, outputRoot)'), true);
  assert.equal(portableScriptSource.includes('deflateRawSync'), true);
  assert.equal(portableScriptSource.includes('Compress-Archive'), false);
  assert.equal(portableScriptSource.includes("import { Arch, Platform, build } from 'electron-builder';"), true);
  assert.equal(portableScriptSource.includes("Platform.WINDOWS.createTarget(['dir'], Arch.x64)"), true);
  assert.equal(portableScriptSource.includes("packagedAppDir = path.join(stagingOutputDir, 'win-unpacked')"), true);
  assert.equal(portableScriptSource.includes('cpSync(packagedAppDir, portableRootDir'), true);
  assert.equal(portableScriptSource.includes("path.join(rootDir, 'node_modules', 'electron', 'dist')"), true);
  assert.equal(portableScriptSource.includes("path.join(portableRootDir, 'electron.exe')"), false);
  assert.equal(portableScriptSource.includes('renameSync(electronExePath, appExePath)'), false);
  assert.equal(/powershell/i.test(portableScriptSource), false);
  assert.equal(/cmd(?:\.exe)?/i.test(portableScriptSource), false);
  assert.equal(/icacls/i.test(portableScriptSource), false);
  assert.equal(/\.ps1|\.cmd|\.bat/i.test(portableScriptSource), false);
  assert.equal(portableScriptSource.includes("import { patchExecutableMetadata } from './pe-version-resource.mjs';"), false);
  assert.equal(portableScriptSource.includes('patchExecutableMetadata(appExePath'), false);
  assert.equal(portableScriptSource.includes("import { patchExecutableResources } from './patch-executable-resources.mjs';"), true);
  assert.equal(portableScriptSource.includes('patchExecutableResources(appExePath, { iconPath, productName, version })'), true);
  assert.equal(/node:child_process|execFileSync|spawnSync|rcedit\.exe|--set-icon/.test(portableScriptSource), false);
  assert.equal(portableScriptSource.includes('copyNotoLicenses'), true);
  assert.equal(portableScriptSource.includes("'LICENSE.NotoSansCJK.txt'"), true);
  assert.equal(portableScriptSource.includes("'LICENSE.NotoSansSymbols2.txt'"), true);
  assert.equal(portableScriptSource.includes("'LICENSE.electron.txt'"), true);
  assert.equal(portableScriptSource.includes("'LICENSES.chromium.html'"), true);
  assert.equal(portableScriptSource.includes('assertNoForbiddenPortableEntries(portableRootDir)'), true);
  for (const forbiddenEntry of [
    "'userData'",
    "'userdata'",
    "'runtime'",
    "'logs'",
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

test('release packaging scripts use versioned output folders and safe release cleanup', () => {
  const packageJson = JSON.parse(readProjectFile('package.json')) as {
    version?: string;
    scripts?: { 'clean:release'?: string; 'dist:installer'?: string; 'dist:portable'?: string };
  };
  const releaseUtilsSource = readProjectFile('scripts/release-utils.mjs');
  const cleanReleaseSource = readProjectFile('scripts/clean-release.mjs');
  const installerScriptSource = readProjectFile('scripts/package-installer.mjs');
  const portableScriptSource = readProjectFile('scripts/package-portable.mjs');
  const afterPackSource = readProjectFile('scripts/after-pack-installer.mjs');
  const resourcePatchSource = readProjectFile('scripts/patch-executable-resources.mjs');
  const packagingScriptsSource = [
    releaseUtilsSource,
    cleanReleaseSource,
    installerScriptSource,
    portableScriptSource,
    afterPackSource,
    resourcePatchSource
  ].join('\n');

  assert.equal(packageJson.version, '0.9.5');
  assert.equal(packageJson.scripts?.['clean:release'], 'node scripts/clean-release.mjs');
  assert.equal(packageJson.scripts?.['dist:installer'], 'node scripts/package-installer.mjs');
  assert.equal(packageJson.scripts?.['dist:portable'], 'node scripts/package-portable.mjs');
  assert.equal(releaseUtilsSource.includes("releaseRootPath = path.join(rootDir, 'release')"), true);
  assert.equal(releaseUtilsSource.includes('assertInsideProjectRelease'), true);
  assert.equal(releaseUtilsSource.includes('readdirSync(releaseRootPath, { withFileTypes: true })'), true);
  assert.equal(releaseUtilsSource.includes('const removePathInsideRelease = (targetPath) =>'), true);
  assert.equal(releaseUtilsSource.includes('const emptyDirectoryInsideRelease = (directoryPath) =>'), true);
  assert.equal(releaseUtilsSource.includes('rmSync(targetPath, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 })'), true);
  assert.equal(releaseUtilsSource.includes("entry.name === 'installer' || entry.name === 'portable'"), true);
  assert.equal(releaseUtilsSource.includes('rmSync(releaseRootPath, { recursive: true, force: true })'), false);
  assert.equal(releaseUtilsSource.includes("mkdirSync(path.join(releaseRootPath, 'installer')"), true);
  assert.equal(releaseUtilsSource.includes("mkdirSync(path.join(releaseRootPath, 'portable')"), true);
  assert.equal(releaseUtilsSource.includes("final ? `${version}_final` : version"), true);
  assert.equal(releaseUtilsSource.includes('`${baseFolderName}_${suffix}`'), true);
  assert.equal(releaseUtilsSource.includes('/^(?:installer|portable)$/'), true);
  assert.equal(cleanReleaseSource.includes('cleanReleaseDirectory();'), true);
  assert.equal(installerScriptSource.includes("prepareVersionedReleaseDir('installer', version)"), true);
  assert.equal(installerScriptSource.includes("Platform.WINDOWS.createTarget(['nsis'], Arch.x64)"), true);
  assert.equal(installerScriptSource.includes('output: outputDir'), true);
  assert.equal(installerScriptSource.includes("'builder-debug.yml', 'latest.yml'"), true);
  assert.equal(installerScriptSource.includes('`${productName}_${version}_Setup.exe`'), true);
  assert.equal(installerScriptSource.includes('`${productName}_${version}_Setup.exe.blockmap`'), true);
  assert.equal(installerScriptSource.includes('`${productName}_${version}_1_Setup.exe`'), false);
  assert.equal(portableScriptSource.includes("prepareVersionedReleaseDir('portable', version)"), true);
  assert.equal(portableScriptSource.includes("Platform.WINDOWS.createTarget(['dir'], Arch.x64)"), true);
  assert.equal(portableScriptSource.includes("packagedAppDir = path.join(stagingOutputDir, 'win-unpacked')"), true);
  assert.equal(portableScriptSource.includes('const bundleName = `${productName}_${version}`;'), true);
  assert.equal(portableScriptSource.includes('`${bundleName}_Portable.zip`'), true);
  assert.equal(portableScriptSource.includes('`${productName}_${version}_Portable.zip`'), false);
  assert.equal(portableScriptSource.includes('`${productName}_${version}_1`'), false);
  assert.equal(resourcePatchSource.includes("node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe'"), true);
  assert.equal(resourcePatchSource.includes("'--set-icon'"), true);
  assert.equal(resourcePatchSource.includes("'--set-version-string'"), true);
  assert.equal(resourcePatchSource.includes('writeFileSync(exePath, buffer);'), false);
  assert.equal(/powershell/i.test(packagingScriptsSource), false);
  assert.equal(/cmd(?:\.exe)?/i.test(packagingScriptsSource), false);
  assert.equal(/icacls/i.test(packagingScriptsSource), false);
  assert.equal(/ExecWait|nsExec::|\.ps1|\.cmd|\.bat/i.test(packagingScriptsSource), false);
  assert.equal(/spawnSync/i.test(packagingScriptsSource), false);
  assert.equal(existsSync(new URL('../../../scripts/after-pack-installer.mjs', import.meta.url)), true);
  assert.equal(existsSync(new URL('../../../scripts/patch-executable-resources.mjs', import.meta.url)), true);
  assert.equal(existsSync(new URL('../../../scripts/pe-version-resource.mjs', import.meta.url)), false);
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

test('Windows executable icon resources use the local mature rcedit path only', () => {
  const packageJson = JSON.parse(readProjectFile('package.json')) as {
    build?: {
      afterPack?: string;
      win?: {
        icon?: string;
        signAndEditExecutable?: boolean;
      };
      nsis?: {
        installerIcon?: string;
        uninstallerIcon?: string;
      };
    };
  };
  const afterPackSource = readProjectFile('scripts/after-pack-installer.mjs');
  const portableScriptSource = readProjectFile('scripts/package-portable.mjs');
  const resourcePatchSource = readProjectFile('scripts/patch-executable-resources.mjs');

  assert.equal(packageJson.build?.afterPack, 'scripts/after-pack-installer.mjs');
  assert.equal(packageJson.build?.win?.icon, 'public/icons/netraflow.ico');
  assert.equal(packageJson.build?.win?.signAndEditExecutable, false);
  assert.equal(packageJson.build?.nsis?.installerIcon, 'public/icons/netraflow.ico');
  assert.equal(packageJson.build?.nsis?.uninstallerIcon, 'public/icons/netraflow.ico');
  assert.equal(afterPackSource.includes("import { patchExecutableResources } from './patch-executable-resources.mjs';"), true);
  assert.equal(afterPackSource.includes('patchExecutableResources(exePath, { iconPath, productName, version })'), true);
  assert.equal(resourcePatchSource.includes("node_modules', 'electron-winstaller', 'vendor', 'rcedit.exe'"), true);
  assert.equal(resourcePatchSource.includes("'--set-icon'"), true);
  assert.equal(resourcePatchSource.includes("'RT_ICON'"), false);
  assert.equal(resourcePatchSource.includes("'RT_GROUP_ICON'"), false);
  assert.equal(resourcePatchSource.includes('writeFileSync(exePath, buffer);'), false);
  assert.equal(existsSync(new URL('../../../scripts/pe-version-resource.mjs', import.meta.url)), false);
  assert.equal(portableScriptSource.includes("Platform.WINDOWS.createTarget(['dir'], Arch.x64)"), true);
  assert.equal(portableScriptSource.includes("packagedAppDir = path.join(stagingOutputDir, 'win-unpacked')"), true);
  assert.equal(portableScriptSource.includes('patchExecutableMetadata'), false);
  assert.equal(portableScriptSource.includes('patchExecutableResources(appExePath, { iconPath, productName, version })'), true);
  assert.equal(existsSync(new URL('../../../public/icons/netraflow.ico', import.meta.url)), true);
});

test('Windows taskbar lock uses Jump List IPC without tray or background hiding', () => {
  const mainSource = readProjectFile('electron/main.ts');
  const preloadSource = readProjectFile('electron/preload.ts');
  const appSource = readProjectFile('src/App.tsx');
  const securityControllerSource = readProjectFile(
    'src/features/security/useSecuritySettingsController.tsx'
  );
  const rendererLockSource = `${appSource}\n${securityControllerSource}`;
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
  assert.equal(rendererLockSource.includes('api.onNetraFlowLock(() => {'), true);
  assert.equal(rendererLockSource.includes("showToast('请先开启登陆密码保护', 'info')"), true);
  assert.equal(rendererLockSource.includes('setIsLocked(true);'), true);
  assert.equal(
    rendererLockSource.includes('verifyPassword(') &&
      rendererLockSource.includes('unlockPasswordInput') &&
      rendererLockSource.includes('globalSettings.passwordHash'),
    true
  );
});

test('history panel opacity and two-column title alignment use shared structure classes', () => {
  const appSource = readProjectFile('src/App.tsx');
  const historyBackupLayerSource = readProjectFile(
    'src/app/historyBackupLayer/HistoryBackupLayer.tsx'
  );
  const historyPanelSource = readProjectFile('src/features/history/HistoryPanel.tsx');
  const historyFilterSource = readProjectFile('src/features/history/HistoryFilterToolbar.tsx');
  const historyCalendarSource = readProjectFile('src/features/history/HistoryCalendarPanel.tsx');
  const historyListSource = readProjectFile('src/features/history/HistoryRecordList.tsx');
  const historySource = [
    appSource,
    historyBackupLayerSource,
    historyPanelSource,
    historyFilterSource,
    historyCalendarSource,
    historyListSource
  ].join('\n');
  const stylesSource = readProjectStyles();

  assert.equal(appSource.includes('<HistoryBackupLayer'), true);
  assert.equal(historyBackupLayerSource.includes('<HistoryPanel'), true);
  assert.equal(historyBackupLayerSource.includes('<HistoryFilterToolbar'), true);
  assert.equal(historyBackupLayerSource.includes('<HistoryCalendarPanel'), true);
  assert.equal(historyBackupLayerSource.includes('<HistoryRecordList'), true);
  assert.equal(historyBackupLayerSource.includes('<BackupRecordList'), true);
  assert.equal(historySource.includes('className="history-browse-panel two-column-page-panel"'), true);
  assert.equal(historySource.includes('className="history-filter-panel"'), true);
  assert.equal(historySource.includes('className="history-calendar-panel"'), true);
  assert.equal(historySource.includes('className="history-result-list-panel"'), true);
  assert.equal(historyListSource.includes('history-meta-chip'), false);
  assert.equal(historyListSource.includes('history-card-grid'), true);
  assert.equal(historyListSource.includes('history-card-title-row'), true);
  assert.equal(historyListSource.includes('history-card-amount-row'), true);
  assert.equal(historyListSource.includes('history-card-date-row'), true);
  assert.equal(historyListSource.includes('history-card-right-cell'), true);
  assert.equal(historyListSource.includes('history-type-badge'), true);
  assert.equal(historyListSource.includes('history-delta-badge'), true);
  assert.equal(historyListSource.includes('history-count-badge'), true);
  assert.equal(historySource.includes("background: 'var(--panel-bg-strong)'"), true);
  assert.equal(stylesSource.includes('--two-column-panel-padding: 22px;'), true);
  assert.equal(stylesSource.includes('--right-panel-padding: var(--two-column-panel-padding);'), true);
  assert.match(stylesSource, /\.history-card-grid\s*\{[^}]*grid-template-columns: minmax\(0, 1fr\) minmax\(44px, max-content\);[^}]*align-items: center;[^}]*\}/s);
  assert.match(stylesSource, /\.history-card-right-cell\s*\{[^}]*grid-column: 2;[^}]*justify-self: end;[^}]*align-self: center;[^}]*\}/s);
  assert.match(stylesSource, /\.history-badge-base\s*\{[^}]*height: 24px;[^}]*min-height: 24px;[^}]*align-items: center;[^}]*line-height: 1;[^}]*\}/s);
  assert.match(stylesSource, /\.left-browse-panel\.card\s*\{[^}]*padding: var\(--two-column-panel-padding\);[^}]*\}/s);
  assert.match(stylesSource, /\.right-action-panel\s*\{[^}]*padding: var\(--right-panel-padding\);[^}]*\}/s);
  assert.match(stylesSource, /\.layout-layer--left \.search-panel\s*\{[^}]*padding: var\(--two-column-panel-padding\) !important;[^}]*\}/s);
});

test('local Noto fonts, emoji fallback, and about-page license copy stay wired', () => {
  const appSource = readProjectFile('src/App.tsx');
  const aboutPanelSource = readProjectFile('src/features/settings/AboutNetraFlowPanel.tsx');
  const settingsPageSource = readProjectFile('src/features/settings/SettingsPage.tsx');
  const stylesSource = readProjectStyles();

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
  const contactSource = aboutPanelSource.slice(
    aboutPanelSource.indexOf('about-netraflow__contact')
  );
  assert.equal(appSource.includes('NETRAFLOW_MEMO_PARAGRAPHS'), false);
  assert.equal(`${appSource}\n${aboutPanelSource}`.includes('about-netraflow__memo'), false);
  assert.equal(stylesSource.includes('about-netraflow__memo'), false);
  assert.equal(aboutPanelSource.includes('about-netraflow__cat'), false);
  assert.equal(stylesSource.includes('.about-netraflow__cat'), false);
  assert.equal(settingsPageSource.includes('settings-easter-cat'), true);
  assert.equal(`${appSource}\n${aboutPanelSource}`.includes('<strong>净流 NetraFlow</strong>'), false);
  assert.equal(`${appSource}\n${aboutPanelSource}`.includes('借助 ChatGPT 和 Codex、Windsurf'), false);
  assert.equal(aboutPanelSource.includes('<h3 id="netraflow-contact-title">获取信息</h3>'), true);
  assert.equal(aboutPanelSource.includes('about-netraflow__info-button--bilibili'), true);
  assert.equal(aboutPanelSource.includes('about-netraflow__info-button--github'), true);
  assert.equal(aboutPanelSource.includes('NfGithubIcon'), true);
  assert.equal(appSource.includes(GITHUB_RELEASES_URL), true);
  assert.equal(existsSync(new URL('../../../src/assets/icons/common/nf-github.svg', import.meta.url)), true);
  assert.equal(contactSource.includes('</section>'), true);
  assert.match(
    stylesSource,
    /\.settings-easter-cat,\s*\.settings-easter-cat \*\s*\{[^}]*user-select: auto;[^}]*-webkit-user-select: auto;[^}]*cursor: pointer;[^}]*\}/s
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
  const accountDialogLayerSource = readProjectFile('src/app/accountDialogs/AccountDialogLayer.tsx');
  const accountEditorSource = readProjectFile('src/features/account/AccountEditorDialog.tsx');
  const stylesSource = readProjectStyles();
  const restorePanelSource = accountEditorSource.slice(
    accountEditorSource.indexOf('className="account-add-restore-panel"'),
    accountEditorSource.indexOf('className="account-add-restore-panel account-add-restore-panel--form"')
  );

  assert.equal(restorePanelSource.includes('账户新增 / 恢复'), false);
  assert.equal(restorePanelSource.includes('简易搜索'), false);
  assert.equal(appSource.includes('归档旧账户'), false);
  assert.equal(appSource.includes('归档旧帐户'), false);
  assert.equal(appSource.includes('<AccountDialogLayer'), true);
  assert.equal(accountDialogLayerSource.includes('<AccountRestoreDialog'), true);
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

test('account add and restore opens as a two-column layer focused on restore', () => {
  const accountDialogLayerSource = readProjectFile('src/app/accountDialogs/AccountDialogLayer.tsx');
  const accountEditorSource = readProjectFile('src/features/account/AccountEditorDialog.tsx');
  const appShellSource = readProjectFile('src/styles/app-shell.css');
  const restoreDialogSource = accountEditorSource.slice(
    accountEditorSource.indexOf('function AccountRestoreDialog'),
    accountEditorSource.indexOf('function AccountRestoreTargetDialog')
  );
  const createDialogSource = accountEditorSource.slice(
    accountEditorSource.indexOf('function AccountCreateDialog'),
    accountEditorSource.indexOf('export {')
  );
  const accountTypeEditorSource = accountDialogLayerSource.slice(
    accountDialogLayerSource.indexOf('function AccountTypeEditorDialog'),
    accountDialogLayerSource.indexOf('export function AccountDialogLayer')
  );
  const accountLayerRenderSource = accountDialogLayerSource.slice(
    accountDialogLayerSource.indexOf('export function AccountDialogLayer')
  );

  assert.equal(
    restoreDialogSource.includes('backdropClassName="layout-layer layout-layer--left"'),
    true
  );
  assert.equal(
    createDialogSource.includes('backdropClassName="layout-layer layout-layer--right"'),
    true
  );
  assert.equal(restoreDialogSource.includes('backdropClassName="modal-backdrop"'), false);
  assert.equal(createDialogSource.includes('backdropClassName="modal-backdrop"'), false);
  assert.equal(appShellSource.includes('.app-shell.app-shell--main-right > .layout-layer--left'), true);
  assert.equal(appShellSource.includes('.app-shell.app-shell--main-right > .layout-layer--right'), true);
  assert.equal(
    accountLayerRenderSource.indexOf('<AccountRestoreDialog') <
      accountLayerRenderSource.indexOf('<AccountCreateDialog'),
    true
  );

  assert.equal(restoreDialogSource.includes('archivedAccounts.length === 0'), true);
  assert.equal(restoreDialogSource.includes('filteredAccounts.map((account)'), true);
  assert.equal(restoreDialogSource.includes('onRestore(account)'), true);
  assert.equal(createDialogSource.includes('accountTypeInputRef'), true);
  assert.equal(createDialogSource.includes('accountTypeInputPlaceholder'), true);
  assert.equal(createDialogSource.includes('onSwitchAccountType'), true);
  assert.equal(createDialogSource.includes('newAccountNamePlaceholder'), true);
  assert.equal(createDialogSource.includes('newAccountAmount'), true);
  assert.equal(createDialogSource.includes('onOpenCreateAccountType'), true);

  assert.equal(accountTypeEditorSource.includes("presentation === 'side'"), true);
  assert.equal(accountTypeEditorSource.includes("'layout-layer layout-layer--right'"), true);
  assert.equal(
    accountLayerRenderSource.includes(
      "presentation={create && accountType.editor.mode === 'create' ? 'side' : 'modal'}"
    ),
    true
  );
});

test('deleted original account category restore uses an explicit unselected category chooser', () => {
  const appSource = readProjectFile('src/App.tsx');
  const accountDialogLayerSource = readProjectFile('src/app/accountDialogs/AccountDialogLayer.tsx');
  const archivedAccountsLayerSource = readProjectFile(
    'src/app/archivedAccountsLayer/ArchivedAccountsLayer.tsx'
  );
  const accountDataSource = readProjectFile('src/app/accountData.ts');
  const accountEditorSource = readProjectFile('src/features/account/AccountEditorDialog.tsx');
  const accountOperationsControllerSource = readProjectFile(
    'src/features/account/useAccountOperationsController.ts'
  );
  const archivedAccountLogicSource = readProjectFile(
    'src/features/account/archivedAccountLogic.ts'
  );
  const targetDialogSource = accountEditorSource.slice(
    accountEditorSource.indexOf('function AccountRestoreTargetDialog'),
    accountEditorSource.indexOf('type AccountCreateDialogProps')
  );
  const restoreLogicSource = accountOperationsControllerSource.slice(
    accountOperationsControllerSource.indexOf('const performRestoreAccountToGroup'),
    accountOperationsControllerSource.indexOf('const accountActionsPanelProps')
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
  assert.equal(appSource.includes('<AccountDialogLayer'), true);
  assert.equal(accountDialogLayerSource.includes('<AccountRestoreTargetDialog'), true);
  assert.equal(appSource.includes('<ArchivedAccountsLayer'), true);
  assert.equal(archivedAccountsLayerSource.includes('layout-layer layout-layer--left'), true);
  assert.equal(archivedAccountsLayerSource.includes('account-mark--archived'), true);
  assert.equal(archivedAccountsLayerSource.includes('archivedAccounts.map((account)'), true);
  assert.equal(archivedAccountsLayerSource.includes('callbacks.onRestore(account)'), true);
  assert.equal(restoreLogicSource.includes('prepareArchivedAccountRestore(groupId, account, assetGroups, source)'), true);
  assert.equal(restoreLogicSource.includes('setPendingArchivedRestore(restorePlan.pendingRestore)'), true);
  assert.equal(restoreLogicSource.includes('restoreArchivedAccountInAppData({'), true);
  assert.equal(archivedAccountLogicSource.includes('getArchivedAccountRestoreGroup({ groupId }, groups)'), true);
  assert.equal(archivedAccountLogicSource.includes('targetGroup.id'), true);
  assert.equal(restoreLogicSource.includes('onCompleteArchivedRestoreSource(source)'), true);
  assert.equal(appSource.includes('getArchivedAccountEntries(groups, accounts, history)'), true);
  assert.equal(archivedAccountsSource.includes('archivedAccountsWithCurrentGroup'), true);
  assert.equal(
    archivedAccountsSource.includes(
      '.filter((account) => account.archived && !archivedAccountIdsWithCurrentGroup.has(account.id))'
    ),
    true
  );
  const restoreEntrySources = `${appSource}\n${accountOperationsControllerSource}`;
  assert.equal(
    restoreEntrySources.includes("restoreAccount(archivedMatch.groupId, archivedMatch, 'same-name-account')"),
    false
  );
  [
    "restoreAccount(selectedAccount.groupId, selectedAccountEntry, 'account-detail')",
    "restoreAccount(account.groupId, account, 'archived-accounts-list')",
    "restoreAccount(account.groupId, account, 'account-restore-dialog')"
  ].forEach((expectedSource) => assert.equal(restoreEntrySources.includes(expectedSource), true));
});

test('quick entry picker and example account aliases use current title and mark rules', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectStyles();
  const exampleDataSource = readProjectFile('src/exampleData.ts');
  const quickEntryLayerSource = readProjectFile(
    'src/app/quickEntryLayer/QuickEntryPickerLayer.tsx'
  );
  const overlayLayerPropsSource = readProjectFile('src/app/layers/createOverlayLayerProps.ts');
  const quickEntryHostSource = appSource.slice(
    appSource.indexOf('const quickEntryPickerLayerProps'),
    appSource.indexOf('const lockScreenLayerProps')
  );
  const quickPanelSource = readProjectFile('src/features/quickEntry/QuickEntryPanel.tsx');
  const quickPickerSource = readProjectFile('src/features/quickEntry/QuickEntryAccountPicker.tsx');

  assert.equal(appSource.includes('<QuickEntryPickerLayer {...quickEntryPickerLayerProps} />'), true);
  assert.equal(quickEntryHostSource.includes('chooseQuickSingleEntryAccountById'), true);
  assert.equal(overlayLayerPropsSource.includes('createQuickEntryPickerLayerProps'), true);
  assert.equal(quickEntryLayerSource.includes('<QuickEntryPanel'), true);
  assert.equal(quickEntryLayerSource.includes('<QuickEntryAccountPicker'), true);
  assert.equal(`${quickEntryLayerSource}\n${quickPanelSource}`.includes('<p className="eyebrow">记一笔</p>'), false);
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
  const mainContentRendererSource = readProjectFile(
    'src/app/mainContent/MainContentRenderer.tsx'
  );
  const rightPanelRendererSource = readProjectFile('src/app/rightPanel/RightPanelRenderer.tsx');
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
  const accountOperationsControllerSource = readProjectFile(
    'src/features/account/useAccountOperationsController.ts'
  );
  const accountDialogLayerSource = readProjectFile('src/app/accountDialogs/AccountDialogLayer.tsx');
  const stylesSource = readProjectStyles();
  const accountTrendPanelSource = mainContentRendererSource.slice(
    mainContentRendererSource.indexOf('function AccountTrendPanel'),
    mainContentRendererSource.indexOf('export function MainContentRenderer')
  );
  const amountEditorSource = `${accountEditorSource}\n${quickFormSource}`;

  assert.equal(mainContentRendererSource.includes('<AccountDetailPanel'), true);
  assert.equal(mainContentRendererSource.includes('<AccountHistoryList'), true);
  assert.equal(appSource.includes('<AccountDialogLayer'), true);
  assert.equal(accountDialogLayerSource.includes('<AccountAmountEditorDialog'), true);
  assert.equal(accountDialogLayerSource.includes('<AccountInfoEditorDialog'), true);
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
  assert.equal(appSource.includes('useAccountOperationsController({'), true);
  assert.equal(appSource.includes('actions: accountActionsPanelProps'), true);
  assert.equal(appSource.includes('dangerActions: accountDangerActionsPanelProps'), true);
  assert.equal(rightPanelRendererSource.includes('<AccountActionsPanel {...account.actions} />'), true);
  assert.equal(rightPanelRendererSource.includes('<AccountDangerActionsPanel {...account.dangerActions} />'), true);
  assert.equal(appSource.includes('onEditBalance={() => openEditor'), false);
  assert.equal(appSource.includes('const performArchiveAccount'), false);
  assert.equal(appSource.includes('const performDeleteAccount'), false);
  assert.equal(accountOperationsControllerSource.includes('const accountActionsPanelProps'), true);
  assert.equal(accountOperationsControllerSource.includes('const accountDangerActionsPanelProps'), true);
  assert.equal(accountOperationsControllerSource.includes('deleteAccountInAppData({'), true);
  assert.equal(accountOperationsControllerSource.includes("title: '归档账户'"), true);
  assert.equal(accountOperationsControllerSource.includes("title: '删除账户'"), true);
  assert.equal(accountChartSettingsSource.includes('title="图表参数设置"'), true);
  assert.equal(accountChartSettingsSource.includes('由全局图表设置锁定'), true);
  assert.equal(accountChartSettingsSource.includes('contentOverlay'), true);
  assert.equal(accountChartSettingsSource.includes('chart-settings-lock-note'), false);
  assert.equal(accountChartSettingsSource.includes('className="right-panel-page"'), true);
  assert.equal(accountChartSettingsSource.includes('返回账户明细'), false);
  assert.equal(accountChartSettingsSource.includes('className="right-panel-page-action"'), false);
  assert.equal(accountChartSettingsSource.includes('footer={<RightPanelActionButton'), false);
  assert.equal(stylesSource.includes('.chart-settings-locked-panel'), true);
  assert.equal(accountChartSettingsSource.includes('renderSegmentedControl'), true);
  assert.equal(accountChartSettingsSource.includes('updateLocalAccountDetailChartSettings'), false);
  assert.equal(accountActionsSource.includes('返回上一层'), false);
  assert.equal(dangerActionsSource.includes('归档与删除需要再次确认'), false);
  assert.equal(dangerActionsSource.includes('RightPanelSection'), false);
  assert.equal(dangerActionsSource.includes('归档后可在账户新增 / 恢复中重新启用'), false);
  assert.equal(dangerActionsSource.includes('删除后不可恢复'), false);
  assert.equal(dangerActionsSource.includes('<RightPanelActionButton label="归档账户" tone="danger"'), false);
  assert.equal(dangerActionsSource.includes('<RightPanelActionButton label="归档账户" onClick={onArchiveAccount} />'), true);
  assert.equal(dangerActionsSource.includes('<RightPanelActionButton label="删除账户" tone="danger"'), true);
  assert.equal(dangerActionsSource.includes('返回账户明细'), false);
  assert.equal(amountEditorSource.includes('<p className="eyebrow"'), false);
  assert.equal(accountInfoEditorSource.includes('<p className="eyebrow"'), false);
  assert.equal(accountInfoEditorSource.includes('account-alias-preview__name'), false);
  assert.equal(/\bmaxLength\b/.test(accountInfoEditorSource), false);
  assert.equal(accountInfoEditorSource.includes('onChange={(event) => onAccountAliasChange(event.target.value)}'), true);
  assert.equal(appSource.includes('setAccountAliasDraft(limitAccountAliasInput(value))'), false);
  assert.equal(appSource.includes('accountAliasMaxLength'), false);
  assert.equal(amountEditorSource.includes('<span>变更：</span>'), true);
  assert.equal(amountEditorSource.includes('change-preview-amount-line'), true);
  assert.match(stylesSource, /\.change-preview-amount-line\s*\{[^}]*white-space: nowrap;[^}]*\}/s);
  assert.match(stylesSource, /\.account-operation-calendar__day:disabled\s*\{[^}]*pointer-events: none;[^}]*\}/s);
});

test('page coverage scroll reset stays scoped away from view and form state', () => {
  const appSource = readProjectFile('src/App.tsx');
  const pageCoverageLogicSource = readProjectFile('src/app/navigation/pageCoverageLogic.ts');
  const navigationIndexSource = readProjectFile('src/app/navigation/index.ts');
  const pageScrollMemoryLogicSource = readProjectFile('src/app/scroll/pageScrollMemoryLogic.ts');
  const scrollIndexSource = readProjectFile('src/app/scroll/index.ts');
  const scrollEffectsSource = appSource.slice(
    appSource.indexOf('const previousMainPageKey = previousMainPageKeyRef.current;'),
    appSource.indexOf('const snapshotSecurityDialogLayerProps')
  );

  assert.equal(pageCoverageLogicSource.includes("export type PageCoverage = 'full' | 'right-panel-only' | 'none';"), true);
  assert.equal(pageCoverageLogicSource.includes('export const getPageCoverage = ('), true);
  assert.equal(pageCoverageLogicSource.includes('previousPageKey === nextPageKey'), true);
  assert.equal(pageCoverageLogicSource.includes("return 'none';"), true);
  assert.equal(pageCoverageLogicSource.includes("panel === 'main' ? 'full' : 'right-panel-only'"), true);
  assert.equal(navigationIndexSource.includes('getPageCoverage'), true);
  assert.match(appSource, /import\s+\{\s*getPageCoverage\s*\}\s+from\s+'\.\/app\/navigation';/);
  assert.equal(appSource.includes('const getPageCoverage = ('), false);
  assert.equal(appSource.includes("getPageCoverage(previousMainPageKey, mainPageKey, 'main')"), true);
  assert.equal(appSource.includes("getPageCoverage(previousRightPanelKey, rightPanelKey, 'right')"), true);
  assert.equal(getPageCoverage('home', 'home', 'main'), 'none');
  assert.equal(getPageCoverage('home', 'settings', 'main'), 'full');
  assert.equal(getPageCoverage('home-actions', 'search', 'right'), 'right-panel-only');
  assert.equal(pageScrollMemoryLogicSource.includes('export const readPageScrollTop = ('), true);
  assert.equal(pageScrollMemoryLogicSource.includes('export const rememberPageScrollTop = ('), true);
  assert.equal(pageScrollMemoryLogicSource.includes('export const forgetPageScrollTop = ('), true);
  assert.equal(scrollIndexSource.includes('readPageScrollTop'), true);
  assert.equal(appSource.includes('readPageScrollTop(sessionMainScrollPositionsRef.current, mainPageKey)'), true);
  assert.equal(appSource.includes('rememberPageScrollTop('), true);
  assert.equal(appSource.includes('forgetPageScrollTop('), true);
  assert.equal(appSource.includes("leftLayerCoverage === 'full' && !previousLeftLayerKey && Boolean(leftLayerKey)"), true);
  assert.equal(appSource.includes('mainContentRef.current?.scrollTo({ top: 0 });'), true);
  assert.equal(appSource.includes('leftLayerPanelRef.current?.scrollTo({ top: 0 });'), true);
  assert.equal(appSource.includes('rightActionPanelRef.current?.scrollTo({ top: 0 });'), true);
  assert.equal(appSource.includes("intent.type === 'settings' && intent.blockId"), true);
  assert.equal(appSource.includes('skipNextMainScrollResetRef.current = true;'), true);
  assert.equal(appSource.includes('setExpandedGroupIds((current'), true);
  assert.equal(scrollEffectsSource.includes("setDraftAmount('')"), false);
  assert.equal(scrollEffectsSource.includes("setAccountNameDraft('')"), false);
  assert.equal(scrollEffectsSource.includes("setRollupPasteText('')"), false);
  assert.equal(scrollEffectsSource.includes('window.localStorage'), false);

  const scrollMemory = { home: 128 };
  assert.equal(readPageScrollTop(scrollMemory, 'home'), 128);
  assert.equal(readPageScrollTop(scrollMemory, 'settings'), 0);
  rememberPageScrollTop(scrollMemory, 'settings', 256);
  assert.equal(readPageScrollTop(scrollMemory, 'settings'), 256);
  forgetPageScrollTop(scrollMemory, 'home');
  assert.equal(readPageScrollTop(scrollMemory, 'home'), 0);
});

test('home asset stat label stays above amount with muted visual weight', () => {
  const dashboardSummarySource = readProjectFile('src/features/dashboard/DashboardSummaryCards.tsx');
  const overviewSource = readProjectFile('src/features/overview/AssetOverviewPage.tsx');
  const stylesSource = readProjectStyles();
  const homeHeadingSource = dashboardSummarySource.slice(
    dashboardSummarySource.indexOf('className="net-worth-summary__heading"'),
    dashboardSummarySource.indexOf('className={`net-worth-change')
  );

  assert.equal(dashboardSummarySource.includes('className="net-worth-summary__heading"'), true);
  assert.equal(
    homeHeadingSource.indexOf('net-worth-summary__label') <
      homeHeadingSource.indexOf('net-worth-summary__amount'),
    true
  );
  assert.equal(dashboardSummarySource.includes('className="net-worth-summary__amount"'), true);
  assert.equal(dashboardSummarySource.includes('formatHomeMoneyAmount(homeAssetStat.value'), true);
  assert.equal(overviewSource.includes('formatMoney(group.total)'), true);
  assert.equal(overviewSource.includes('formatMoney(account.amount)'), true);
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
  const accountDialogLayerSource = readProjectFile('src/app/accountDialogs/AccountDialogLayer.tsx');
  const accountEditorSource = readProjectFile('src/features/account/AccountEditorDialog.tsx');
  const stylesSource = readProjectStyles();

  assert.equal(appSource.includes('<AccountDialogLayer'), true);
  assert.equal(accountDialogLayerSource.includes('<AccountCreateDialog'), true);
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
  const mainContentRendererSource = readProjectFile(
    'src/app/mainContent/MainContentRenderer.tsx'
  );
  const rightPanelRendererSource = readProjectFile('src/app/rightPanel/RightPanelRenderer.tsx');
  const appearanceSettingsPanelSource = readProjectFile(
    'src/features/settings/AppearanceSettingsPanel.tsx'
  );
  const settingsPageSource = readProjectFile('src/features/settings/SettingsPage.tsx');
  const allocationPanelSource = readProjectFile('src/features/charts/AssetAllocationPanel.tsx');
  const trendPanelSource = readProjectFile('src/features/charts/AssetTrendPanel.tsx');
  const chartDisplayPanelSource = readProjectFile('src/features/charts/ChartDisplayPanel.tsx');
  const chartSettingsPanelSource = readProjectFile('src/features/charts/ChartSettingsPanel.tsx');
  const groupStructureSource = chartDisplayPanelSource.slice(
    chartDisplayPanelSource.indexOf('function GroupDetailStructurePanel'),
    chartDisplayPanelSource.indexOf('const getGroupDetailTrendBoundaryMessage')
  );
  const groupDetailActionsSource = rightPanelRendererSource.slice(
    rightPanelRendererSource.indexOf('function GroupDetailActions'),
    rightPanelRendererSource.indexOf('export function RightPanelRenderer')
  );
  const migratedSettingsSource = `${appearanceSettingsPanelSource}\n${settingsPageSource}`;

  assert.equal(`${appSource}\n${migratedSettingsSource}`.includes(['首页显示', '资产统计数值类型'].join('')), false);
  assert.equal(migratedSettingsSource.includes('资产统计数值类型'), true);
  assert.equal(appSource.includes('资产统计数值类型'), false);
  assert.equal(appSource.includes('function AssetStructurePanel'), false);
  assert.equal(appSource.includes('function AssetTrendPanel'), false);
  assert.equal(appSource.includes('function ChartLegendList'), false);
  assert.equal(mainContentRendererSource.includes('<TotalAssetChartDisplayPanel'), true);
  assert.equal(chartDisplayPanelSource.includes('<AssetChartsPanel'), true);
  assert.equal(chartDisplayPanelSource.includes('<AssetAllocationPanel'), true);
  assert.equal(chartDisplayPanelSource.includes('<AssetTrendPanel'), true);
  assert.equal(rightPanelRendererSource.includes('<ChartSettingsPanel'), true);
  assert.equal(allocationPanelSource.includes('<h2>资产占比</h2>'), true);
  assert.equal(appSource.includes(['<p className="eyebrow">', '资产结构', '</p>'].join('')), false);
  assert.equal(trendPanelSource.includes('<h2>资产趋势</h2>'), true);
  assert.equal(chartSettingsPanelSource.includes('title="图表设置"'), true);
  assert.equal(chartSettingsPanelSource.includes('返回资产总览'), false);
  assert.equal(chartSettingsPanelSource.includes('className="right-panel-page"'), true);
  assert.equal(chartSettingsPanelSource.includes('className="right-panel-page-action"'), false);
  assert.equal(chartSettingsPanelSource.includes('footer={<RightPanelActionButton'), false);
  assert.equal(groupDetailActionsSource.includes('title="图表参数设置"'), true);
  assert.equal(groupDetailActionsSource.includes('footer={renderRightPanelActionButton'), false);
  assert.equal(groupDetailActionsSource.includes('返回资产总览'), false);
  assert.equal(groupDetailActionsSource.includes("className: 'right-panel-page-action'"), false);
  assert.equal(groupStructureSource.includes('<span>当前合计</span>'), false);
  assert.equal(groupStructureSource.includes('formatChartNumber(data.signedTotal)'), false);
  assert.equal(groupStructureSource.includes('<AccountStructureGraphic'), true);
  assert.equal(
    groupStructureSource.includes('asset-structure-detail asset-structure-detail--account-share'),
    true
  );
  assert.equal(groupStructureSource.includes('activeSegmentId={hoveredSeriesId}'), true);
  assert.equal(groupStructureSource.includes('onActiveIdChange={setHoveredSeriesId}'), true);
  assert.equal(`${appSource}\n${migratedSettingsSource}`.includes('选中后立即影响正负变化数字的文本颜色和标签底色。'), false);
  assert.equal(`${appSource}\n${migratedSettingsSource}`.includes('决定图表颜色按创建顺序固定分配，或按当前占比动态分配。'), false);
  assert.equal(`${appSource}\n${migratedSettingsSource}`.includes('主题、正负值颜色与首页资产统计显示。'), false);
  assert.equal(`${appSource}\n${migratedSettingsSource}`.includes('图表配色、首页缩略图表与全局图表控制。'), false);
  assert.equal(`${appSource}\n${migratedSettingsSource}`.includes('搜索逻辑与关键词匹配方式。'), false);
  assert.equal(`${appSource}\n${migratedSettingsSource}`.includes('用户配置文件、历史记录备份、快照与示例数据。'), false);
  assert.equal(`${appSource}\n${migratedSettingsSource}`.includes('登录密码、自动锁定与快照加密。'), false);
  assert.equal(`${appSource}\n${migratedSettingsSource}`.includes('软件信息、字体许可、联系与版本信息。'), false);
  assert.equal(`${appSource}\n${migratedSettingsSource}`.includes('强相关：结果更保守，只显示更确定的匹配。'), false);
  assert.equal(`${appSource}\n${migratedSettingsSource}`.includes('允许推断：允许日期、金额、拼音、近似等推断匹配。'), false);
});

test('shared control height drives right panel, settings, segmented, and modal buttons', () => {
  const stylesSource = readProjectStyles();

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
  const stylesSource = readProjectStyles();
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
  const appDialogLayerSource = readProjectFile('src/app/feedback/AppDialogLayer.tsx');
  const accountDialogLayerSource = readProjectFile('src/app/accountDialogs/AccountDialogLayer.tsx');
  const flashNoteHostLayerSource = readProjectFile(
    'src/app/flashNoteLayer/FlashNoteHostLayer.tsx'
  );
  const snapshotSecurityDialogLayerSource = readProjectFile(
    'src/app/snapshotSecurityDialogs/SnapshotSecurityDialogLayer.tsx'
  );
  const resetDangerDialogLayerSource = readProjectFile(
    'src/app/resetDangerDialog/ResetDangerDialogLayer.tsx'
  );
  const lockScreenLayerSource = readProjectFile('src/app/lockScreen/LockScreenLayer.tsx');
  const confirmDialogSource = readProjectFile('src/components/dialogs/ConfirmDialog.tsx');
  const inputDialogSource = readProjectFile('src/components/dialogs/InputDialog.tsx');
  const noticeDialogSource = readProjectFile('src/components/dialogs/NoticeDialog.tsx');
  const accountEditorSource = readProjectFile('src/features/account/AccountEditorDialog.tsx');
  const accountInfoEditorSource = readProjectFile('src/features/account/AccountInfoEditorDialog.tsx');
  const accountOperationsControllerSource = readProjectFile(
    'src/features/account/useAccountOperationsController.ts'
  );
  const passwordEditorSource = readProjectFile('src/features/settings/PasswordEditorDialog.tsx');
  const snapshotPasswordEditorSource = readProjectFile(
    'src/features/settings/SnapshotPasswordEditorDialog.tsx'
  );
  const snapshotEncryptionDisableSource = readProjectFile(
    'src/features/settings/SnapshotEncryptionDisableDialog.tsx'
  );
  const securityControllerSource = readProjectFile(
    'src/features/security/useSecuritySettingsController.tsx'
  );
  const appDialogControllerSource = readProjectFile(
    'src/app/useAppDialogController.ts'
  );
  const backupControllerSource = readProjectFile(
    'src/features/backup/useSnapshotBackupController.tsx'
  );
  const backupLogicSource = readProjectFile('src/features/backup/snapshotBackupLogic.ts');
  const userSettingsControllerSource = readProjectFile(
    'src/features/userSettings/useUserSettingsFileController.ts'
  );
  const userSettingsLogicSource = readProjectFile(
    'src/features/userSettings/userSettingsFileLogic.ts'
  );
  const rollupControllerSource = readProjectFile(
    'src/features/rollupImport/useRollupImportController.ts'
  );
  const mainSource = readProjectFile('electron/main.ts');
  const packageJson = JSON.parse(readProjectFile('package.json')) as { version?: string };

  const popupSources = [
    appSource.slice(appSource.indexOf('const enterExampleMode'), appSource.indexOf('const resetUserConfiguration')),
    flashNoteHostLayerSource,
    rollupControllerSource,
    snapshotSecurityDialogLayerSource,
    resetDangerDialogLayerSource,
    lockScreenLayerSource,
    appDialogLayerSource,
    accountDialogLayerSource,
    appDialogControllerSource,
    securityControllerSource,
    backupControllerSource,
    userSettingsControllerSource,
    confirmDialogSource,
    inputDialogSource,
    noticeDialogSource,
    accountEditorSource,
    accountInfoEditorSource,
    accountOperationsControllerSource,
    passwordEditorSource,
    snapshotPasswordEditorSource,
    snapshotEncryptionDisableSource
  ].filter((source) => source.length > 0);

  assert.equal(appSource.includes('<SnapshotSecurityDialogLayer'), true);
  assert.equal(appSource.includes('<ResetDangerDialogLayer'), true);
  assert.equal(appSource.includes('<LockScreenLayer'), true);
  assert.equal(snapshotSecurityDialogLayerSource.includes('<PasswordEditorDialog'), true);
  assert.equal(snapshotSecurityDialogLayerSource.includes('<SnapshotPasswordEditorDialog'), true);
  assert.equal(snapshotSecurityDialogLayerSource.includes('<SnapshotEncryptionDisableDialog'), true);
  assert.equal(resetDangerDialogLayerSource.includes('id="reset-confirmation-title"'), true);
  assert.equal(resetDangerDialogLayerSource.includes('className="reset-confirmation-code"'), true);
  assert.equal(resetDangerDialogLayerSource.includes('onConfirm();'), true);
  assert.equal(lockScreenLayerSource.includes('className="lock-screen"'), true);
  assert.equal(lockScreenLayerSource.includes('aria-labelledby="lock-title"'), true);
  assert.equal(lockScreenLayerSource.includes('onSubmit={onSubmit}'), true);

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
  assert.equal(
    /\b(?:window\.)?(?:alert|confirm|prompt)\s*\(|showMessageBox\s*\(|showErrorBox\s*\(/.test(
      [
        appSource,
        appDialogControllerSource,
        accountOperationsControllerSource,
        securityControllerSource,
        backupControllerSource,
        userSettingsControllerSource,
        backupLogicSource,
        userSettingsLogicSource,
        mainSource
      ].join('\n')
    ),
    false
  );
  assert.equal(packageJson.version, '0.9.5');
  assert.equal(
    userSettingsLogicSource.includes(
      'netraflow-settings-${year}${month}${day}-${hour}${minute}${second}.netraflow-settings.json'
    ),
    true
  );
  assert.equal(backupLogicSource.includes("encrypted ? '.encrypted' : ''"), true);
});

test('release documentation keeps packaging notes scoped to changelog', () => {
  const changelogSource = readProjectFile('CHANGELOG.md');
  const readmeSource = readProjectFile('README.md');

  assert.equal(
    normalizeLineEndings(readmeSource),
    normalizeLineEndings(readHeadProjectFile('README.md'))
  );
  assert.equal(changelogSource.includes('## 0.9.2'), true);
  assert.equal(changelogSource.includes('## 0.9.3'), true);
  assert.equal(readmeSource.includes('0.9.3'), false);
  assert.equal(changelogSource.includes('优化安装与卸载流程'), true);
  assert.equal(changelogSource.includes('安装版与便携版打包流程'), true);
  assert.equal(changelogSource.includes('用户数据与运行缓存分离'), true);
  assert.equal(changelogSource.includes('示例模式入口跳转'), true);
  assert.equal(changelogSource.includes('历史记录时间显示'), true);
  assert.equal(changelogSource.includes('图标与文件版本资源'), true);
  assert.equal(changelogSource.includes('AppListBackup'), false);
  assert.equal(changelogSource.includes('App.tsx'), false);
  assert.equal(changelogSource.includes('RightPanelSection'), false);
  assert.equal(changelogSource.includes('npm test'), false);
});

test('flash note visual copy removes extra eyebrows and keeps mode labels explicit', () => {
  const appSource = readProjectFile('src/App.tsx');
  const mainContentRendererSource = readProjectFile(
    'src/app/mainContent/MainContentRenderer.tsx'
  );
  const stylesSource = readProjectStyles();
  const flashNoteHostLayerSource = readProjectFile(
    'src/app/flashNoteLayer/FlashNoteHostLayer.tsx'
  );
  const flashSelectSource = readProjectFile('src/features/flashNote/FlashSelectStep.tsx');
  const flashPageSource = readProjectFile('src/features/flashNote/FlashNotePage.tsx');
  const selectionToolsSource = flashSelectSource.slice(
    flashSelectSource.indexOf('const selectionTools'),
    flashSelectSource.indexOf('const dateRuleTools')
  );
  const dateRuleToolsSource = flashSelectSource.slice(
    flashSelectSource.indexOf('const dateRuleTools'),
    flashSelectSource.indexOf('export function FlashSelectStep')
  );
  const flashExitSource = flashNoteHostLayerSource.slice(
    flashNoteHostLayerSource.indexOf('{exitConfirm.isOpen'),
    flashNoteHostLayerSource.indexOf('{returnDateConfirm.isOpen')
  );

  assert.equal(mainContentRendererSource.includes('<FlashNoteHostLayer'), true);
  assert.equal(flashNoteHostLayerSource.includes('<FlashNotePage'), true);
  assert.equal(flashSelectSource.includes('<p className="eyebrow">输入模式</p>'), false);
  assert.equal(flashSelectSource.includes('净值变动（change）'), true);
  assert.equal(flashSelectSource.includes('账户余额（balance）'), true);
  assert.equal(flashSelectSource.includes("label: '拖选日期'"), true);
  assert.equal(flashSelectSource.includes("title: '拖选日期'"), true);
  assert.equal(flashSelectSource.includes("title: '合并选区'"), true);
  assert.equal(flashSelectSource.includes("title: '移除日期'"), true);
  assert.equal(flashSelectSource.includes("title: '拖选日期：点击选择单日，拖动选择连续日期'"), false);
  assert.equal(flashSelectSource.includes("title: '合集：合并日期选区'"), false);
  assert.equal(flashSelectSource.includes("title: '删除：从选区中移除日期'"), false);
  assert.equal(flashSelectSource.includes("label: '单选'"), false);
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
  assert.equal(flashSelectSource.includes('title={tool.title}'), false);
  assert.equal(flashSelectSource.includes('title={item.title}'), false);
  assert.equal(flashSelectSource.includes('<NfTooltip key={tool.mode} content={tool.title}>'), true);
  assert.equal(flashSelectSource.includes('<NfTooltip key={item.rule} content={item.title}>'), true);
  assert.equal(appSource.includes("'date-select'"), false);
  assert.equal(appSource.includes("'mode-select'"), false);
  assert.equal(appSource.includes("'sequence-input'"), false);
  assert.equal(appSource.includes("'correction'"), false);
  assert.equal(flashExitSource.includes('退出闪记'), false);
  assert.equal(flashPageSource.includes('Esc 返回'), false);
  assert.equal(flashPageSource.includes('返回选择'), false);
  assert.equal(flashPageSource.includes('返回输入'), false);
  assert.equal(flashPageSource.includes('className="flash-note-stage-pill__button"'), false);
  assert.equal(flashPageSource.includes('is-actionable'), false);
  assert.equal(flashPageSource.includes('退出'), false);
  assert.equal(flashPageSource.includes('进入确认'), true);
  assert.equal(flashPageSource.includes('完成写入'), true);
  assert.equal(flashPageSource.includes('确认写入'), false);
  assert.equal(flashPageSource.includes('Enter 下一格 · Backspace 删除一位 · Ctrl+Z 清空并回退'), true);
  assert.equal(flashPageSource.includes('点击数据块修改 · Enter 下一项 · Delete 清空'), true);
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
  const stylesSource = readProjectStyles();
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

test('NF tooltip replaces high frequency native hover titles', () => {
  const appSource = readProjectFile('src/App.tsx');
  const rightPanelRendererSource = readProjectFile('src/app/rightPanel/RightPanelRenderer.tsx');
  const stylesSource = readProjectStyles();
  const tooltipSource = readProjectFile('src/components/tooltip/NfTooltip.tsx');
  const floatingTooltipSource = readProjectFile('src/components/tooltip/NfFloatingTooltip.tsx');
  const tooltipIndexSource = readProjectFile('src/components/tooltip/index.ts');
  const svgIconSource = readProjectFile('src/components/NfSvgIcon.tsx');
  const allocationPanelSource = readProjectFile('src/features/charts/AssetAllocationPanel.tsx');
  const trendPanelSource = readProjectFile('src/features/charts/AssetTrendPanel.tsx');
  const chartDisplayPanelSource = readProjectFile('src/features/charts/ChartDisplayPanel.tsx');
  const overviewSource = readProjectFile('src/features/overview/AssetOverviewPage.tsx');
  const flashSelectSource = readProjectFile('src/features/flashNote/FlashSelectStep.tsx');
  const flashPageSource = readProjectFile('src/features/flashNote/FlashNotePage.tsx');
  const historyRecordSource = readProjectFile('src/features/history/HistoryRecordList.tsx');
  const windowControlsSource = readProjectFile('src/app/windowFrame/WindowControls.tsx');
  const chartTooltipSource = [
    allocationPanelSource,
    trendPanelSource,
    chartDisplayPanelSource
  ].join('\n');

  assert.equal(existsSync(new URL('../../../src/components/tooltip/NfTooltip.tsx', import.meta.url)), true);
  assert.equal(existsSync(new URL('../../../src/components/tooltip/NfFloatingTooltip.tsx', import.meta.url)), true);
  assert.equal(existsSync(new URL('../../../src/components/tooltip/nfTooltipTypes.ts', import.meta.url)), true);
  assert.equal(tooltipSource.includes('createPortal'), true);
  assert.equal(tooltipSource.includes('role="tooltip"'), true);
  assert.equal(tooltipSource.includes('aria-describedby'), true);
  assert.equal(floatingTooltipSource.includes('createPortal'), true);
  assert.equal(floatingTooltipSource.includes('role="tooltip"'), true);
  assert.equal(tooltipIndexSource.includes('NfTooltip'), true);
  assert.equal(tooltipIndexSource.includes('NfFloatingTooltip'), true);
  assert.equal(stylesSource.includes('.nf-tooltip-trigger'), true);
  assert.equal(stylesSource.includes('.nf-tooltip'), true);
  assert.equal(stylesSource.includes('max-width: min(420px, calc(100vw - 32px));'), true);
  assert.equal(stylesSource.includes('white-space: nowrap;'), true);
  assert.equal(stylesSource.includes('overflow-wrap: normal;'), true);
  assert.equal(stylesSource.includes('.nf-tooltip--wrap'), true);
  assert.equal(stylesSource.includes('.nf-tooltip--chart'), true);
  assert.equal(stylesSource.includes('max-width: min(260px, calc(100vw - 16px));'), false);
  assert.equal(svgIconSource.includes('title={title}'), false);
  assert.equal(chartTooltipSource.includes('<title'), false);
  assert.equal(allocationPanelSource.includes('<NfFloatingTooltip tooltip='), false);
  assert.equal(chartDisplayPanelSource.includes('<NfFloatingTooltip tooltip='), false);
  assert.equal(trendPanelSource.includes('<NfFloatingTooltip tooltip={chartTooltip}'), true);
  assert.equal(chartTooltipSource.includes('aria-label={tooltipLabel}'), true);
  assert.equal(overviewSource.includes('title="拖拽排序"'), false);
  assert.equal(overviewSource.includes('title={currentCanDeleteGroup'), false);
  assert.equal(overviewSource.includes('<NfTooltip content="排序">'), true);
  assert.equal(overviewSource.includes("'该类型下存在有效账户'"), true);
  assert.equal(overviewSource.includes("'请先归档或删除未归档账户'"), false);
  assert.equal(flashSelectSource.includes('title={tool.title}'), false);
  assert.equal(flashSelectSource.includes('title={item.title}'), false);
  assert.equal(flashPageSource.includes('title={returnAction.label}'), false);
  assert.equal(flashPageSource.includes('<NfTooltip content={returnAction.label}>'), false);
  assert.equal(historyRecordSource.includes('title="汇总导入"'), false);
  assert.equal(appSource.includes("title={autoBackupDraft.directory || '未选择目录'}"), false);
  assert.equal(appSource.includes('title="汇总导入"'), false);
  assert.equal(appSource.includes('<NfTooltip content="汇总导入">'), false);
  assert.equal(rightPanelRendererSource.includes('wrap'), true);
  assert.equal(windowControlsSource.includes('NfTooltip'), false);
  assert.equal(windowControlsSource.includes('aria-label="最小化"'), true);
  assert.equal(windowControlsSource.includes("aria-label={isMaximized ? '还原' : '最大化'}"), true);
  assert.equal(windowControlsSource.includes('aria-label="关闭"'), true);
});

test('home account type edit mode exposes centered sort and delete actions', () => {
  const appSource = readProjectFile('src/App.tsx');
  const mainContentPropsSource = readProjectFile(
    'src/app/mainContent/createMainContentRendererProps.tsx'
  );
  const overviewSource = readProjectFile('src/features/overview/AssetOverviewPage.tsx');
  const stylesSource = readProjectStyles();
  const entryStart = overviewSource.indexOf('data-account-type-entry="true"');
  const entrySource = overviewSource.slice(
    entryStart,
    overviewSource.indexOf('{expanded ? (', entryStart)
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
  assert.equal(entrySource.includes('{sortIcon}'), true);
  assert.equal(entrySource.includes('{deleteIcon}'), true);
  assert.equal(entrySource.includes('<NfTooltip content="排序">'), true);
  assert.equal(entrySource.includes("'该类型下存在有效账户'"), true);
  assert.equal(entrySource.includes("'请先归档或删除未归档账户'"), false);
  assert.equal(entrySource.includes('title="拖拽排序"'), false);
  assert.equal(entrySource.includes('title={currentCanDeleteGroup'), false);
  assert.equal(mainContentPropsSource.includes('NfSortIcon'), true);
  assert.equal(mainContentPropsSource.includes('NfWindowCloseIcon'), true);
  assert.equal(entrySource.includes('data-interactive'), true);
  assert.equal(entrySource.includes('disabled={!currentCanDeleteGroup}'), true);
  assert.equal(entrySource.includes('onDeleteGroup(group.id)'), true);
  assert.equal(overviewSource.includes('currentCanDeleteGroup = canDeleteGroup(group.id)'), true);
  assert.equal(mainContentPropsSource.includes('canDeleteAssetGroup(groupId, dashboard.accounts)'), true);
  assert.equal(appSource.includes('onDeleteGroup: deleteAssetGroup'), true);
  assert.equal(entrySource.indexOf('</button>') < entrySource.indexOf('account-type-entry-actions'), true);
  assert.equal(entrySource.includes('draggable={isGroupEditMode}'), true);
  assert.equal(entrySource.includes('onGroupDragStart(event, group.id)'), true);
  assert.equal(entrySource.includes('onGroupDragOver(event, group.id)'), true);
  assert.equal(entrySource.includes('onGroupDragLeave(event, group.id)'), true);
  assert.equal(entrySource.includes('onGroupDrop(event, group.id)'), true);
  assert.equal(entrySource.includes('onDragEnd={onGroupDragEnd}'), true);
  assert.equal(appSource.includes('onGroupDragStart: handleGroupDragStart'), true);
  assert.equal(appSource.includes('onGroupDragOver: handleGroupDragOver'), true);
  assert.equal(appSource.includes('onGroupDragLeave: handleGroupDragLeave'), true);
  assert.equal(appSource.includes('onGroupDrop: handleGroupDrop'), true);
  assert.equal(appSource.includes('onGroupDragEnd: handleGroupDragEnd'), true);
  assert.equal(entrySource.includes('data-account-type-drop-indicator'), true);
  assert.equal(overviewSource.includes('account-type-entry--drop-${groupDropPosition}'), true);
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

test('home account type mouse click is deferred without delaying keyboard toggle', () => {
  const appSource = readProjectFile('src/App.tsx');
  const overviewSource = readProjectFile('src/features/overview/AssetOverviewPage.tsx');
  const clickSource = appSource.slice(
    appSource.indexOf('const handleGroupClick'),
    appSource.indexOf('const saveGroupDetailInfo')
  );

  assert.equal(appSource.includes('const GROUP_CLICK_DELAY_MS = 220;'), true);
  assert.equal(appSource.includes('const groupClickTimerRef = useRef<number | null>(null);'), true);
  assert.equal(appSource.includes('const clearPendingGroupClick = () =>'), true);
  assert.equal(overviewSource.includes('onClick={(event) => onGroupClick(group.id, event.detail)}'), true);
  assert.equal(clickSource.includes('if (clickDetail === 0)'), true);
  assert.equal(clickSource.includes('toggleGroup(groupId);'), true);
  assert.match(
    clickSource,
    /groupClickTimerRef\.current = window\.setTimeout\(\(\) => \{[\s\S]*toggleGroup\(groupId\);[\s\S]*GROUP_CLICK_DELAY_MS/
  );
  assert.equal(clickSource.includes('openGroupDetailPage(groupId)'), true);
  assert.equal(appSource.includes("if (mainPageKey !== 'home')"), true);
});

test('asset group delete action uses danger styling and clears dangling group ui state', () => {
  const appSource = readProjectFile('src/App.tsx');
  const stylesSource = readProjectStyles();
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
    'flashNote.close()',
    'closeAccountTypeEditor()',
    'setNewAccountGroupId',
    'setNewAccountTypeInput',
    'normalizeTypeSearchText(currentInput) === normalizeTypeSearchText(groupName)',
    'rollupImport.removeAssignmentsForGroup(groupId)'
  ].forEach((expectedSource) => assert.equal(cleanupSource.includes(expectedSource), true));
});
