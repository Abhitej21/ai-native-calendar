import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  isSameDay,
  parseISO,
  startOfWeek,
} from 'date-fns';
import type { CalendarEvent } from '../types';

export const HOUR_START = 8;
export const HOUR_END = 19;
export const PX_PER_HOUR = 56;

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
