-- Sofia Theatre Catalogue - D1 Database Schema

CREATE TABLE IF NOT EXISTS theatres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  website TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  theatre_id INTEGER NOT NULL REFERENCES theatres(id),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  genre TEXT,
  image_url TEXT,
  director TEXT,
  cast_list TEXT,
  source_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS performances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  show_id INTEGER NOT NULL REFERENCES shows(id),
  date TEXT NOT NULL,
  time TEXT,
  venue TEXT,
  ticket_url TEXT
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  provider TEXT DEFAULT 'google',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  show_id INTEGER NOT NULL REFERENCES shows(id),
  score INTEGER NOT NULL CHECK(score BETWEEN 1 AND 5),
  review TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, show_id)
);

CREATE INDEX IF NOT EXISTS idx_shows_genre ON shows(genre);
CREATE INDEX IF NOT EXISTS idx_shows_theatre ON shows(theatre_id);
CREATE INDEX IF NOT EXISTS idx_performances_date ON performances(date);
CREATE INDEX IF NOT EXISTS idx_performances_show ON performances(show_id);
CREATE INDEX IF NOT EXISTS idx_ratings_show ON ratings(show_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user ON ratings(user_id);

-- Seed: National Theatre
INSERT OR IGNORE INTO theatres (name, slug, website, address)
VALUES ('Народен театър "Иван Вазов"', 'naroden-teatyr-ivan-vazov', 'https://nationaltheatre.bg', 'ул. Дякон Игнатий 5, София');
