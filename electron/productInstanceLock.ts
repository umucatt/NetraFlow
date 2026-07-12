import net from 'node:net';
import { lstat, unlink } from 'node:fs/promises';

export const PRODUCT_INSTANCE_PIPE_PATH =
  '\\\\.\\pipe\\netraflow-com-netraflow-app-single-instance';
const PRODUCT_INSTANCE_SOCKET_DIRECTORY = '/tmp';
const PRODUCT_INSTANCE_SOCKET_FILE_PREFIX = 'netraflow-';
const PRODUCT_INSTANCE_SOCKET_FILE_SUFFIX = '.sock';
const PRODUCT_INSTANCE_MESSAGE = 'activate';
const PRODUCT_INSTANCE_ACTIVE_RESPONSE = 'state:active';
const PRODUCT_INSTANCE_RESETTING_RESPONSE = 'state:resetting';
const RESETTING_WAIT_TIMEOUT_MS = 15_000;

export type ProductInstanceState = 'active' | 'resetting';

export type InstanceLockPathOptions = {
  platform?: NodeJS.Platform;
  getuid?: () => number | undefined;
};

const getPosixUserId = (getuid: (() => number | undefined) | undefined) => {
  if (!getuid) {
    throw new Error('Cannot determine the current POSIX user ID for the NetraFlow instance lock.');
  }

  const uid = getuid();

  if (typeof uid !== 'number' || !Number.isSafeInteger(uid) || uid < 0) {
    throw new Error('Cannot determine a valid POSIX user ID for the NetraFlow instance lock.');
  }

  return uid;
};

export const getInstanceLockPath = ({
  platform = process.platform,
  getuid = process.getuid
}: InstanceLockPathOptions = {}) =>
  platform === 'win32'
    ? PRODUCT_INSTANCE_PIPE_PATH
    : `${PRODUCT_INSTANCE_SOCKET_DIRECTORY}/${PRODUCT_INSTANCE_SOCKET_FILE_PREFIX}${getPosixUserId(
        getuid
      )}${PRODUCT_INSTANCE_SOCKET_FILE_SUFFIX}`;

export type ProductInstanceCoordinatorOptions = {
  pipePath?: string;
  expectedSocketPath?: string;
  platform?: NodeJS.Platform;
  getuid?: () => number | undefined;
  onActivate?: () => void;
  getState?: () => ProductInstanceState;
  onResettingWaiter?: () => void;
  logger?: Pick<Console, 'error'>;
};

export type ProductInstanceCoordinator = {
  acquire: () => Promise<boolean>;
  notifyExisting: () => Promise<void>;
  release: () => Promise<void>;
};

