import type { MenuItemConstructorOptions } from 'electron';
import { LOCK_ACCELERATOR } from './applicationLockShortcut.js';

type ApplicationMenuAdapter<TMenu> = {
  buildFromTemplate: (template: MenuItemConstructorOptions[]) => TMenu;
  setApplicationMenu: (menu: TMenu) => void;
  getApplicationMenu: () => TMenu | null;
};

type ApplicationMenuItem = {
  enabled: boolean;
};

type ApplicationMenuWithItems = {
  getMenuItemById: (id: string) => ApplicationMenuItem | null;
};

export type MacosApplicationMenuController = {
  refresh: () => void;
};

export type MacosMenuLanguage = 'en' | 'zh-Hans' | 'zh-Hant';

const MACOS_MENU_LABELS: Record<
  MacosMenuLanguage,
  {
    about: (appName: string) => string;
    settings: string;
    lock: (appName: string) => string;
    hide: (appName: string) => string;
    hideOthers: string;
    unhide: string;
    quit: (appName: string) => string;
    editMenu: string;
    undo: string;
    redo: string;
    cut: string;
    copy: string;
    paste: string;
    selectAll: string;
    windowMenu: string;
    close: string;
    minimize: string;
    zoom: string;
    front: string;
  }
> = {
  en: {
    about: (appName) => `About ${appName}`,
    settings: 'Settings…',
    lock: (appName) => `Lock ${appName}`,
    hide: (appName) => `Hide ${appName}`,
    hideOthers: 'Hide Others',
    unhide: 'Show All',
    quit: (appName) => `Quit ${appName}`,
    editMenu: 'Edit',
    undo: 'Undo',
    redo: 'Redo',
    cut: 'Cut',
    copy: 'Copy',
    paste: 'Paste',
    selectAll: 'Select All',
    windowMenu: 'Window',
    close: 'Close Window',
    minimize: 'Minimize',
    zoom: 'Zoom',
    front: 'Bring All to Front'
  },
  'zh-Hans': {
    about: (appName) => `关于 ${appName}`,
    settings: '设置…',
    lock: (appName) => `锁定 ${appName}`,
    hide: (appName) => `隐藏 ${appName}`,
    hideOthers: '隐藏其他应用',
    unhide: '全部显示',
    quit: (appName) => `退出 ${appName}`,
    editMenu: '编辑',
    undo: '撤销',
    redo: '重做',
    cut: '剪切',
    copy: '复制',
    paste: '粘贴',
    selectAll: '全选',
    windowMenu: '窗口',
    close: '关闭窗口',
    minimize: '最小化',
    zoom: '缩放',
    front: '前置所有窗口'
  },
  'zh-Hant': {
    about: (appName) => `關於 ${appName}`,
    settings: '設定…',
    lock: (appName) => `鎖定 ${appName}`,
    hide: (appName) => `隱藏 ${appName}`,
    hideOthers: '隱藏其他應用程式',
    unhide: '全部顯示',
    quit: (appName) => `結束 ${appName}`,
    editMenu: '編輯',
    undo: '復原',
    redo: '重做',
    cut: '剪下',
    copy: '複製',
    paste: '貼上',
    selectAll: '全選',
    windowMenu: '視窗',
    close: '關閉視窗',
    minimize: '最小化',
    zoom: '縮放',
    front: '將所有視窗移到最前方'
  }
};

export const resolveMacosMenuLanguage = (
  preferredLanguages: readonly string[],
  fallbackLanguages: readonly string[] = []
): MacosMenuLanguage => {
  for (const preferredLanguage of [...preferredLanguages, ...fallbackLanguages]) {
    try {
      const locale = new Intl.Locale(preferredLanguage.replace(/_/g, '-'));

      if (locale.language === 'en') {
        return 'en';
      }

      if (locale.language !== 'zh') {
        continue;
      }

      if (locale.script === 'Hant' || ['TW', 'HK', 'MO'].includes(locale.region ?? '')) {
        return 'zh-Hant';
      }

      return 'zh-Hans';
    } catch {
      // A malformed system language tag must not prevent menu installation.
    }
  }

  return 'en';
};

