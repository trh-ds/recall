import * as SQLite from 'expo-sqlite';

import { consent, kv, kvSnapshot } from './kv';

export type Note = {
  id: number;
  text: string;
  tag: string | null;
  done: number;
  created_at: number;
};
export type Deadline = {
  id: number;
  title: string;
  course: string | null;
  due_at: number;
  done: number;
  created_at: number;
};
/** `weekday` matches `Date#getDay()` (0 = Sunday). Times are minutes from midnight. */
export type ClassSlot = {
  id: number;
  course: string;
  weekday: number;
  start_min: number;
  end_min: number;
  room: string | null;
};
export type NotificationRow = {
  id: number;
  app: string;
  title: string | null;
  body: string | null;
  category: string | null;
  created_at: number;
};
export type EventRow = { id: number; name: string; day: string; created_at: number };

/** Append-only. Each entry runs once, tracked by `PRAGMA user_version`. Never edit a shipped one. */
const MIGRATIONS = [
  `CREATE TABLE notes (
     id INTEGER PRIMARY KEY NOT NULL,
     text TEXT NOT NULL,
     tag TEXT,
     created_at INTEGER NOT NULL
   );
   CREATE TABLE deadlines (
     id INTEGER PRIMARY KEY NOT NULL,
     title TEXT NOT NULL,
     course TEXT,
     due_at INTEGER NOT NULL,
     done INTEGER NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL
   );
   CREATE TABLE classes (
     id INTEGER PRIMARY KEY NOT NULL,
     course TEXT NOT NULL,
     weekday INTEGER NOT NULL,
     start_min INTEGER NOT NULL,
     end_min INTEGER NOT NULL,
     room TEXT
   );
   CREATE TABLE notifications (
     id INTEGER PRIMARY KEY NOT NULL,
     app TEXT NOT NULL,
     title TEXT,
     body TEXT,
     category TEXT,
     created_at INTEGER NOT NULL
   );
   CREATE TABLE events (
     id INTEGER PRIMARY KEY NOT NULL,
     name TEXT NOT NULL,
     day TEXT NOT NULL,
     created_at INTEGER NOT NULL
   );`,
  // A capture tagged `todo` is a task, and a task can be ticked off. Same table —
  // the briefing's "Top 3" is a view over captures, not a second kind of thing.
  `ALTER TABLE notes ADD COLUMN done INTEGER NOT NULL DEFAULT 0;`,
];

const TABLES = ['notes', 'deadlines', 'classes', 'notifications', 'events'] as const;

// ponytail: sync API blocks the JS thread. Tables are hundreds of rows at MVP
// scale, so it's free — switch to the async API if a query ever shows up in a frame drop.
export const db = SQLite.openDatabaseSync('recall.db');

export function migrate(target = db) {
  const from = target.getFirstSync<{ user_version: number }>('PRAGMA user_version')?.user_version ?? 0;
  if (from >= MIGRATIONS.length) return;
  target.withTransactionSync(() => {
    for (let i = from; i < MIGRATIONS.length; i++) target.execSync(MIGRATIONS[i]);
  });
  target.execSync(`PRAGMA user_version = ${MIGRATIONS.length}`);
}

migrate();

// --- notes / captures (F3, F6) ---

export function addNote(text: string, tag?: string): number {
  return db.runSync('INSERT INTO notes (text, tag, created_at) VALUES (?, ?, ?)', [
    text,
    tag ?? null,
    Date.now(),
  ]).lastInsertRowId;
}

/** Keyword + recency (PRD §6 memory v1). Embeddings only after the loop is validated. */
export function searchNotes(query: string, limit = 20): Note[] {
  return db.getAllSync<Note>(
    'SELECT * FROM notes WHERE text LIKE ? ESCAPE ? ORDER BY created_at DESC LIMIT ?',
    [`%${escapeLike(query)}%`, LIKE_ESCAPE, limit],
  );
}

export function recentNotes(limit = 20): Note[] {
  return db.getAllSync<Note>('SELECT * FROM notes ORDER BY created_at DESC LIMIT ?', [limit]);
}

/** Captures tagged `todo` — the briefing's "Top 3 today" (F1). Open ones first. */
export function listTodos(limit = 3): Note[] {
  return db.getAllSync<Note>(
    "SELECT * FROM notes WHERE tag = 'todo' ORDER BY done ASC, created_at DESC LIMIT ?",
    [limit],
  );
}

