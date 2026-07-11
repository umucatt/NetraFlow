export const assertLinuxX64BuildHost = ({
  platform = process.platform,
  arch = process.arch,
  uid = typeof process.getuid === 'function' ? process.getuid() : undefined
} = {}) => {
  if (platform !== 'linux') {
    throw new Error('Linux AppImage packaging must run on a Linux x64 host.');
  }

  if (arch !== 'x64') {
    throw new Error(`Linux AppImage packaging requires x64; received ${arch}.`);
  }

  if (uid === 0) {
    throw new Error('Linux AppImage packaging must run as a regular user, not root.');
  }
};

export const getAppImageArtifactName = ({ productName, version }) =>
  `${productName}_${version}_x86_64.AppImage`;
