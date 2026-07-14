import { execFileSync } from 'node:child_process';

const expected = process.argv[2];
const githubSha = process.env.GITHUB_SHA;
const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
if (!/^[0-9a-f]{40}$/i.test(expected ?? '') || head !== expected || githubSha !== expected) {
  throw new Error(`Checkout identity mismatch: HEAD=${head}, github.sha=${githubSha}, prepare=${expected}.`);
}
console.log(`Verified checkout commit ${head}.`);
