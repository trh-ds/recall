/**
 * The daily briefing (PRD F1) — the anchor habit. Everything the home screen shows
 * is derived here, synchronously, from on-device state only.
 *
 * Formatting and selection live here rather than in the screen so they can be
 * checked without a renderer — see `app/briefing-test.tsx`.
 */

import {
  getNextClass,
  listClasses,
  listDeadlines,
  listTodos,
  recentNotifications,
  type ClassSlot,
  type Deadline,
  type Note,
  type NotificationRow,
} from '@/db';

const HOUR = 3600_000;
const DAY = 24 * HOUR;

export type Phase = 'morning' | 'evening';
/** Drives the colour band on a deadline card. */
export type Urgency = 'urgent' | 'warn' | 'calm';

export type DeadlineCard = {
  id: number;
  title: string;
  countdown: string;
  urgency: Urgency;
  note: string;
};

export type NextUp = { title: string; at: string; detail: string; isToday: boolean };

export type Suggestion = {
  deadlineId: number;
  headline: string;
  because: string;
  startAt: number;
  endAt: number;
};

export type Briefing = {
  phase: Phase;
  /** "Thu 14 Aug · 08:42" */
  stamp: string;
  heroLine1: string;
  heroLine2: string;
  nextUp: NextUp | null;
  deadlines: DeadlineCard[];
  tasks: Note[];
  doneCount: string;
  triage: { kept: NotificationRow[]; heldBack: number } | null;
  suggestion: Suggestion | null;
  /** The transparency line — what Recall read to build this. */
  sources: string;
  isEmpty: boolean;
};

// --- formatting ---------------------------------------------------------------

const pad = (n: number) => String(n).padStart(2, '0');
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const clock = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const stampOf = (d: Date) =>
  `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]} · ${clock(d)}`;

