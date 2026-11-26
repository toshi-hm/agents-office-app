/** Typed REST client for the Bun backend (docs/architecture/api-contract.md). */
import type { BackendConfig } from '../tauri/types.ts';
import { createEndpoints } from './endpoints.ts';
import { createTransport } from './transport.ts';
import type { FetchLike } from './transport.ts';

export function createApiClient(
  resolveConfig: () => Promise<BackendConfig>,
  fetchImpl: FetchLike = (url, init) => fetch(url, init),
) {
  const { config, resetConfig, request } = createTransport(resolveConfig, fetchImpl);

  return {
    /** Forget the resolved address and token (the backend may have restarted). */
    resetConfig,
    async eventsUrl(): Promise<string> {
      const { baseUrl, token } = await config();
      return `${baseUrl}/api/events${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    },
    ...createEndpoints(request),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
