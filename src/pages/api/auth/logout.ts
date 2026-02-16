import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ cookies }) => {
  cookies.delete('auth_token', { path: '/' });

  return new Response(null, {
    status: 302,
    headers: { Location: '/' },
  });
};
