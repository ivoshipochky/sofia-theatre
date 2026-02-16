import type { APIRoute } from 'astro';
import { getUserFromCookie } from '../../../lib/auth';

export const GET: APIRoute = async ({ cookies, locals }) => {
  const runtime = (locals as any).runtime;
  const secret = runtime.env.JWT_SECRET;

  const user = await getUserFromCookie(cookies, secret);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ userId: user.userId, email: user.email, name: user.name }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
