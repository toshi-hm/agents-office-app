export const now = () => new Date().toISOString();

export class OfficeError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}
