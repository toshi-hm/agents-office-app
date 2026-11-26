import type { JsonResponse } from './types.ts';

export function health(json: JsonResponse) {
  return json({ ok: true, version: '0.1.0', pid: process.pid });
}
