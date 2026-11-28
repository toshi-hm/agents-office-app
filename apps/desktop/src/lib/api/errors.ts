export class ApiError extends Error {
  constructor(
    message: string,
    /** HTTP status, or 0 when the backend could not be reached. */
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** The message shown to the user for a failed response. */
export function formatApiError(status: number, detail: string): string {
  const base =
    status === 401
      ? 'バックエンドの認証に失敗しました'
      : status === 404
        ? '対象が見つかりません'
        : status === 409
          ? '現在の状態では実行できません（作業中の可能性があります）'
          : status === 400
            ? '入力内容を確認してください'
            : `バックエンドでエラーが発生しました (${status})`;
  return detail ? `${base}: ${detail}` : base;
}
