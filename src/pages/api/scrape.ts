import type { APIRoute } from 'astro';
import { getDB } from '../../lib/db';

// Genre mapping: Bulgarian → normalized slug
const GENRE_MAP: Record<string, string> = {
  'драма': 'drama',
  'комедия': 'comedy',
  'мюзикъл': 'musical',
  'опера': 'opera',
  'балет': 'ballet',
  'детски': 'children',
  'визуален театър': 'experimental',
  'експериментален': 'experimental',
  'класика': 'classic',
  'съвременен': 'contemporary',
  'трагедия': 'drama',
  'трагикомедия': 'drama',
  'моноспектакъл': 'drama',
  'фарс': 'comedy',
};

function normalizeGenre(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return GENRE_MAP[lower] || 'other';
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

interface ScrapedShow {
  title: string;
  slug: string;
  description: string | null;
  genre: string | null;
  image_url: string | null;
  director: string | null;
  cast_list: string[];
  source_url: string;
  performances: { date: string; time: string | null; venue: string | null; ticket_url: string | null }[];
}

async function scrapeNationalTheatreList(): Promise<string[]> {
  const showUrls: string[] = [];

  for (let page = 1; page <= 9; page++) {
    try {
      const res = await fetch(`https://nationaltheatre.bg/bg/repertoar?page=${page}`);
      const html = await res.text();

      // Extract show URLs from repertoire page
      const urlRegex = /href="(\/bg\/predstavlenie\/[^"]+)"/g;
      let match;
      while ((match = urlRegex.exec(html)) !== null) {
        const fullUrl = `https://nationaltheatre.bg${match[1]}`;
        if (!showUrls.includes(fullUrl)) {
          showUrls.push(fullUrl);
        }
      }
    } catch (e) {
      console.error(`Error scraping repertoire page ${page}:`, e);
    }
  }

  return showUrls;
}

async function scrapeShowDetail(url: string): Promise<ScrapedShow | null> {
  try {
    const res = await fetch(url);
    const html = await res.text();

    // Extract title - look for the main heading
    const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/s) || html.match(/<title>(.*?)[\|<]/);
    const title = titleMatch
      ? titleMatch[1].replace(/<[^>]+>/g, '').trim()
      : '';

    if (!title) return null;

    // Extract image
    const imgMatch = html.match(/\/storage\/shows\/[^"'\s]+\.(jpg|jpeg|png|webp)/i);
    const image_url = imgMatch ? `https://nationaltheatre.bg${imgMatch[0]}` : null;

    // Extract genre
    let genre: string | null = null;
    const genreMatch = html.match(/(?:Жанр|жанр)[:\s]*([^<\n]+)/i);
    if (genreMatch) {
      genre = normalizeGenre(genreMatch[1]);
    }

    // Extract director
    let director: string | null = null;
    const directorMatch = html.match(/(?:Режисьор|режисьор)[:\s]*([^<\n]+)/i);
    if (directorMatch) {
      director = directorMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    // Extract description/synopsis
    let description: string | null = null;
    const synopsisMatch = html.match(/id="synopsis"[^>]*>([\s\S]*?)(?:<\/section|<section)/i);
    if (synopsisMatch) {
      description = synopsisMatch[1]
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 1000);
    }

    // Extract cast names
    const cast_list: string[] = [];
    const castSection = html.match(/id="actors"([\s\S]*?)(?:<\/section|<section)/i);
    if (castSection) {
      const nameRegex = /<(?:h[3-6]|span|a)[^>]*>([А-Яа-яA-Za-z\s.-]+)<\//g;
      let nameMatch;
      while ((nameMatch = nameRegex.exec(castSection[1])) !== null) {
        const name = nameMatch[1].trim();
        if (name.length > 3 && name.length < 50 && !cast_list.includes(name)) {
          cast_list.push(name);
        }
      }
    }

    // Extract performances (dates)
    const performances: ScrapedShow['performances'] = [];
    const datesSection = html.match(/id="dates"([\s\S]*?)(?:<\/section|<section)/i);
    if (datesSection) {
      // Look for date patterns and ticket links
      const dateRegex = /(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})/g;
      let dateMatch;
      while ((dateMatch = dateRegex.exec(datesSection[1])) !== null) {
        performances.push({
          date: dateMatch[1],
          time: dateMatch[2],
          venue: null, // Will try to extract separately
          ticket_url: url + `/${dateMatch[1]}|${dateMatch[2]}:00`,
        });
      }
    }

    // Also try to find dates in ticket links throughout the page
    if (performances.length === 0) {
      const ticketDateRegex = /predstavlenie\/[^/]+\/(\d{4}-\d{2}-\d{2})\|(\d{2}:\d{2})/g;
      let tdMatch;
      while ((tdMatch = ticketDateRegex.exec(html)) !== null) {
        const existing = performances.find(p => p.date === tdMatch[1] && p.time === tdMatch[2]);
        if (!existing) {
          performances.push({
            date: tdMatch[1],
            time: tdMatch[2],
            venue: null,
            ticket_url: `https://nationaltheatre.bg/bg/predstavlenie/${url.split('/').pop()}/${tdMatch[1]}|${tdMatch[2]}:00`,
          });
        }
      }
    }

    // Extract venue from page
    const venueMatch = html.match(/(?:Основна сцена|Камерна сцена|сцена "Апостол Карамитев"|Сцена под покрива)/i);
    if (venueMatch) {
      performances.forEach(p => { p.venue = venueMatch[0]; });
    }

    const slug = slugify(title);

    return {
      title,
      slug,
      description,
      genre,
      image_url,
      director,
      cast_list,
      source_url: url,
      performances,
    };
  } catch (e) {
    console.error(`Error scraping show detail ${url}:`, e);
    return null;
  }
}

