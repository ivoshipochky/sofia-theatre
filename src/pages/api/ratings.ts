import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';
import { getUserFromCookie } from '../../lib/auth';

export const GET: APIRoute = async ({ request, locals }) => {
  const db = getDB((locals as any).runtime);
  const url = new URL(request.url);
  const showId = url.searchParams.get('show_id');

  if (!showId) {
    return new Response(JSON.stringify({ error: 'show_id is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const ratings = await db.prepare(`
    SELECT r.*, u.name as user_name, u.avatar_url as user_avatar
    FROM ratings r
    JOIN users u ON u.id = r.user_id
    WHERE r.show_id = ?
    ORDER BY r.created_at DESC
  `).bind(parseInt(showId)).all();

  return new Response(JSON.stringify(ratings.results), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request, cookies, locals }) => {
  const runtime = (locals as any).runtime;
  const db = getDB(runtime);
  const secret = runtime.env.JWT_SECRET;

  const user = await getUserFromCookie(cookies, secret);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Трябва да влезете в профила си.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const body = await request.json();
  const { show_id, score, review } = body;

  if (!show_id || !score || score < 1 || score > 5) {
    return new Response(JSON.stringify({ error: 'Invalid rating data' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  await db.prepare(`
    INSERT INTO ratings (user_id, show_id, score, review)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (user_id, show_id)
    DO UPDATE SET score = ?, review = ?, created_at = datetime('now')
  `).bind(user.userId, show_id, score, review || null, score, review || null).run();

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
