import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateReleaseCheck,
  formatReleaseCheckReport,
  readReleaseCheckInput
} from './release-check-logic.mjs';

const scriptPath = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(scriptPath), '..');

const parseArgs = (args) => {
  const options = {
    strict: false
  };

  for (const arg of args) {
    if (arg === '--strict') {
      options.strict = true;
      continue;
    }

    if (arg === '--artifacts') {
      throw new Error('--artifacts is not implemented in this release check.');
    }

    throw new Error(`Unknown release check argument: ${arg}`);
  }

  return options;
};

try {
  const options = parseArgs(process.argv.slice(2));
  const input = readReleaseCheckInput({ rootDir });
  const report = evaluateReleaseCheck(input, options);

  process.stdout.write(formatReleaseCheckReport(report));
  process.exitCode = report.errors.length > 0 ? 1 : 0;
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