export function toggleNote(id: number) {
  db.runSync('UPDATE notes SET done = 1 - done WHERE id = ?', [id]);
}

const LIKE_ESCAPE = '\\';
/** `%` and `_` in user text are wildcards to LIKE — neutralise them. */
function escapeLike(s: string) {
  return s.replace(/[\\%_]/g, (c) => LIKE_ESCAPE + c);
}

// --- deadlines (F2) ---

export function addDeadline(title: string, dueAt: number, course?: string): number {
  return db.runSync('INSERT INTO deadlines (title, course, due_at, created_at) VALUES (?, ?, ?, ?)', [
    title,
    course ?? null,
    dueAt,
    Date.now(),
  ]).lastInsertRowId;
}

export function listDeadlines(includeDone = false): Deadline[] {
  return db.getAllSync<Deadline>(
    `SELECT * FROM deadlines ${includeDone ? '' : 'WHERE done = 0'} ORDER BY due_at ASC`,
  );
}

export function completeDeadline(id: number) {
  db.runSync('UPDATE deadlines SET done = 1 WHERE id = ?', [id]);
}

// --- timetable (F5) ---

export function addClass(c: Omit<ClassSlot, 'id'>): number {
  return db.runSync(
    'INSERT INTO classes (course, weekday, start_min, end_min, room) VALUES (?, ?, ?, ?, ?)',
    [c.course, c.weekday, c.start_min, c.end_min, c.room],
  ).lastInsertRowId;
}

export function listClasses(): ClassSlot[] {
  return db.getAllSync<ClassSlot>('SELECT * FROM classes ORDER BY weekday, start_min');
}

/**
 * Next class at or after `now`, wrapping into next week if today's are done.
 * Computed in JS rather than SQL — the table is one week of rows, and week
 * wraparound in SQL costs more code than it saves.
 */
export function getNextClass(now = new Date(), classes = listClasses()): ClassSlot | null {
  if (!classes.length) return null;
  const nowSlot = now.getDay() * 1440 + now.getHours() * 60 + now.getMinutes();
  const slot = (c: ClassSlot) => c.weekday * 1440 + c.start_min;
  const sorted = [...classes].sort((a, b) => slot(a) - slot(b));
  return sorted.find((c) => slot(c) >= nowSlot) ?? sorted[0];
}

// --- notification log (F4) ---

export function logNotification(
  n: Pick<NotificationRow, 'app'> & Partial<Pick<NotificationRow, 'title' | 'body' | 'category'>>,
): number {
  return db.runSync(
    'INSERT INTO notifications (app, title, body, category, created_at) VALUES (?, ?, ?, ?, ?)',
    [n.app, n.title ?? null, n.body ?? null, n.category ?? null, Date.now()],
  ).lastInsertRowId;
}

export function recentNotifications(limit = 50): NotificationRow[] {
  return db.getAllSync<NotificationRow>(
    'SELECT * FROM notifications ORDER BY created_at DESC LIMIT ?',
    [limit],
  );
}

// --- retention instrumentation (Phase 7) ---

/** Log an aggregate-only event, e.g. `open`, `briefing_read`, `capture`. No content. */
export function recordEvent(name: string) {
  const now = new Date();
  const day = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  db.runSync('INSERT INTO events (name, day, created_at) VALUES (?, ?, ?)', [name, day, now.getTime()]);
}

export function activeDays(): string[] {
  return db
    .getAllSync<{ day: string }>('SELECT DISTINCT day FROM events ORDER BY day')
    .map((r) => r.day);
}

// --- DPDP rights (AGENT.md §8) ---

/**
 * Everything the app holds, as JSON.
 * ponytail: returns a string for the UI to show/share. Writing it to a file needs
 * expo-file-system — add that when there's a share button to hang it off.
 */
export function exportAllData(): string {
  const tables = Object.fromEntries(
    TABLES.map((t) => [t, db.getAllSync(`SELECT * FROM ${t}`)]),
  );
  return JSON.stringify({ exportedAt: new Date().toISOString(), settings: kvSnapshot(), ...tables }, null, 2);
}

/** Purges SQLite + MMKV. Called on "delete all data" and on consent withdrawal. */
export function deleteAllData() {
  db.withTransactionSync(() => {
    for (const t of TABLES) db.runSync(`DELETE FROM ${t}`);
  });
  kv.clearAll();
}

export function withdrawConsent() {
  consent.clear();
  deleteAllData();
}