/** "06h 12m" · "1d 15h" · "12m" · "overdue". Two units at most — readable in a glance. */
export function countdown(ms: number): string {
  if (ms <= 0) return 'overdue';
  const mins = Math.floor(ms / 60_000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ${hrs % 24}h`;
  if (hrs > 0) return `${pad(hrs)}h ${pad(mins % 60)}m`;
  return `${Math.max(1, mins)}m`;
}

/** Red inside 12 hours, amber inside 48, quiet after. */
export function urgency(ms: number): Urgency {
  if (ms <= 12 * HOUR) return 'urgent';
  if (ms <= 48 * HOUR) return 'warn';
  return 'calm';
}

/** Morning briefing until 16:00, evening wrap after it. */
export const phaseFor = (now: Date): Phase => (now.getHours() < 16 ? 'morning' : 'evening');

/** Whole calendar days from `a` to `b`, ignoring clock time (and DST). */
function daysBetween(a: Date, b: Date) {
  const from = new Date(a).setHours(0, 0, 0, 0);
  const to = new Date(b).setHours(0, 0, 0, 0);
  return Math.round((to - from) / DAY);
}

/** "23:59 today" · "23:59 tomorrow" · "Fri 23:59". */
export function dueLabel(dueAt: number, now = new Date()): string {
  const d = new Date(dueAt);
  const days = daysBetween(now, d);
  if (days <= 0) return `${clock(d)} today`;
  if (days === 1) return `${clock(d)} tomorrow`;
  return `${DAYS[d.getDay()]} ${clock(d)}`;
}

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
/** Spelled counts read faster than digits at hero size. Falls back to digits past nine. */
export const count = (n: number) => WORDS[n] ?? String(n);

/**
 * The two-line hero. It is the whole briefing for anyone who only glances — so it
 * states a number and what that number means for today, never a greeting.
 */
export function heroLines(phase: Phase, open: Deadline[], now: Date): [string, string] {
  const endOfDay = new Date(now).setHours(23, 59, 59, 999);
  const dueToday = open.filter((d) => d.due_at <= endOfDay);

  if (phase === 'morning') {
    const week = open.filter((d) => d.due_at <= now.getTime() + 7 * DAY);
    if (!week.length) return ['Nothing needs you', 'this morning.'];
    return [
      `${count(week.length)} deadline${week.length === 1 ? '' : 's'} this week.`,
      dueToday.length
        ? `${count(dueToday.length)} land${dueToday.length === 1 ? 's' : ''} today.`
        : 'None land today.',
    ];
  }

  if (!dueToday.length) return ['Today is closed out.', 'Nothing slipped.'];
  const fixable = dueToday.filter((d) => d.due_at > now.getTime()).length;
  return [
    `${count(dueToday.length)} thing${dueToday.length === 1 ? '' : 's'} slipped today.`,
    fixable ? `${count(fixable)} ${fixable === 1 ? 'is' : 'are'} still fixable.` : 'Tomorrow, then.',
  ];
}

// --- derivation ---------------------------------------------------------------

/** A `ClassSlot` is a weekly recurrence; resolve it against `now` to a real card. */
export function classCard(c: ClassSlot | null, now: Date): NextUp | null {
  if (!c) return null;
  const start = new Date(now);
  start.setDate(start.getDate() + ((c.weekday - now.getDay() + 7) % 7));
  start.setHours(0, c.start_min, 0, 0);
  // Same weekday but already past means `getNextClass` wrapped into next week.
  if (start.getTime() <= now.getTime()) start.setDate(start.getDate() + 7);
  return {
    title: c.course,
    at: clock(start),
    detail: [c.room, `in ${countdown(start.getTime() - now.getTime())}`]
      .filter(Boolean)
      .join(' · '),
    isToday: daysBetween(now, start) === 0,
  };
}

/**
 * The one thing Recall asks permission for right now: a focus block for the most
 * urgent open deadline inside 24 hours. Returns null when there is nothing worth
 * interrupting the user about — an empty "Needs you" slot is better than a filler one.
 *
 * ponytail: two fixed hours on the latest free evening hour, checked against the
 * timetable only. Real free/busy needs `eventsOn()` from the calendar service —
 * swap it in when the agent loop can await.
 */
export function suggestFocusBlock(
  open: Deadline[],
  classes: ClassSlot[],
  now = new Date(),
): Suggestion | null {
  const target = open.find(
    (d) => d.due_at > now.getTime() && d.due_at - now.getTime() <= DAY,
  );
  if (!target) return null;

  const busy = classes.filter((c) => c.weekday === now.getDay());
  for (let hour = 21; hour >= now.getHours() + 1; hour--) {
    const start = new Date(now);
    start.setHours(hour, 0, 0, 0);
    const end = new Date(start.getTime() + 2 * HOUR);
    if (end.getTime() >= target.due_at) continue; // must finish before it is due
    const from = hour * 60;
    if (busy.some((c) => c.start_min < from + 120 && from < c.end_min)) continue;
    return {
      deadlineId: target.id,
      startAt: start.getTime(),
      endAt: end.getTime(),
      headline: `Block ${clock(start)}–${clock(end)} tonight for ${shorten(target.title)}`,
      because: `Due ${dueLabel(target.due_at, now)} and still open. Nothing on your timetable clashes.`,
    };
  }
  return null;
}

/** Deadline titles are long by nature; a suggestion headline only needs the head of it. */
const shorten = (title: string) => title.split('—')[0].trim();

function list(parts: string[]) {
  if (parts.length < 2) return parts[0] ?? 'nothing yet';
  return `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
}

export function buildBriefing(now = new Date(), phase = phaseFor(now)): Briefing {
  const open = listDeadlines();
  const classes = listClasses();
  const tasks = listTodos();
  const overnight = recentNotifications(50).filter((n) => n.created_at > now.getTime() - DAY);

  const [heroLine1, heroLine2] = heroLines(phase, open, now);
  const nextUp = classCard(getNextClass(now, classes), now);

  const deadlines = open
    .filter((d) => d.due_at <= now.getTime() + 7 * DAY)
    .slice(0, 3)
    .map<DeadlineCard>((d) => ({
      id: d.id,
      title: d.title,
      countdown: countdown(d.due_at - now.getTime()),
      urgency: urgency(d.due_at - now.getTime()),
      note: [d.course, `due ${dueLabel(d.due_at, now)}`].filter(Boolean).join(' · '),
    }));

  // `category` is null until triage classifies a row, so an unclassified inbox
  // shows no triage card at all rather than a misleading "0 held back".
  const kept = overnight.filter((n) => n.category === 'keep');
  const heldBack = overnight.filter((n) => n.category && n.category !== 'keep').length;

  const doneTasks = tasks.filter((t) => t.done).length;

  return {
    phase,
    stamp: stampOf(now),
    heroLine1,
    heroLine2,
    nextUp,
    deadlines,
    tasks,
    doneCount: `${doneTasks}/${tasks.length} done`,
    triage: kept.length || heldBack ? { kept: kept.slice(0, 3), heldBack } : null,
    suggestion: suggestFocusBlock(open, classes, now),
    sources: `Built from ${list(
      [
        classes.length ? 'your timetable' : '',
        overnight.length ? `${overnight.length} notifications` : '',
        open.length ? `${open.length} deadlines` : '',
      ].filter(Boolean),
    )}.`,
    isEmpty: !deadlines.length && !tasks.length && !nextUp,
  };
}
