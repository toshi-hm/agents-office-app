import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { createApiClient } from '../lib/api/http-client.ts';
import type { OfficeNotification } from '../lib/api/notifications.ts';
import { createOfficeStore } from '../lib/api/office-store.ts';
import type { TauriBridge } from '../lib/tauri/types.ts';

/** One API client and live store for the lifetime of the window. */
export function useOffice(
  bridge: TauriBridge,
  onNotify: (notification: OfficeNotification) => void,
) {
  const notify = useRef(onNotify);
  notify.current = onNotify;
  const [{ api, store }] = useState(() => {
    const client = createApiClient(() => bridge.getBackendConfig());
    return {
      api: client,
      store: createOfficeStore({
        api: client,
        onNotify: (notification) => notify.current(notification),
      }),
    };
  });
  useEffect(() => {
    store.start();
    return () => store.stop();
  }, [store]);
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  return { api, store, state };
}
