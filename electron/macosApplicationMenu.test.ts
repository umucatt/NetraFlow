import assert from 'node:assert/strict';
import test from 'node:test';
import type { MenuItemConstructorOptions } from 'electron';

import {
  createMacosApplicationMenuTemplate,
  installMacosApplicationMenu,
  resolveMacosMenuLanguage
} from './macosApplicationMenu.js';
import { LOCK_ACCELERATOR } from './applicationLockShortcut.js';

const createMenuCallbacks = () => ({
  onOpenSettings: () => undefined,
  onLock: () => undefined,
  isWindowReady: () => true,
  isLockEnabled: () => true,
  getPreferredLanguages: () => ['zh-CN']
});

const getSubmenu = (item: MenuItemConstructorOptions) => {
  assert.ok(Array.isArray(item.submenu));
  return item.submenu;
};

const getRoleItem = (
  submenu: MenuItemConstructorOptions[],
  role: MenuItemConstructorOptions['role']
) => {
  const item = submenu.find((candidate) => candidate.role === role);

  assert.ok(item);
  return item;
};

test('macOS application menu gives every visible standard command an explicit simplified-Chinese label', () => {
  let lockCalls = 0;
  const template = createMacosApplicationMenuTemplate('NetraFlow', {
    ...createMenuCallbacks(),
    preferredLanguages: ['zh-CN'],
    onLock: () => {
      lockCalls += 1;
    }
  });
  const [appMenu, editMenu, windowMenu] = template;
  const appSubmenu = getSubmenu(appMenu);
  const editSubmenu = getSubmenu(editMenu);
  const windowSubmenu = getSubmenu(windowMenu);

  assert.equal(appMenu.label, 'NetraFlow');
  assert.equal(editMenu.label, '编辑');
  assert.equal(editMenu.role, undefined);
  assert.equal(windowMenu.label, '窗口');
  assert.equal(windowMenu.role, undefined);
  assert.equal(getRoleItem(appSubmenu, 'about').label, '关于 NetraFlow');
  assert.equal(getRoleItem(appSubmenu, 'hide').label, '隐藏 NetraFlow');
  assert.equal(getRoleItem(appSubmenu, 'hideOthers').label, '隐藏其他应用');
  assert.equal(getRoleItem(appSubmenu, 'unhide').label, '全部显示');
  assert.equal(getRoleItem(appSubmenu, 'quit').label, '退出 NetraFlow');

  const lockItem = appSubmenu.find((item) => item.label === '锁定 NetraFlow');
  assert.ok(lockItem);
  assert.equal(lockItem.accelerator, LOCK_ACCELERATOR);
  assert.equal(lockItem.accelerator, 'CommandOrControl+Shift+L');
  (lockItem.click as (() => void) | undefined)?.();
  assert.equal(lockCalls, 1);

  assert.deepEqual(
    editSubmenu.map((item) => item.role),
    ['undo', 'redo', undefined, 'cut', 'copy', 'paste', 'selectAll']
  );
  assert.deepEqual(
    editSubmenu.filter((item) => item.role).map((item) => item.label),
    ['撤销', '重做', '剪切', '复制', '粘贴', '全选']
  );
  assert.deepEqual(
    windowSubmenu.map((item) => item.role),
    ['close', undefined, 'minimize', 'zoom', undefined, 'front']
  );
  assert.equal(getRoleItem(windowSubmenu, 'close').label, '关闭窗口');
  assert.equal(getRoleItem(windowSubmenu, 'close').accelerator, 'CmdOrCtrl+W');
  assert.deepEqual(
    windowSubmenu.filter((item) => item.role).map((item) => item.label),
    ['关闭窗口', '最小化', '缩放', '前置所有窗口']
  );
});

test('macOS application menu resolves supported languages in preferred-language order', () => {
  assert.equal(resolveMacosMenuLanguage(['zh-CN']), 'zh-Hans');
  assert.equal(resolveMacosMenuLanguage(['zh-Hans']), 'zh-Hans');
  assert.equal(resolveMacosMenuLanguage(['zh-Hans-CN']), 'zh-Hans');
  assert.equal(resolveMacosMenuLanguage(['zh-Hans-SG']), 'zh-Hans');
  assert.equal(resolveMacosMenuLanguage(['zh-SG']), 'zh-Hans');
  assert.equal(resolveMacosMenuLanguage(['zh-MY']), 'zh-Hans');
  assert.equal(resolveMacosMenuLanguage(['zh-TW']), 'zh-Hant');
  assert.equal(resolveMacosMenuLanguage(['zh-Hant']), 'zh-Hant');
  assert.equal(resolveMacosMenuLanguage(['zh-Hant-TW']), 'zh-Hant');
  assert.equal(resolveMacosMenuLanguage(['zh-Hant-HK']), 'zh-Hant');
  assert.equal(resolveMacosMenuLanguage(['zh-Hant-MO']), 'zh-Hant');
  assert.equal(resolveMacosMenuLanguage(['zh-HK']), 'zh-Hant');
  assert.equal(resolveMacosMenuLanguage(['zh-MO']), 'zh-Hant');
  assert.equal(resolveMacosMenuLanguage(['zh_Hans_CN']), 'zh-Hans');
  assert.equal(resolveMacosMenuLanguage(['ZH-hAnT-hK-u-nu-hanidec']), 'zh-Hant');
  assert.equal(resolveMacosMenuLanguage(['en-US']), 'en');
  assert.equal(resolveMacosMenuLanguage(['fr-FR']), 'en');
  assert.equal(resolveMacosMenuLanguage(['fr-FR', 'zh-CN']), 'zh-Hans');
  assert.equal(resolveMacosMenuLanguage(['en-US', 'zh-CN']), 'en');
  assert.equal(resolveMacosMenuLanguage(['ja-JP', 'zh-Hans-CN', 'en-US']), 'zh-Hans');
  assert.equal(resolveMacosMenuLanguage(['invalid_tag', 'zh-Hant-HK']), 'zh-Hant');
  assert.equal(resolveMacosMenuLanguage([], ['zh-Hant-TW']), 'zh-Hant');
  assert.equal(resolveMacosMenuLanguage([], ['invalid_tag', 'en-US']), 'en');
});

