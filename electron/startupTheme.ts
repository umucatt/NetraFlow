export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';
export type ThemeStyle = 'default' | 'nyaa';

export type ThemeBootstrapSettings = {
  themeMode: ThemeMode;
  themeStyle: ThemeStyle;
  nyaaThemeUnlocked: boolean;
};

export type StartupThemeSnapshot = {
  resolvedTheme: ResolvedTheme;
  themeStyle: ThemeStyle;
  backgroundColor: string;
};

export const DEFAULT_THEME_MODE: ThemeMode = 'system';
export const DEFAULT_THEME_STYLE: ThemeStyle = 'default';

const THEME_BOOTSTRAP_BACKGROUND_COLORS: Record<
  ThemeStyle,
  Record<ResolvedTheme, string>
> = {
  default: {
    light: '#f6f3ea',
    dark: '#171a1f'
  },
  nyaa: {
    light: '#fff6fa',
    dark: '#18141b'
  }
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

const isThemeStyle = (value: unknown): value is ThemeStyle =>
  value === 'default' || value === 'nyaa';

export const normalizeThemeBootstrapSettings = (
  value: unknown
): ThemeBootstrapSettings => {
  if (!isPlainObject(value)) {
    return {
      themeMode: DEFAULT_THEME_MODE,
      themeStyle: DEFAULT_THEME_STYLE,
      nyaaThemeUnlocked: false
    };
  }

  const nyaaThemeUnlocked = value.nyaaThemeUnlocked === true;

  return {
    themeMode: isThemeMode(value.themeMode) ? value.themeMode : DEFAULT_THEME_MODE,
    themeStyle:
      nyaaThemeUnlocked && isThemeStyle(value.themeStyle)
        ? value.themeStyle
        : DEFAULT_THEME_STYLE,
    nyaaThemeUnlocked
  };
};

export const createStartupThemeSnapshot = (
  settings: ThemeBootstrapSettings,
  systemTheme: ResolvedTheme
): StartupThemeSnapshot => {
  const resolvedTheme = settings.themeMode === 'system' ? systemTheme : settings.themeMode;

  return {
    resolvedTheme,
    themeStyle: settings.themeStyle,
    backgroundColor: THEME_BOOTSTRAP_BACKGROUND_COLORS[settings.themeStyle][resolvedTheme]
  };
};
