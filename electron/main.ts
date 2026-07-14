import { isSandboxConsentBootstrap, isLinuxAppImageRuntime } from './linuxAppImageRuntime.js';
import { writeSync } from 'node:fs';

const notifyLauncherReady = () => {
  if (!isLinuxAppImageRuntime()) {
    return;
  }

  const rawDescriptor = process.env.NF_LAUNCHER_READY_FD;
  const descriptor = rawDescriptor ? Number.parseInt(rawDescriptor, 10) : Number.NaN;

  if (!Number.isSafeInteger(descriptor) || descriptor < 3) {
    return;
  }

  try {
    writeSync(descriptor, 'R');
  } catch {
    // The launcher may already have exited; startup must continue normally.
  }
};

notifyLauncherReady();

if (isSandboxConsentBootstrap()) {
  await import('./sandboxBootstrapMain.js');
} else {
  await import('./mainApplication.js');
}
