import {
  addDays,
  nextMonday,
  setHours,
  setMinutes,
  startOfDay,
  isMonday,
} from 'date-fns';
import { v4 as uuid } from 'uuid';
import type { CalendarEvent } from './types.js';

/** Anchor the demo week to the current week's Monday so "today" always feels live. */
export function getWeekAnchor(now = new Date()): Date {
  const day = startOfDay(now);
  return isMonday(day) ? day : nextMonday(addDays(day, -7));
}

function at(day: Date, hour: number, minute = 0): Date {
  return setMinutes(setHours(day, hour), minute);
}

function iso(d: Date): string {
  return d.toISOString();
}

/**
 * Busy IC/EM week for persona "Abhiteja" — designed so demo chips always hit real data.
 */
export function buildSeedEvents(now = new Date()): CalendarEvent[] {
  const monday = getWeekAnchor(now);
  const wed = addDays(monday, 2);
  const thu = addDays(monday, 3);
  const fri = addDays(monday, 4);

  // Prefer "today" relative meetings when possible for briefing demo
  const today = startOfDay(now);
  const briefingDay =
    today >= monday && today <= fri ? today : monday;

  const dayPlus = (offset: number) => addDays(briefingDay, offset);

  return [
    {
      id: uuid(),
      title: 'Standup',
      start: iso(at(briefingDay, 9, 30)),
      end: iso(at(briefingDay, 9, 45)),
      attendees: ['Team'],
      kind: 'meeting',
      priority: 'hard',
      location: 'Meet',
    },
    {
      id: uuid(),
      title: '1:1 with Priya',
      description: 'Career + project sync',
      start: iso(at(briefingDay, 11, 0)),
      end: iso(at(briefingDay, 11, 30)),
      attendees: ['Priya Sharma'],
      kind: 'meeting',
      priority: 'hard',
      location: 'Meet',
    },
    {
      id: uuid(),
      title: 'Design review — Pulse MVP',
      description: 'Needs prep: review Figma comments',
      start: iso(at(briefingDay, 13, 0)),
      end: iso(at(briefingDay, 14, 0)),
      attendees: ['Design', 'PM'],
      kind: 'meeting',
      priority: 'hard',
      location: 'Conf Room B',
    },
    {
      id: uuid(),
      title: 'Vendor sync (optional)',
      start: iso(at(briefingDay, 14, 0)),
      end: iso(at(briefingDay, 14, 30)),
      attendees: ['Acme Vendor'],
      kind: 'meeting',
      priority: 'soft',
      location: 'Meet',
    },
    {
      id: uuid(),
      title: 'Staff meeting',
      start: iso(at(briefingDay, 15, 0)),
      end: iso(at(briefingDay, 16, 0)),
      attendees: ['Eng org'],
      kind: 'meeting',
      priority: 'hard',
      location: 'Town Hall',
    },
    // Intentional conflict for briefing intelligence
    {
      id: uuid(),
      title: 'Customer escalation (overlap)',
      start: iso(at(briefingDay, 15, 30)),
      end: iso(at(briefingDay, 16, 0)),
      attendees: ['Support', 'CSM'],
      kind: 'meeting',
      priority: 'hard',
      location: 'Meet',
    },
    {
      id: uuid(),
      title: 'Product strategy',
      start: iso(at(dayPlus(1), 14, 0)),
      end: iso(at(dayPlus(1), 15, 0)),
      attendees: ['PM', 'Design'],
      kind: 'meeting',
      priority: 'hard',
    },
    {
      id: uuid(),
      title: 'Hiring loop — candidate A',
      start: iso(at(dayPlus(1), 15, 30)),
      end: iso(at(dayPlus(1), 16, 30)),
      attendees: ['Recruiting'],
      kind: 'meeting',
      priority: 'hard',
    },
    {
      id: uuid(),
      title: 'Team lunch',
      start: iso(at(wed, 12, 30)),
      end: iso(at(wed, 13, 30)),
      kind: 'personal',
      priority: 'soft',
    },
    {
      id: uuid(),
      title: 'Architecture deep dive',
      start: iso(at(thu, 11, 0)),
      end: iso(at(thu, 12, 30)),
      attendees: ['Staff eng'],
      kind: 'meeting',
      priority: 'hard',
    },
    {
      id: uuid(),
      title: 'Weekly planning',
      start: iso(at(fri, 9, 0)),
      end: iso(at(fri, 10, 0)),
      attendees: ['Team'],
      kind: 'meeting',
      priority: 'hard',
    },
    {
      id: uuid(),
      title: 'Hold: doctor appointment',
      start: iso(at(fri, 16, 0)),
      end: iso(at(fri, 17, 0)),
      kind: 'hold',
      priority: 'hard',
    },
    // Soft meeting tomorrow morning so focus-protect can flag it
    {
      id: uuid(),
      title: 'Coffee chat (optional)',
      start: iso(at(dayPlus(1), 9, 0)),
      end: iso(at(dayPlus(1), 9, 30)),
      attendees: ['New hire'],
      kind: 'meeting',
      priority: 'soft',
    },
  ];
}
