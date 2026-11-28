import type { BackendConfig } from '../tauri/types.ts';
import { ApiError, formatApiError } from './errors.ts';

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type RequestFn = <T>(method: string, path: string, body?: unknown) => Promise<T>;

async function readErrorDetail(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: unknown; message?: unknown };
    const value = payload.error ?? payload.message;
    if (typeof value === 'string') return value;
  } catch {
    // Non-JSON error bodies carry nothing useful for the user.
  }
  return '';
}

/** Authenticated JSON requests with a cached, resettable backend address and token. */
export function createTransport(
  resolveConfig: () => Promise<BackendConfig>,
  fetchImpl: FetchLike,
) {
  let cached: Promise<BackendConfig> | null = null;
  const config = () => {
    cached ??= resolveConfig().catch((error: unknown) => {
      cached = null;
      throw error;
    });
    return cached;
  };
  const resetConfig = () => {
    cached = null;
  };

  const request: RequestFn = async <T>(method: string, path: string, body?: unknown) => {
    const { baseUrl, token } = await config();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        method,
        headers,
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      resetConfig();
      throw new ApiError('バックエンドに接続できません', 0);
    }
    if (!response.ok) {
      if (response.status === 401) resetConfig();
      const detail = await readErrorDetail(response);
      throw new ApiError(formatApiError(response.status, detail), response.status);
    }
    return (await response.json()) as T;
  };

  return { config, resetConfig, request };
}
