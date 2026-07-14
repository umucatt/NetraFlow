export const APPIMAGE_PACKAGE_KIND = 'appimage';
export const SANDBOX_BOOTSTRAP_ARGUMENT = '--nf-sandbox-consent-bootstrap';

export const isLinuxAppImageRuntime = () =>
  process.platform === 'linux' &&
  process.env.NF_PACKAGE_KIND === APPIMAGE_PACKAGE_KIND;

export const isSandboxConsentBootstrap = () =>
  isLinuxAppImageRuntime() &&
  (process.argv.includes(SANDBOX_BOOTSTRAP_ARGUMENT) ||
    (process.argv.includes('--no-sandbox') &&
      process.env.NF_UNSANDBOXED_AUTHORIZED !== '1')) &&
  process.env.NF_BOOTSTRAP_COMPLETE !== '1';

export const isUnsandboxedLinuxAppImageRuntime = () =>
  isLinuxAppImageRuntime() && process.argv.includes('--no-sandbox');
