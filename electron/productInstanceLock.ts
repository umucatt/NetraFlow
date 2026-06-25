import net from 'node:net';

export const PRODUCT_INSTANCE_PIPE_PATH =
  '\\\\.\\pipe\\netraflow-com-netraflow-app-single-instance';
const PRODUCT_INSTANCE_MESSAGE = 'activate';

export type ProductInstanceCoordinatorOptions = {
  pipePath?: string;
  onActivate?: () => void;
  logger?: Pick<Console, 'error'>;
};

export type ProductInstanceCoordinator = {
  acquire: () => Promise<boolean>;
  notifyExisting: () => Promise<void>;
  release: () => Promise<void>;
};

export const createProductInstanceCoordinator = ({
  pipePath = PRODUCT_INSTANCE_PIPE_PATH,
  onActivate,
  logger = console
}: ProductInstanceCoordinatorOptions = {}): ProductInstanceCoordinator => {
  let server: net.Server | null = null;

  const notifyExisting = () =>
    new Promise<void>((resolve) => {
      const socket = net.createConnection(pipePath);
      let settled = false;

      const finish = () => {
        if (settled) {
          return;
        }

        settled = true;
        resolve();
      };

      socket.setTimeout(1000);
      socket.once('connect', () => {
        socket.end(`${PRODUCT_INSTANCE_MESSAGE}\n`);
      });
      socket.once('error', finish);
      socket.once('timeout', () => {
        socket.destroy();
        finish();
      });
      socket.once('close', finish);
    });

  const acquire = () =>
    new Promise<boolean>((resolve) => {
      const nextServer = net.createServer((socket) => {
        socket.setEncoding('utf8');
        socket.on('data', (message) => {
          if (message.includes(PRODUCT_INSTANCE_MESSAGE)) {
            onActivate?.();
          }
        });
        socket.on('end', () => {
          onActivate?.();
        });
        socket.resume();
      });

      nextServer.once('error', (error: NodeJS.ErrnoException) => {
        try {
          nextServer.close();
        } catch {
          // The server may fail before entering the listening state.
        }

        if (error.code === 'EADDRINUSE') {
          void notifyExisting().finally(() => resolve(false));
          return;
        }

        logger.error('[NetraFlow single-instance] Failed to acquire product instance lock.', {
          code: error.code
        });
        resolve(false);
      });

      nextServer.listen(pipePath, () => {
        server = nextServer;
        resolve(true);
      });
    });

  const release = () =>
    new Promise<void>((resolve) => {
      const currentServer = server;
      server = null;

      if (!currentServer) {
        resolve();
        return;
      }

      currentServer.close(() => resolve());
    });

  return {
    acquire,
    notifyExisting,
    release
  };
};
