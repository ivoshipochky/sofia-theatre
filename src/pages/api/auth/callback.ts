import type { APIRoute } from 'astro';
import { getDB } from '../../../lib/db';
import { createJWT } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, cookies, locals }) => {
  const runtime = (locals as any).runtime;
  const db = getDB(runtime);
  const clientId = runtime.env.GOOGLE_CLIENT_ID;
  const clientSecret = runtime.env.GOOGLE_CLIENT_SECRET;
  const jwtSecret = runtime.env.JWT_SECRET;
  const siteUrl = runtime.env.SITE_URL || 'http://localhost:4321';

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const redirect = url.searchParams.get('state') || '/';

  if (!code) {
    return new Response('Missing code', { status: 400 });
  }

  // Exchange code for tokens
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${siteUrl}/api/auth/callback`,
      grant_type: 'authorization_code',
    }),
  });

  const tokenData = await tokenRes.json() as any;
  if (!tokenData.access_token) {
    return new Response('Token exchange failed', { status: 400 });
  }

  // Get user info
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = await userRes.json() as any;

  // Upsert user
  await db.prepare(`
    INSERT INTO users (email, name, avatar_url, provider)
    VALUES (?, ?, ?, 'google')
    ON CONFLICT (email) DO UPDATE SET name = ?, avatar_url = ?
  `).bind(userData.email, userData.name, userData.picture, userData.name, userData.picture).run();

  const user = await db.prepare('SELECT id, email, name FROM users WHERE email = ?')
    .bind(userData.email).first<{ id: number; email: string; name: string }>();

  if (!user) {
    return new Response('User creation failed', { status: 500 });
  }

  // Create JWT
  const token = await createJWT({ userId: user.id, email: user.email, name: user.name }, jwtSecret);

  cookies.set('auth_token', token, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return new Response(null, {
    status: 302,
    headers: { Location: redirect },
  });
};
