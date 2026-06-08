import { useCallback, useEffect, useState } from 'react';

import type { WindowFrameController } from './windowFrameTypes';

const getElectronWindowApi = (): ElectronWindowApi | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return (window.electronAPI ?? window.electronWindow) as ElectronWindowApi | undefined;
};

export function useWindowFrameController(): WindowFrameController {
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const api = getElectronWindowApi();

    if (!api?.isMaximized || !api?.onMaximizedChange) {
      return undefined;
    }

    let isMounted = true;

    void api
      .isMaximized()
      .then((maximized) => {
        if (isMounted) {
          setIsMaximized(maximized);
        }
      })
      .catch(() => undefined);

    const unsubscribe = api.onMaximizedChange((maximized) => {
      setIsMaximized(maximized);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const minimize = useCallback(() => {
    getElectronWindowApi()?.minimize();
  }, []);

  const toggleMaximize = useCallback(() => {
    getElectronWindowApi()?.toggleMaximize();
  }, []);

  const close = useCallback(() => {
    getElectronWindowApi()?.close();
  }, []);

  return {
    isMaximized,
    minimize,
    toggleMaximize,
    close
  };
}
