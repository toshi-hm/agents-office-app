import type { RouteServices } from './types.ts';

export function streamEvents(
  headers: Headers, disableIdleTimeout: () => void, { sse, snapshot }: Pick<RouteServices, 'sse' | 'snapshot'>,
) {
  disableIdleTimeout();
  return sse.events(headers, snapshot);
}
