const allowedOrigin = /^(?:http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?|tauri:\/\/localhost|http:\/\/tauri\.localhost)$/;

export function applyCorsHeaders(request: Request) {
  const headers = new Headers({ Vary: 'Origin' });
  const origin = request.headers.get('Origin');
  if (origin && allowedOrigin.test(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  }
  return headers;
}