export const POST: APIRoute = async ({ request, locals }) => {
  const runtime = (locals as any).runtime;
  const db = getDB(runtime);

  // Simple auth: check for a secret key (set this in env vars)
  const url = new URL(request.url);
  const key = url.searchParams.get('key');
  if (key !== (runtime.env.SCRAPE_KEY || 'dev-scrape-key')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const theatreId = 1; // National Theatre

  // Step 1: Get all show URLs
  const showUrls = await scrapeNationalTheatreList();
  let scraped = 0;
  let errors = 0;

  // Step 2: Scrape each show detail
  for (const showUrl of showUrls) {
    const show = await scrapeShowDetail(showUrl);
    if (!show) {
      errors++;
      continue;
    }

    try {
      // Upsert show
      await db.prepare(`
        INSERT INTO shows (theatre_id, title, slug, description, genre, image_url, director, cast_list, source_url, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ON CONFLICT (slug) DO UPDATE SET
          description = COALESCE(excluded.description, shows.description),
          genre = COALESCE(excluded.genre, shows.genre),
          image_url = COALESCE(excluded.image_url, shows.image_url),
          director = COALESCE(excluded.director, shows.director),
          cast_list = COALESCE(excluded.cast_list, shows.cast_list),
          updated_at = datetime('now')
      `).bind(
        theatreId,
        show.title,
        show.slug,
        show.description,
        show.genre,
        show.image_url,
        show.director,
        show.cast_list.length > 0 ? JSON.stringify(show.cast_list) : null,
        show.source_url
      ).run();

      // Get show ID
      const dbShow = await db.prepare('SELECT id FROM shows WHERE slug = ?').bind(show.slug).first<{ id: number }>();
      if (!dbShow) continue;

      // Insert new performances (skip existing)
      for (const perf of show.performances) {
        await db.prepare(`
          INSERT OR IGNORE INTO performances (show_id, date, time, venue, ticket_url)
          VALUES (?, ?, ?, ?, ?)
        `).bind(dbShow.id, perf.date, perf.time, perf.venue, perf.ticket_url).run();
      }

      scraped++;
    } catch (e) {
      console.error(`Error saving show ${show.title}:`, e);
      errors++;
    }
  }

  return new Response(JSON.stringify({
    success: true,
    total_urls: showUrls.length,
    scraped,
    errors,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
