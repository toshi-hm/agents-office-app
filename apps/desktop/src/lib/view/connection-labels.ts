import type { ConnectionState } from '../api/store-state.ts';

export const CONNECTION_LABELS: Readonly<Record<ConnectionState, string>> = {
  connecting: '接続中…',
  live: 'ライブ',
  reconnecting: '再接続中…',
  offline: 'オフライン',
};
