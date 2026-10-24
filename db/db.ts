import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

export type * from './types.ts';

const DB_PATH = fileURLToPath(new URL('./bubble.db', import.meta.url));

export function connect(): DatabaseSync {
  const db = new DatabaseSync(DB_PATH);
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  return db;
}