export const createMacosApplicationMenuTemplate = (
  appName: string,
  {
    onOpenSettings,
    onLock,
    isWindowReady,
    isLockEnabled,
    preferredLanguages = []
  }: {
    onOpenSettings: () => void;
    onLock: () => void;
    isWindowReady: () => boolean;
    isLockEnabled: () => boolean;
    preferredLanguages?: readonly string[];
  }
): MenuItemConstructorOptions[] => {
  const labels = MACOS_MENU_LABELS[resolveMacosMenuLanguage(preferredLanguages)];

  return [
    {
      label: appName,
      submenu: [
        { role: 'about', label: labels.about(appName) },
        {
          id: 'mac-menu-settings',
          label: labels.settings,
          accelerator: 'Command+,',
          enabled: isWindowReady(),
          click: onOpenSettings
        },
        { type: 'separator' },
        {
          id: 'mac-menu-lock',
          label: labels.lock(appName),
          accelerator: LOCK_ACCELERATOR,
          enabled: isLockEnabled(),
          click: onLock
        },
        { type: 'separator' },
        { role: 'hide', label: labels.hide(appName) },
        { role: 'hideOthers', label: labels.hideOthers },
        { role: 'unhide', label: labels.unhide },
        { type: 'separator' },
        { role: 'quit', label: labels.quit(appName) }
      ]
    },
    {
      label: labels.editMenu,
      submenu: [
        { role: 'undo', label: labels.undo },
        { role: 'redo', label: labels.redo },
        { type: 'separator' },
        { role: 'cut', label: labels.cut },
        { role: 'copy', label: labels.copy },
        { role: 'paste', label: labels.paste },
        { role: 'selectAll', label: labels.selectAll }
      ]
    },
    {
      label: labels.windowMenu,
      submenu: [
        {
          id: 'mac-menu-close',
          role: 'close',
          label: labels.close,
          accelerator: 'CmdOrCtrl+W'
        },
        { type: 'separator' },
        { role: 'minimize', label: labels.minimize },
        { role: 'zoom', label: labels.zoom },
        { type: 'separator' },
        { role: 'front', label: labels.front }
      ]
    }
  ];
};

export const installMacosApplicationMenu = <TMenu>({
  platform,
  appName,
  menu,
  onOpenSettings,
  onLock,
  isWindowReady,
  isLockEnabled,
  getPreferredLanguages,
  getFallbackLanguages
}: {
  platform: NodeJS.Platform;
  appName: string;
  menu: ApplicationMenuAdapter<TMenu>;
  onOpenSettings: () => void;
  onLock: () => void;
  isWindowReady: () => boolean;
  isLockEnabled: () => boolean;
  getPreferredLanguages: () => readonly string[];
  getFallbackLanguages?: () => readonly string[];
}): MacosApplicationMenuController | null => {
  if (platform !== 'darwin') {
    return null;
  }

  const language = resolveMacosMenuLanguage(
    getPreferredLanguages(),
    getFallbackLanguages?.() ?? []
  );
  const applicationMenu = menu.buildFromTemplate(
    createMacosApplicationMenuTemplate(appName, {
      onOpenSettings,
      onLock,
      isWindowReady,
      isLockEnabled,
      preferredLanguages: [language]
    })
  );

  menu.setApplicationMenu(applicationMenu);

  const refresh = () => {
    const installedMenu = menu.getApplicationMenu() as TMenu & Partial<ApplicationMenuWithItems>;
    const settingsItem = installedMenu?.getMenuItemById?.('mac-menu-settings');
    const lockItem = installedMenu?.getMenuItemById?.('mac-menu-lock');

    if (settingsItem) {
      settingsItem.enabled = isWindowReady();
    }

    if (lockItem) {
      lockItem.enabled = isLockEnabled();
    }
  };

  refresh();
  return { refresh };
};
