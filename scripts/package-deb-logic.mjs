import path from 'node:path';

export const DEB_PACKAGE = 'netraflow';
export const DEB_ARCHITECTURE = 'amd64';
export const DEB_MAINTAINER = 'umucatt <62979687+umucatt@users.noreply.github.com>';
export const DEB_HOMEPAGE = 'https://github.com/umucatt/NetraFlow';
export const DEB_DESCRIPTION = 'A focused desktop application for tracking asset changes.';
export const DEB_DEPENDS = [
  'libgtk-3-0t64',
  'libnotify4',
  'libnss3',
  'libxss1',
  'libxtst6',
  'xdg-utils',
  'libatspi2.0-0t64',
  'libuuid1',
  'libsecret-1-0'
];
export const DEB_EXECUTABLE_PATH = '/opt/NetraFlow/netraflow';
export const DEB_APPARMOR_PATH = '/etc/apparmor.d/opt.NetraFlow.netraflow';
export const DEB_APPARMOR_LOCAL_PATH = '/etc/apparmor.d/local/opt.NetraFlow.netraflow';
export const DEB_DESKTOP_PATH = '/usr/share/applications/netraflow.desktop';

export const DEB_DESKTOP_ENTRY = `[Desktop Entry]
Name=NetraFlow
Exec=/opt/NetraFlow/netraflow %U
Terminal=false
Type=Application
Icon=netraflow
Categories=Utility;
StartupWMClass=NetraFlow
`;

export const assertDebBuildHost = ({
  platform = process.platform,
  arch = process.arch,
  uid = typeof process.getuid === 'function' ? process.getuid() : undefined,
  nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10)
} = {}) => {
  if (platform !== 'linux' || arch !== 'x64') {
    throw new Error('Linux DEB packaging must run on a Linux x64 host.');
  }
  if (uid === 0) throw new Error('Linux DEB packaging must run as a regular user, not root.');
  if (!Number.isInteger(nodeMajor) || nodeMajor < 22) {
    throw new Error(`Linux DEB packaging requires Node.js 22 or newer; received ${nodeMajor}.`);
  }
};

export const getDebArtifactName = ({ productName, version }) =>
  `${productName}_${version}_${DEB_ARCHITECTURE}.deb`;

export const createDebControl = ({ version, installedSizeKiB }) => `Package: ${DEB_PACKAGE}
Version: ${version}
Section: utils
Priority: optional
Architecture: ${DEB_ARCHITECTURE}
Maintainer: ${DEB_MAINTAINER}
Homepage: ${DEB_HOMEPAGE}
Installed-Size: ${installedSizeKiB}
Depends: ${DEB_DEPENDS.join(', ')}
Description: ${DEB_DESCRIPTION}
`;

export const toStagePath = (stageRoot, absolutePackagePath) => {
  if (!path.posix.isAbsolute(absolutePackagePath)) {
    throw new Error(`Package path must be absolute: ${absolutePackagePath}`);
  }
  return path.join(stageRoot, ...absolutePackagePath.split('/').filter(Boolean));
};