export const createProductInstanceCoordinator = ({
  pipePath = getInstanceLockPath(),
  expectedSocketPath = getInstanceLockPath(),
  platform = process.platform,
  getuid = process.getuid,
  onActivate,
  getState = () => 'active',
  onResettingWaiter,
  logger = console
}: ProductInstanceCoordinatorOptions = {}): ProductInstanceCoordinator => {
  let server: net.Server | null = null;
  let ownsSocket = false;
  const connectedSockets = new Set<net.Socket>();

  const connectToExisting = () =>
    new Promise<{
      connected: boolean;
      state?: ProductInstanceState;
      code?: string;
      released?: Promise<void>;
    }>((resolve) => {
      const socket = net.createConnection(pipePath);
      let settled = false;
      let response = '';
      let didConnect = false;

      const finish = (result: {
        connected: boolean;
        state?: ProductInstanceState;
        code?: string;
        released?: Promise<void>;
      }) => {
        if (settled) {
          return;
        }

        settled = true;
        resolve(result);
      };

      socket.setTimeout(1000);
      socket.once('connect', () => {
        didConnect = true;
        socket.write(`${PRODUCT_INSTANCE_MESSAGE}\n`);
      });
      socket.on('data', (chunk) => {
        response += String(chunk);
        if (!response.includes('\n')) return;
        const state = response.includes(PRODUCT_INSTANCE_RESETTING_RESPONSE)
          ? 'resetting'
          : 'active';
        if (state === 'active') {
          socket.end();
          finish({ connected: true, state });
          return;
        }
        const released = new Promise<void>((release) => socket.once('close', () => release()));
        finish({ connected: true, state, released });
      });
      socket.once('error', (error: NodeJS.ErrnoException) =>
        finish({ connected: false, code: error.code })
      );
      socket.once('timeout', () => {
        socket.destroy();
        finish({ connected: false, code: 'ETIMEDOUT' });
      });
      socket.once('close', () => finish({
        connected: false,
        ...(didConnect ? { code: 'ERESETRELEASED' } : {})
      }));
    });

  const notifyExisting = async () => {
    await connectToExisting();
  };

  const removeVerifiedStaleSocket = async () => {
    if (platform === 'win32' || pipePath !== expectedSocketPath) return false;
    const uid = getPosixUserId(getuid);

    try {
      const status = await lstat(pipePath);
      if (!status.isSocket() || status.isSymbolicLink() || status.uid !== uid) return false;
      await unlink(pipePath);
      return true;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === 'ENOENT';
    }
  };

  const endpointDisappeared = async () => {
    if (platform === 'win32') return true;
    try {
      await lstat(pipePath);
      return false;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === 'ENOENT';
    }
  };

  const listen = () =>
    new Promise<{ listening: boolean; code?: string }>((resolve) => {
      const nextServer = net.createServer((socket) => {
        connectedSockets.add(socket);
        socket.once('close', () => connectedSockets.delete(socket));
        socket.setEncoding('utf8');
        let handled = false;
        socket.on('data', (message) => {
          if (!handled && message.includes(PRODUCT_INSTANCE_MESSAGE)) {
            handled = true;
            const state = getState();
            socket.write(`${state === 'resetting' ? PRODUCT_INSTANCE_RESETTING_RESPONSE : PRODUCT_INSTANCE_ACTIVE_RESPONSE}\n`);
            if (state === 'active') socket.end();
            if (state === 'resetting') onResettingWaiter?.();
            if (state === 'active') {
            onActivate?.();
            }
          }
        });
        socket.resume();
      });

      nextServer.once('error', (error: NodeJS.ErrnoException) => {
        try {
          nextServer.close();
        } catch {
          // The server may fail before entering the listening state.
        }

        resolve({ listening: false, code: error.code });
      });

      nextServer.listen(pipePath, () => {
        server = nextServer;
        ownsSocket = platform !== 'win32';
        resolve({ listening: true });
      });
    });

  const takeOverAfterRelease = async () => {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const takeover = await listen();
      if (takeover.listening) return true;
      if (takeover.code !== 'EADDRINUSE') {
        logger.error('[NetraFlow single-instance] Failed to take over after reset.', {
          code: takeover.code
        });
        return false;
      }
      const winner = await connectToExisting();
      if (winner.connected) return false;
      if (winner.code !== 'ECONNREFUSED' && winner.code !== 'ENOENT' && winner.code !== undefined) {
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(5 + attempt * 2, 25)));
    }
    logger.error('[NetraFlow single-instance] Timed out taking over after reset.');
    return false;
  };

  const acquire = async () => {
    const initial = await listen();
    if (initial.listening) return true;
    if (initial.code !== 'EADDRINUSE') {
      logger.error('[NetraFlow single-instance] Failed to acquire product instance lock.', {
        code: initial.code
      });
      return false;
    }

    const existing = await connectToExisting();
    if (existing.connected && existing.state === 'active') return false;
    if (existing.connected && existing.state === 'resetting' && existing.released) {
      const released = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), RESETTING_WAIT_TIMEOUT_MS);
        existing.released?.then(() => {
          clearTimeout(timeout);
          resolve(true);
        });
      });
      if (!released) return false;
      return takeOverAfterRelease();
    }
    if (
      !existing.connected &&
      (existing.code === 'ERESETRELEASED' ||
        (existing.code === 'ENOENT' && await endpointDisappeared()))
    ) {
      return takeOverAfterRelease();
    }
    if (existing.code !== 'ECONNREFUSED' || !(await removeVerifiedStaleSocket())) return false;

    const recovered = await listen();
    if (recovered.listening) return true;
    if (recovered.code === 'EADDRINUSE') {
      await connectToExisting();
      return false;
    }
    logger.error('[NetraFlow single-instance] Failed to recover product instance lock.', {
      code: recovered.code
    });
    return false;
  };

  const release = () =>
    new Promise<void>((resolve) => {
      const currentServer = server;
      server = null;

      if (!currentServer) {
        resolve();
        return;
      }

      connectedSockets.forEach((socket) => socket.destroy());

      currentServer.close(async () => {
        if (ownsSocket && platform !== 'win32' && pipePath === expectedSocketPath) {
          ownsSocket = false;
          try {
            await unlink(pipePath);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
              logger.error('[NetraFlow single-instance] Failed to clean instance socket.', {
                code: (error as NodeJS.ErrnoException).code
              });
            }
          }
        }
        resolve();
      });
    });

  return {
    acquire,
    notifyExisting,
    release
  };
};