test('macOS application menu uses one complete label table for traditional Chinese and English', () => {
  const getVisibleLabels = (preferredLanguages: string[]) => {
    const template = createMacosApplicationMenuTemplate('NetraFlow', {
      ...createMenuCallbacks(),
      preferredLanguages
    });

    return template.flatMap((menu) => [
      menu.label,
      ...getSubmenu(menu).flatMap((item) => (item.label ? [item.label] : []))
    ]);
  };

  const traditionalChinese = getVisibleLabels(['zh-TW']);
  assert.deepEqual(traditionalChinese, [
    'NetraFlow',
    '關於 NetraFlow',
    '設定…',
    '鎖定 NetraFlow',
    '隱藏 NetraFlow',
    '隱藏其他應用程式',
    '全部顯示',
    '結束 NetraFlow',
    '編輯',
    '復原',
    '重做',
    '剪下',
    '複製',
    '貼上',
    '全選',
    '視窗',
    '關閉視窗',
    '最小化',
    '縮放',
    '將所有視窗移到最前方'
  ]);

  const english = getVisibleLabels(['en-US']);
  assert.deepEqual(english, [
    'NetraFlow',
    'About NetraFlow',
    'Settings…',
    'Lock NetraFlow',
    'Hide NetraFlow',
    'Hide Others',
    'Show All',
    'Quit NetraFlow',
    'Edit',
    'Undo',
    'Redo',
    'Cut',
    'Copy',
    'Paste',
    'Select All',
    'Window',
    'Close Window',
    'Minimize',
    'Zoom',
    'Bring All to Front'
  ]);
});

test('macOS menu installs once and refreshes only dynamic enabled states', () => {
  const builtTemplates: MenuItemConstructorOptions[][] = [];
  const installedMenus: unknown[] = [];
  let windowReady = true;
  let lockEnabled = true;
  let applicationMenu: {
    getMenuItemById: (id: string) => { enabled: boolean } | null;
  } | null = null;
  const menu = {
    buildFromTemplate: (template: MenuItemConstructorOptions[]) => {
      builtTemplates.push(template);
      const items = new Map<string, { enabled: boolean }>();

      template.flatMap((topLevelItem) => getSubmenu(topLevelItem)).forEach((item) => {
        if (item.id) {
          items.set(item.id, { enabled: item.enabled ?? true });
        }
      });

      return {
        getMenuItemById: (id: string) => items.get(id) ?? null
      };
    },
    setApplicationMenu: (nextApplicationMenu: NonNullable<typeof applicationMenu>) => {
      applicationMenu = nextApplicationMenu;
      installedMenus.push(nextApplicationMenu);
    }
    ,
    getApplicationMenu: () => applicationMenu
  };

  const controller = installMacosApplicationMenu({
    platform: 'darwin',
    appName: 'NetraFlow',
    menu,
    ...createMenuCallbacks(),
    isWindowReady: () => windowReady,
    isLockEnabled: () => lockEnabled
  });
  assert.ok(controller);
  assert.equal(builtTemplates.length, 1);
  assert.equal(installedMenus.length, 1);
  assert.equal(builtTemplates[0][1].label, '编辑');
  assert.equal(getRoleItem(getSubmenu(builtTemplates[0][2]), 'close').label, '关闭窗口');

  windowReady = false;
  lockEnabled = false;
  controller.refresh();
  assert.equal(builtTemplates.length, 1);
  assert.equal(installedMenus.length, 1);
  assert.equal(applicationMenu?.getMenuItemById('mac-menu-settings')?.enabled, false);
  assert.equal(applicationMenu?.getMenuItemById('mac-menu-lock')?.enabled, false);

  assert.equal(
    installMacosApplicationMenu({
      platform: 'win32',
      appName: 'NetraFlow',
      menu,
      ...createMenuCallbacks()
    }),
    null
  );
  assert.equal(
    installMacosApplicationMenu({
      platform: 'linux',
      appName: 'NetraFlow',
      menu,
      ...createMenuCallbacks()
    }),
    null
  );
});
