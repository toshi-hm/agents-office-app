export function isAuthorized(request: Request, url: URL, token: string) {
  const authorization = request.headers.get('Authorization');
  const eventToken = request.method === 'GET' && url.pathname === '/api/events' ? url.searchParams.get('token') : null;
  return authorization === 'Bearer ' + token || eventToken === token;
}
