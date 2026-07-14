import { createSearchWorkerRuntime } from './searchWorkerRuntime';

type WorkerScope = {
  onmessage: ((event: MessageEvent<unknown>) => void) | null;
  postMessage: (message: unknown) => void;
  close: () => void;
};

const workerScope = self as unknown as WorkerScope;
const runtime = createSearchWorkerRuntime<number>({
  postMessage: (response) => workerScope.postMessage(response),
  setTimer: (callback) => globalThis.setTimeout(callback, 0) as unknown as number,
  clearTimer: (timer) => globalThis.clearTimeout(timer),
  onDispose: () => workerScope.close()
});

workerScope.onmessage = (event) => runtime.handleMessage(event.data);
