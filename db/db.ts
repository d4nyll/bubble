import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

export type * from './types.ts';

const DB_PATH = fileURLToPath(new URL('./bubble.db', import.meta.url));
const MIGRATIONS = new URL('./migrations/', import.meta.url);

// Opens the database and brings it up to date. A new database gets schema.sql. An existing one
// gets every migrations/ file it hasn't had yet, in filename order. PRAGMA user_version counts
// how many it has had.
export function connect(): DatabaseSync {
  const db = new DatabaseSync(DB_PATH);
  db.exec('PRAGMA busy_timeout = 5000');
  const files = readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort();
  // IMMEDIATE takes the write lock first, so two processes starting together don't both migrate.
  db.exec('BEGIN IMMEDIATE');
  const isNew = !db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'articles'").get();
  const done = isNew ? files.length : (db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version;
  for (const file of files.slice(done)) db.exec(readFileSync(new URL(file, MIGRATIONS), 'utf8'));
  db.exec(`PRAGMA user_version = ${files.length}`);
  db.exec('COMMIT');
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  return db;
}
