import { cleanReleaseDirectory, releaseRootPath } from './release-utils.mjs';

cleanReleaseDirectory();
console.log(`Cleaned ${releaseRootPath}`);
