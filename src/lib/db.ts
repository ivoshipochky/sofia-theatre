export function getDB(runtime: any): D1Database {
  return runtime.env.DB;
}

export interface Theatre {
  id: number;
  name: string;
  slug: string;
  website: string | null;
  address: string | null;
  logo_url: string | null;
}

export interface Show {
  id: number;
  theatre_id: number;
  title: string;
  slug: string;
  description: string | null;
  genre: string | null;
  image_url: string | null;
  director: string | null;
  cast_list: string | null;
  source_url: string | null;
  // joined fields
  theatre_name?: string;
  avg_rating?: number;
  rating_count?: number;
}

export interface Performance {
  id: number;
  show_id: number;
  date: string;
  time: string | null;
  venue: string | null;
  ticket_url: string | null;
}

export interface Rating {
  id: number;
  user_id: number;
  show_id: number;
  score: number;
  review: string | null;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

export interface User {
  id: number;
  email: string;
  name: string | null;
  avatar_url: string | null;
  provider: string;
}

export const GENRES = [
  { slug: 'drama', label: 'Драма', labelEn: 'Drama' },
  { slug: 'comedy', label: 'Комедия', labelEn: 'Comedy' },
  { slug: 'musical', label: 'Мюзикъл', labelEn: 'Musical' },
  { slug: 'opera', label: 'Опера', labelEn: 'Opera' },
  { slug: 'ballet', label: 'Балет', labelEn: 'Ballet' },
  { slug: 'children', label: 'Детски', labelEn: "Children's" },
  { slug: 'experimental', label: 'Експериментален', labelEn: 'Experimental' },
  { slug: 'classic', label: 'Класика', labelEn: 'Classic' },
  { slug: 'contemporary', label: 'Съвременен', labelEn: 'Contemporary' },
  { slug: 'other', label: 'Друго', labelEn: 'Other' },
];
