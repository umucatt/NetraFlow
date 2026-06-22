import path from 'node:path';

import type { PersistenceDocumentKind } from './persistenceContracts.js';

export type PersistencePaths = {
  root: string;
  core: string;
  coreTmp: string;
  settings: string;
  settingsTmp: string;
  state: string;
  stateTmp: string;
  security: string;
  securityTmp: string;
};

export type PersistenceEnvironment = 'real' | 'demo';

const USERDATA_DIR_NAME = 'userdata';
const DEMO_DIR_NAME = '.demo';

export const resolveRealPersistenceRoot = (execPath = process.execPath) =>
  path.join(path.dirname(execPath), USERDATA_DIR_NAME);

export const resolveDemoPersistenceRoot = (execPath = process.execPath) =>
  path.join(path.dirname(execPath), DEMO_DIR_NAME);

export const resolvePersistenceRoot = (
  environment: PersistenceEnvironment,
  execPath = process.execPath
) =>
  environment === 'demo'
    ? resolveDemoPersistenceRoot(execPath)
    : resolveRealPersistenceRoot(execPath);

export const createPersistencePaths = (root = resolveRealPersistenceRoot()): PersistencePaths => {
  const resolvedRoot = path.resolve(root);

  return {
    root: resolvedRoot,
    core: path.join(resolvedRoot, 'core.json'),
    coreTmp: path.join(resolvedRoot, 'core.json.tmp'),
    settings: path.join(resolvedRoot, 'settings.json'),
    settingsTmp: path.join(resolvedRoot, 'settings.json.tmp'),
    state: path.join(resolvedRoot, 'state.json'),
    stateTmp: path.join(resolvedRoot, 'state.json.tmp'),
    security: path.join(resolvedRoot, 'security.json'),
    securityTmp: path.join(resolvedRoot, 'security.json.tmp')
  };
};

export const getPersistenceDocumentPath = (
  paths: PersistencePaths,
  kind: PersistenceDocumentKind
) => paths[kind];

export const getPersistenceDocumentTmpPath = (
  paths: PersistencePaths,
  kind: PersistenceDocumentKind
) => paths[`${kind}Tmp` as const];

export const getPersistenceTmpPaths = (paths: PersistencePaths) => [
  paths.coreTmp,
  paths.settingsTmp,
  paths.stateTmp,
  paths.securityTmp
];
