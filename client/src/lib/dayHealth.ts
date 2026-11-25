import {
  areIntervalsOverlapping,
  differenceInMinutes,
  isSameDay,
  parseISO,
} from 'date-fns';
import type { CalendarEvent } from '../types';

export interface DayHealth {
  score: number;
  label: 'Calm' | 'Busy' | 'Overloaded';
  meetingHours: number;
  focusHours: number;
  conflicts: number;
  softCount: number;
  tip: string;
}

export function computeDayHealth(
  events: CalendarEvent[],
  day = new Date(),
): DayHealth {
  const dayEvents = events.filter((e) => isSameDay(parseISO(e.start), day));
  const meetings = dayEvents.filter((e) => e.kind !== 'focus');
  const focus = dayEvents.filter((e) => e.kind === 'focus');

  const meetingMinutes = meetings.reduce(
    (sum, e) => sum + differenceInMinutes(parseISO(e.end), parseISO(e.start)),
    0,
  );
  const focusMinutes = focus.reduce(
    (sum, e) => sum + differenceInMinutes(parseISO(e.end), parseISO(e.start)),
    0,
  );

  let conflicts = 0;
  for (let i = 0; i < meetings.length; i++) {
    for (let j = i + 1; j < meetings.length; j++) {
      if (
        areIntervalsOverlapping(
          { start: parseISO(meetings[i].start), end: parseISO(meetings[i].end) },
          { start: parseISO(meetings[j].start), end: parseISO(meetings[j].end) },
        )
      ) {
        conflicts += 1;
      }
    }
  }

  const softCount = meetings.filter((e) => e.priority === 'soft').length;

  // Start at 100; penalize load / conflicts / missing focus
  let score = 100;
  score -= Math.min(45, (meetingMinutes / 60) * 10);
  score -= conflicts * 18;
  score -= softCount * 4;
  if (focusMinutes < 60) score -= 12;
  if (focusMinutes >= 120) score += 8;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const label: DayHealth['label'] =
    score >= 75 ? 'Calm' : score >= 45 ? 'Busy' : 'Overloaded';

  const tip =
    conflicts > 0
      ? 'Resolve overlaps to reclaim focus.'
      : softCount > 0
        ? 'Decline soft meetings to lighten the day.'
        : focusMinutes < 60
          ? 'Protect at least 1h of deep work.'
          : 'Day looks manageable — stay sharp.';

  return {
    score,
    label,
    meetingHours: Math.round((meetingMinutes / 60) * 10) / 10,
    focusHours: Math.round((focusMinutes / 60) * 10) / 10,
    conflicts,
    softCount,
    tip,
  };
}
