/** Tauri command errors arrive as plain strings. */
export function describeError(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  return '不明なエラーが発生しました';
}
