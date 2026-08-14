import * as Calendar from 'expo-calendar';

import { askThen } from './permissions';

async function ensureCalendar(): Promise<boolean> {
  if ((await Calendar.getCalendarPermissions()).granted) return true;
  const res = await askThen(
    'Recall reads your calendar so the briefing knows what you already have booked today. It stays on your phone.',
    () => Calendar.requestCalendarPermissions(),
  );
  return res?.granted ?? false;
}

/** Everything booked on `day`, across every calendar on the device. Empty if not permitted. */
export async function eventsOn(day = new Date()) {
  if (!(await ensureCalendar())) return [];
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const calendars = await Calendar.getCalendars();
  if (!calendars.length) return [];
  const events = await Calendar.listEvents(calendars, start, end);
  return events.sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
}
