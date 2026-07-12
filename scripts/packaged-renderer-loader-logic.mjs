import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

const hasAppGetAppPath = (source) => /app\s*\.\s*getAppPath\s*\(/.test(source);

const hasLoadFile = (source) => /\bloadFile\s*\(/.test(source);

const hasPackagedGuard = (source) => /app\s*\.\s*isPackaged/.test(source);

const hasDevServerGuard = (source) =>
  /!\s*app\s*\.\s*isPackaged\s*&&\s*devServerUrl/.test(source);

const hasUngatedDevServerFallback = (source) => /\bif\s*\(\s*devServerUrl\s*\)/.test(source);

const forbiddenExpandedAppPatterns = [
  /process\s*\.\s*resourcesPath[\s\S]{0,240}['"`]app['"`][\s\S]{0,240}['"`]dist['"`][\s\S]{0,240}['"`]index\.html['"`]/,
  /resources[\\/]+app[\\/]+dist[\\/]+index\.html/i
];

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const pathJoinRendererPatternFor = (rootExpression) =>
  new RegExp(
    `path\\s*\\.\\s*join\\s*\\(\\s*${rootExpression}\\s*,\\s*['"\`]dist['"\`]\\s*,\\s*['"\`]index\\.html['"\`]\\s*\\)`
  );

const appGetAppPathExpression = 'app\\s*\\.\\s*getAppPath\\s*\\(\\s*\\)';

const getAppRootVariableNames = (source) =>
  [...source.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*app\s*\.\s*getAppPath\s*\(\s*\)/g)]
    .map((match) => match[1])
    .filter(Boolean);

const hasAsarRendererPath = (source) => {
  if (pathJoinRendererPatternFor(appGetAppPathExpression).test(source)) {
    return true;
  }

  return getAppRootVariableNames(source).some((variableName) =>
    pathJoinRendererPatternFor(escapeRegExp(variableName)).test(source)
  );
};

export const validatePackagedRendererLoader = (source) => {
  const errors = [];

  if (!hasPackagedGuard(source)) {
    errors.push('missing app.isPackaged packaged-mode guard');
  }

  if (!hasAppGetAppPath(source)) {
    errors.push('missing app.getAppPath() ASAR app root lookup');
  }

  if (!hasLoadFile(source)) {
    errors.push('missing BrowserWindow.loadFile renderer load');
  }

  if (!hasAsarRendererPath(source)) {
    errors.push('missing app.getAppPath() dist/index.html renderer target');
  }

  if (!hasDevServerGuard(source)) {
    errors.push('missing !app.isPackaged && devServerUrl development-server guard');
  }

  if (hasUngatedDevServerFallback(source)) {
    errors.push('packaged builds must not fall back to VITE_DEV_SERVER_URL');
  }

  if (forbiddenExpandedAppPatterns.some((pattern) => pattern.test(source))) {
    errors.push('packaged renderer must not use expanded resources/app/dist/index.html');
  }

  return errors;
};

export const assertPackagedRendererLoader = (mainPath) => {
  const mainSource = readFileSync(mainPath, 'utf8');
  const applicationPath = path.join(path.dirname(mainPath), 'mainApplication.js');
  const usesControlledDispatcher = /import\(\s*['"]\.\/mainApplication\.js['"]\s*\)/.test(mainSource);
  const loaderSource = usesControlledDispatcher && existsSync(applicationPath)
    ? readFileSync(applicationPath, 'utf8')
    : mainSource;
  const errors = validatePackagedRendererLoader(loaderSource);

  if (existsSync(applicationPath) && !usesControlledDispatcher) {
    errors.push('main dispatcher does not load mainApplication.js');
  }

  if (errors.length > 0) {
    throw new Error(
      `Electron main build has invalid packaged renderer loader:\n${errors
        .map((error) => `- ${error}`)
        .join('\n')}`
    );
  }
};
