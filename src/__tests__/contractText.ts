/// <reference types="node" />

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export function normalizeNewlines(value: string): string {
  return value.replace(/\r\n?/g, '\n');
}

export const projectRootPath = fileURLToPath(new URL('../../../', import.meta.url));

export const readProjectFile = (path: string) =>
  normalizeNewlines(readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8'));

export const readHeadProjectFile = (path: string) =>
  normalizeNewlines(
    execFileSync('git', ['show', `HEAD:${path}`], {
      cwd: projectRootPath,
      encoding: 'utf8'
    })
  );
