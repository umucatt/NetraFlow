import { spawn } from 'node:child_process';

const DEV_PORT = 5174;
const children = new Set();
let rendererReady = false;
let shuttingDown = false;
let exitTimer = null;
let electronProcess = null;
let rendererOutputBuffer = '';

const stripAnsi = (text) =>
  text
    .replace(/\u001b\[[0-9;?]*[ -/]*[@-~]/g, '')
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, '');

const getExitCode = (code, signal) => {
  if (typeof code === 'number') {
    return code;
  }

  return signal ? 1 : 0;
};

const killProcessTree = (child) => {
  if (!child || child.killed) {
    return;
  }

  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], {
      stdio: 'ignore'
    });
    return;
  }

  child.kill('SIGTERM');
};

const stopChildren = (except = null) => {
  for (const child of children) {
    if (child !== except) {
      killProcessTree(child);
    }
  }
};

const finish = (exitCode, except = null) => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  process.exitCode = exitCode;
  stopChildren(except);
  exitTimer = setTimeout(() => process.exit(exitCode), 1000);
};

const spawnNpmScript = (scriptName) => {
  const command = process.platform === 'win32' ? 'cmd.exe' : 'npm';
  const args =
    process.platform === 'win32'
      ? ['/d', '/s', '/c', `npm run ${scriptName}`]
      : ['run', scriptName];
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe']
  });

  children.add(child);
  child.once('exit', () => {
    children.delete(child);

    if (children.size === 0 && exitTimer) {
      clearTimeout(exitTimer);
      process.exit(process.exitCode ?? 0);
    }
  });

  return child;
};

const startElectron = () => {
  if (electronProcess || shuttingDown) {
    return;
  }

  electronProcess = spawnNpmScript('dev:electron');
  electronProcess.stdout.on('data', (chunk) => process.stdout.write(chunk));
  electronProcess.stderr.on('data', (chunk) => process.stderr.write(chunk));
  electronProcess.once('exit', (code, signal) => {
    finish(getExitCode(code, signal), electronProcess);
  });
};

const rendererProcess = spawnNpmScript('dev:renderer');

rendererProcess.stdout.on('data', (chunk) => {
  const text = chunk.toString();

  process.stdout.write(chunk);
  rendererOutputBuffer = stripAnsi(`${rendererOutputBuffer}${text}`).slice(-2000);

  if (rendererOutputBuffer.includes(`http://localhost:${DEV_PORT}/`)) {
    rendererReady = true;
    startElectron();
  }
});

rendererProcess.stderr.on('data', (chunk) => process.stderr.write(chunk));
rendererProcess.once('exit', (code, signal) => {
  const exitCode = getExitCode(code, signal);

  if (!rendererReady || exitCode !== 0) {
    finish(exitCode || 1, rendererProcess);
    return;
  }

  finish(0, rendererProcess);
});

process.once('SIGINT', () => finish(130));
process.once('SIGTERM', () => finish(143));
