import { useCallback } from 'react';
import type { OfficeNotification } from '../lib/api/notifications.ts';
import type { TauriBridge } from '../lib/tauri/types.ts';
import type { PushToast } from './useToasts.ts';

/** Shows an office notification both in the window and through the operating system. */
export function useNotifications(bridge: TauriBridge, push: PushToast) {
  return useCallback(
    (notification: OfficeNotification) => {
      push({
        tone: notification.kind === 'approval' ? 'warning' : 'info',
        title: notification.title,
        body: notification.body,
        agentId: notification.agentId,
      });
      bridge
        .sendNativeNotification(notification.title, notification.body)
        .catch((error: unknown) => console.error('[notification]', error));
    },
    [bridge, push],
  );
}
