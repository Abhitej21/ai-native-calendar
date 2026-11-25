import {
  addDays,
  addMinutes,
  differenceInMinutes,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import type { CalendarEvent } from '../types';

export const HOUR_START = 8;
export const HOUR_END = 19;
export const PX_PER_HOUR = 56;
export const SNAP_MINUTES = 15;
export const SNAP_PX = PX_PER_HOUR / (60 / SNAP_MINUTES);

export function getWeekDays(anchor = new Date()): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  const end = endOfWeek(anchor, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end }).slice(0, 5); // Mon–Fri for business view
}

export function eventsOnDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  return events.filter((e) => isSameDay(parseISO(e.start), day));
}

export function eventTopPx(event: CalendarEvent): number {
  const start = parseISO(event.start);
  const hours = start.getHours() + start.getMinutes() / 60;
  return (hours - HOUR_START) * PX_PER_HOUR;
}

export function eventHeightPx(event: CalendarEvent): number {
  const start = parseISO(event.start);
  const end = parseISO(event.end);
  const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return Math.max(hours * PX_PER_HOUR, 22);
}

export function formatEventTime(event: CalendarEvent): string {
  return `${format(parseISO(event.start), 'h:mm a')} – ${format(parseISO(event.end), 'h:mm a')}`;
}

export function kindStyles(kind: CalendarEvent['kind']): {
  bg: string;
  border: string;
  text: string;
} {
  switch (kind) {
    case 'focus':
      return {
        bg: 'bg-focus-soft',
        border: 'border-focus',
        text: 'text-focus',
      };
    case 'personal':
    case 'hold':
      return {
        bg: 'bg-coral-soft',
        border: 'border-coral',
        text: 'text-coral',
      };
    default:
      return {
        bg: 'bg-sky-soft',
        border: 'border-sky',
        text: 'text-sky',
      };
  }
}

export function weekLabel(days: Date[]): string {
  if (!days.length) return '';
  const first = days[0];
  const last = days[days.length - 1];
  return `${format(first, 'MMM d')} – ${format(last, 'MMM d, yyyy')}`;
}

export function shiftWeek(days: Date[], delta: number): Date {
  return addDays(days[0] ?? new Date(), delta * 7);
}

export function eventDurationMinutes(event: CalendarEvent): number {
  return Math.max(
    SNAP_MINUTES,
    differenceInMinutes(parseISO(event.end), parseISO(event.start)),
  );
}

/** Snap a pixel offset within the day grid to a 15-minute boundary. */
export function snapTopPx(topPx: number, durationMinutes: number): number {
  const maxTop =
    (HOUR_END - HOUR_START) * PX_PER_HOUR -
    (durationMinutes / 60) * PX_PER_HOUR;
  const clamped = Math.min(Math.max(0, topPx), Math.max(0, maxTop));
  return Math.round(clamped / SNAP_PX) * SNAP_PX;
}

/** Convert day + snapped top px into start/end ISO times (local). */
export function topPxToRange(
  day: Date,
  topPx: number,
  durationMinutes: number,
): { start: string; end: string } {
  const totalMinutes = HOUR_START * 60 + (topPx / PX_PER_HOUR) * 60;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.round(totalMinutes % 60);
  const start = setMinutes(setHours(startOfDay(day), hours), minutes);
  const end = addMinutes(start, durationMinutes);
  return { start: start.toISOString(), end: end.toISOString() };
}
