export interface JWTPayload {
  userId: number;
  email: string;
  name: string | null;
  exp: number;
}

export async function createJWT(payload: Omit<JWTPayload, 'exp'>, secret: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7; // 7 days
  const body = btoa(JSON.stringify({ ...payload, exp }));
  const data = `${header}.${body}`;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const signature = btoa(String.fromCharCode(...new Uint8Array(sig)));

  return `${data}.${signature}`;
}

export async function verifyJWT(token: string, secret: string): Promise<JWTPayload | null> {
  try {
    const [header, body, signature] = token.split('.');
    const data = `${header}.${body}`;

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(data));

    if (!valid) return null;

    const payload: JWTPayload = JSON.parse(atob(body));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export function getUserFromCookie(cookies: any, secret: string): Promise<JWTPayload | null> {
  const token = cookies.get('auth_token')?.value;
  if (!token) return Promise.resolve(null);
  return verifyJWT(token, secret);
}
