import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';

import { createExampleData, createExtremeExampleData } from '../src/exampleData.js';
import { createPersistenceStore } from './persistenceFileStore.js';
import { createDefaultPersistenceDocument } from './persistenceContracts.js';

const runElectronClearAll = async (fixture: 'normal' | 'extreme') => {
  const testRoot = mkdtempSync(path.join(tmpdir(), `netraflow-electron-e2e-${fixture}-`));
  const root = path.join(testRoot, 'NetraFlow');
  const userdata = path.join(root, 'userdata');
  const runtime = path.join(root, 'runtime');
  const diagnostics = path.join(testRoot, 'diagnostics.jsonl');
  const store = createPersistenceStore({ root: userdata });
  const generated = fixture === 'extreme' ? createExtremeExampleData() : createExampleData('advanced');
  const core = store.writeCoreDocument({ schemaVersion: 1, ...generated.appData }, {
    allowExternalCoreOverwrite: true
  });
  assert.equal(core.ok, true);
  const state = store.writeStateDocument({
    ...createDefaultPersistenceDocument('state'),
    firstWelcome: { completed: true, pendingAfterClearAll: false }
  });
  assert.equal(state.ok, true);
  const electron = path.join(process.cwd(), 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron');
  assert.equal(existsSync(electron), true, 'Electron binary must already be installed by the project');
  assert.equal(existsSync(path.join(process.cwd(), 'dist-electron', 'main.js')), true, 'npm run build must run before real Electron E2E');
  const child = spawn(electron, ['.', '--disable-gpu', '--no-sandbox'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NETRAFLOW_E2E_CLEAR_ALL: '1',
      NETRAFLOW_VALIDATION_DIAGNOSTICS_FILE: diagnostics,
      NETRAFLOW_PERSISTENCE_EXE_DIR: root,
      NETRAFLOW_USERDATA_ROOT: userdata,
      NETRAFLOW_RUNTIME_ROOT: runtime,
      NETRAFLOW_DEMO_ROOT: path.join(root, '.demo')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', (chunk) => { stderr += String(chunk); });
  const exitCode = await new Promise<number | null>((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`Electron E2E timed out: ${stderr}`));
    }, 30_000);
    child.once('error', reject);
    child.once('exit', (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });
  const events = existsSync(diagnostics)
    ? readFileSync(diagnostics, 'utf8').trim().split('\n').filter(Boolean).map((line) => JSON.parse(line) as Record<string, unknown>)
    : [];
  const names = events.map((entry) => entry.diagnosticEvent);
  const page = events.find((entry) => entry.diagnosticEvent === 'electron-clear-all-e2e-page');
  try {
    assert.equal(exitCode, 0, stderr);
    assert.ok(page, `real clearing page was not observed: ${stderr}`);
    assert.equal(page?.text, '正在清除全部数据');
    assert.equal(page?.hasAppShell, false);
    assert.equal(page?.hasSidebar, false);
    assert.equal(page?.hasDots, true);
    assert.equal(page?.dotsAnimation, 'destructive-clearing-dots');
    assert.ok(names.includes('userdata-delete-verified'));
    assert.ok(names.includes('clearing-window-destroyed'));
    assert.ok(names.indexOf('userdata-delete-verified') < names.indexOf('clearing-window-destroyed'));
    assert.equal(existsSync(userdata), false);
    assert.equal(existsSync(path.join(userdata, 'core.json')), false);
    if (fixture === 'extreme') assert.equal(generated.appData.history.length, 48_000);
  } finally {
    rmSync(testRoot, { recursive: true, force: true });
  }
};

test('real Electron settings clear-all flow removes normal initialized data', async (t) => {
  if (process.env.NETRAFLOW_RUN_ELECTRON_E2E !== '1') {
    t.skip('Run explicitly after npm run build with NETRAFLOW_RUN_ELECTRON_E2E=1');
    return;
  }
  await runElectronClearAll('normal');
});

test('real Electron settings clear-all flow remains responsive with 48,000 history rows', async (t) => {
  if (process.env.NETRAFLOW_RUN_ELECTRON_E2E !== '1') {
    t.skip('Run explicitly after npm run build with NETRAFLOW_RUN_ELECTRON_E2E=1');
    return;
  }
  await runElectronClearAll('extreme');
});
