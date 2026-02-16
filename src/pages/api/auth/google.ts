import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime;
  const clientId = runtime.env.GOOGLE_CLIENT_ID;
  const siteUrl = runtime.env.SITE_URL || 'http://localhost:4321';

  const url = new URL(request.url);
  const redirect = url.searchParams.get('redirect') || '/';

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${siteUrl}/api/auth/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state: redirect,
    access_type: 'online',
    prompt: 'select_account',
  });

  return new Response(null, {
    status: 302,
    headers: { Location: `https://accounts.google.com/o/oauth2/v2/auth?${params}` },
  });
};
