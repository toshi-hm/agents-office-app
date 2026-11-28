import { timingSafeEqual } from 'node:crypto';

const tokensMatch = (candidate: string | null, expected: string): boolean => {
  if (candidate === null) return false;
  const left = Buffer.from(candidate, 'utf8');
  const right = Buffer.from(expected, 'utf8');
  return left.length === right.length && timingSafeEqual(left, right);
};

export const isAuthorized = (request: Request, url: URL, token: string): boolean => {
  const authorization = request.headers.get('Authorization');
  const bearer = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;
  const eventToken =
    request.method === 'GET' && url.pathname === '/api/events' ? url.searchParams.get('token') : null;
  return tokensMatch(bearer, token) || tokensMatch(eventToken, token);
};
