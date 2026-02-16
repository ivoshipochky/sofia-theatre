import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';

export const GET: APIRoute = async ({ request, locals }) => {
  const db = getDB((locals as any).runtime);
  const url = new URL(request.url);
  const genre = url.searchParams.get('genre');
  const theatre = url.searchParams.get('theatre');
  const page = parseInt(url.searchParams.get('page') || '1');
  const perPage = 20;
  const offset = (page - 1) * perPage;

  let query = `
    SELECT s.*, t.name as theatre_name, t.slug as theatre_slug,
      COALESCE((SELECT ROUND(AVG(score), 1) FROM ratings WHERE show_id = s.id), 0) as avg_rating,
      COALESCE((SELECT COUNT(*) FROM ratings WHERE show_id = s.id), 0) as rating_count
    FROM shows s
    JOIN theatres t ON t.id = s.theatre_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (genre) {
    query += ` AND s.genre = ?`;
    params.push(genre);
  }
  if (theatre) {
    query += ` AND t.slug = ?`;
    params.push(theatre);
  }

  query += ` ORDER BY s.updated_at DESC LIMIT ? OFFSET ?`;
  params.push(perPage, offset);

  const results = await db.prepare(query).bind(...params).all();

  return new Response(JSON.stringify(results.results), {
    headers: { 'Content-Type': 'application/json' },
  });
};
