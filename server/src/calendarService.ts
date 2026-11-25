import {
  addMinutes,
  areIntervalsOverlapping,
  differenceInMinutes,
  endOfDay,
  isWithinInterval,
  max as maxDate,
  min as minDate,
  parseISO,
  startOfDay,
} from 'date-fns';
import { v4 as uuid } from 'uuid';
import { buildSeedEvents } from './seed.js';
import type {
  BriefingItem,
  CalendarEvent,
  CreateEventInput,
  DailyBriefing,
  FreeSlot,
  UpdateEventInput,
} from './types.js';

/**
 * CalendarService owns the calendar domain.
 * Swap the in-memory store for Google Calendar API later without changing routes.
 */
export class CalendarService {
  private events: CalendarEvent[];
  private history: CalendarEvent[][] = [];

  constructor(seed: CalendarEvent[] = buildSeedEvents()) {
    this.events = [...seed];
  }

  /** Snapshot current calendar so the last mutation can be undone. */
  checkpoint(): void {
    this.history.push(this.events.map((e) => ({ ...e })));
    if (this.history.length > 30) this.history.shift();
  }

  undo(): CalendarEvent[] | null {
    const prev = this.history.pop();
    if (!prev) return null;
    this.events = prev;
    return this.list();
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  replaceAll(events: CalendarEvent[]): void {
    this.events = events.map((e) => ({ ...e }));
    this.history = [];
  }

  declineSoftOnDay(dayIso?: string): CalendarEvent[] {
    const day = dayIso ? startOfDay(parseISO(dayIso)) : startOfDay(new Date());
    const from = day.toISOString();
    const to = endOfDay(day).toISOString();
    const soft = this.list(from, to).filter(
      (e) => e.priority === 'soft' && e.kind !== 'focus',
    );
    if (!soft.length) return [];
    this.checkpoint();
    for (const e of soft) this.delete(e.id);
    return soft;
  }

  resolveSoftConflicts(dayIso?: string): CalendarEvent[] {
    const day = dayIso ? startOfDay(parseISO(dayIso)) : startOfDay(new Date());
    const from = day.toISOString();
    const to = endOfDay(day).toISOString();
    const dayEvents = this.list(from, to);
    const toRemove = new Set<string>();

    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const a = dayEvents[i];
        const b = dayEvents[j];
        if (
          !areIntervalsOverlapping(
            { start: parseISO(a.start), end: parseISO(a.end) },
            { start: parseISO(b.start), end: parseISO(b.end) },
          )
        ) {
          continue;
        }
        if (a.priority === 'soft' && b.priority !== 'soft') toRemove.add(a.id);
        else if (b.priority === 'soft' && a.priority !== 'soft')
          toRemove.add(b.id);
        else if (a.priority === 'soft' && b.priority === 'soft')
          toRemove.add(b.id);
      }
    }

    const removed: CalendarEvent[] = [];
    if (toRemove.size) {
      this.checkpoint();
      for (const id of toRemove) {
        const r = this.delete(id);
        if (r) removed.push(r);
      }
    }
    return removed;
  }

  list(from?: string, to?: string): CalendarEvent[] {
    let result = [...this.events];
    if (from) {
      const fromDate = parseISO(from);
      result = result.filter((e) => parseISO(e.end) > fromDate);
    }
    if (to) {
      const toDate = parseISO(to);
      result = result.filter((e) => parseISO(e.start) < toDate);
    }
    return result.sort(
      (a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime(),
    );
  }

  getById(id: string): CalendarEvent | undefined {
    return this.events.find((e) => e.id === id);
  }

  create(input: CreateEventInput): CalendarEvent {
    const event: CalendarEvent = {
      id: uuid(),
      title: input.title,
      description: input.description,
      start: input.start,
      end: input.end,
      attendees: input.attendees,
      kind: input.kind ?? 'meeting',
      priority: input.priority ?? 'hard',
      location: input.location,
    };
    this.events.push(event);
    return event;
  }

  update(id: string, input: UpdateEventInput): CalendarEvent | null {
    const idx = this.events.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    this.events[idx] = { ...this.events[idx], ...input, id };
    return this.events[idx];
  }

  delete(id: string): CalendarEvent | null {
    const idx = this.events.findIndex((e) => e.id === id);
    if (idx < 0) return null;
    const [removed] = this.events.splice(idx, 1);
    return removed;
  }

  findByTitle(partial: string): CalendarEvent[] {
    const q = partial.toLowerCase();
    return this.list().filter((e) => e.title.toLowerCase().includes(q));
  }

  findFreeSlots(
    durationMinutes: number,
    fromIso: string,
    toIso: string,
    workStartHour = 9,
    workEndHour = 18,
  ): FreeSlot[] {
    const from = parseISO(fromIso);
    const to = parseISO(toIso);
    const dayEvents = this.list(fromIso, toIso);
    const slots: FreeSlot[] = [];

    let cursor = new Date(from);
    // Snap to work hours on first day
    if (cursor.getHours() < workStartHour) {
      cursor.setHours(workStartHour, 0, 0, 0);
    }

    while (cursor < to) {
      const dayEnd = new Date(cursor);
      dayEnd.setHours(workEndHour, 0, 0, 0);
      const windowEnd = minDate([dayEnd, to]);

      const busy = dayEvents
        .filter((e) =>
          areIntervalsOverlapping(
            { start: parseISO(e.start), end: parseISO(e.end) },
            { start: cursor, end: windowEnd },
          ),
        )
        .sort(
          (a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime(),
        );

      let freeStart = cursor;
      for (const event of busy) {
        const eStart = parseISO(event.start);
        const eEnd = parseISO(event.end);
        if (eStart > freeStart) {
          const gapEnd = minDate([eStart, windowEnd]);
          if (differenceInMinutes(gapEnd, freeStart) >= durationMinutes) {
            slots.push({
              start: freeStart.toISOString(),
              end: addMinutes(freeStart, durationMinutes).toISOString(),
            });
          }
        }
        freeStart = maxDate([freeStart, eEnd]);
      }
      if (differenceInMinutes(windowEnd, freeStart) >= durationMinutes) {
        slots.push({
          start: freeStart.toISOString(),
          end: addMinutes(freeStart, durationMinutes).toISOString(),
        });
      }

      // Next day at work start
      cursor = startOfDay(addMinutes(cursor, 24 * 60));
      cursor.setHours(workStartHour, 0, 0, 0);
    }

    return slots.slice(0, 8);
  }

  getBriefing(dateIso?: string): DailyBriefing {
    const day = dateIso ? startOfDay(parseISO(dateIso)) : startOfDay(new Date());
    const from = day.toISOString();
    const to = endOfDay(day).toISOString();
    const events = this.list(from, to).filter((e) => e.kind !== 'focus');
    const focusEvents = this.list(from, to).filter((e) => e.kind === 'focus');
    const items: BriefingItem[] = [];

    // Conflicts
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i];
        const b = events[j];
        if (
          areIntervalsOverlapping(
            { start: parseISO(a.start), end: parseISO(a.end) },
            { start: parseISO(b.start), end: parseISO(b.end) },
          )
        ) {
          items.push({
            type: 'conflict',
            message: `Conflict: “${a.title}” overlaps “${b.title}”.`,
            eventIds: [a.id, b.id],
          });
        }
      }
    }

    // Prep needed
    for (const e of events) {
      if (e.description?.toLowerCase().includes('prep')) {
        items.push({
          type: 'prep',
          message: `Prep needed for “${e.title}”: ${e.description}`,
          eventIds: [e.id],
        });
      }
    }

    // Soft meetings that could be declined
    for (const e of events.filter((x) => x.priority === 'soft')) {
      items.push({
        type: 'suggestion',
        message: `“${e.title}” is soft — consider declining or converting to async.`,
        eventIds: [e.id],
      });
    }

    const meetingMinutes = events.reduce(
      (sum, e) => sum + differenceInMinutes(parseISO(e.end), parseISO(e.start)),
      0,
    );
    const focusMinutes = focusEvents.reduce(
      (sum, e) => sum + differenceInMinutes(parseISO(e.end), parseISO(e.start)),
      0,
    );

    if (meetingMinutes >= 180) {
      items.push({
        type: 'load',
        message: `Heavy meeting load today (~${Math.round(meetingMinutes / 60)}h). Protect focus if you can.`,
      });
    }

    if (focusMinutes < 60) {
      items.push({
        type: 'focus_gap',
        message: 'Less than 1 hour of focus time blocked today.',
      });
    }

    const summary =
      items.length === 0
        ? `Light day — ${events.length} meetings on the calendar.`
        : `${events.length} meetings, ${items.filter((i) => i.type === 'conflict').length} conflict(s), ${focusMinutes}m focus blocked.`;

    return {
      date: day.toISOString(),
      summary,
      items,
      meetingCount: events.length,
      focusMinutes,
    };
  }

  protectFocus(
    durationMinutes: number,
    dayIso?: string,
    preferredStartHour = 9,
  ): { event: CalendarEvent; flagged: CalendarEvent[] } {
    const day = dayIso ? startOfDay(parseISO(dayIso)) : startOfDay(new Date());
    const preferredStart = new Date(day);
    preferredStart.setHours(preferredStartHour, 0, 0, 0);
    const preferredEnd = addMinutes(preferredStart, durationMinutes);

    const overlapping = this.list(
      preferredStart.toISOString(),
      preferredEnd.toISOString(),
    ).filter((e) =>
      areIntervalsOverlapping(
        { start: parseISO(e.start), end: parseISO(e.end) },
        { start: preferredStart, end: preferredEnd },
      ),
    );

    const hardOverlap = overlapping.some((e) => e.priority === 'hard');
    let start = preferredStart;
    let end = preferredEnd;

    // Keep the morning block when only soft meetings collide (demo: flag them).
    // Slide only when a hard meeting owns that window.
    if (hardOverlap) {
      const searchTo = endOfDay(day);
      const slots = this.findFreeSlots(
        durationMinutes,
        preferredStart.toISOString(),
        searchTo.toISOString(),
      );
      if (slots.length > 0) {
        start = parseISO(slots[0].start);
        end = parseISO(slots[0].end);
      }
    }

    const focus = this.create({
      title: 'Focus time — deep work',
      description: 'Protected by Pulse assistant',
      start: start.toISOString(),
      end: end.toISOString(),
      kind: 'focus',
      priority: 'hard',
    });

    const flagged = this.list(start.toISOString(), end.toISOString()).filter(
      (e) =>
        e.id !== focus.id &&
        e.priority === 'soft' &&
        areIntervalsOverlapping(
          { start: parseISO(e.start), end: parseISO(e.end) },
          { start, end },
        ),
    );

    return { event: focus, flagged };
  }

  moveEventToDayAfternoon(eventId: string, targetDay: Date): CalendarEvent | null {
    const event = this.getById(eventId);
    if (!event) return null;
    const duration = differenceInMinutes(
      parseISO(event.end),
      parseISO(event.start),
    );
    const dayStart = startOfDay(targetDay);
    const searchFrom = new Date(dayStart);
    searchFrom.setHours(13, 0, 0, 0);
    const searchTo = endOfDay(targetDay);
    // Temporarily ignore the event being moved when scoring free slots
    const others = this.list().filter((e) => e.id !== eventId);
    const slots = this.findFreeSlots(
      duration,
      searchFrom.toISOString(),
      searchTo.toISOString(),
    );
    const pick =
      slots.find((slot) => {
        const s = parseISO(slot.start);
        const e = parseISO(slot.end);
        return !others.some((o) =>
          areIntervalsOverlapping(
            { start: parseISO(o.start), end: parseISO(o.end) },
            { start: s, end: e },
          ),
        );
      }) ?? slots[0];

    if (!pick) {
      const fallbackStart = new Date(dayStart);
      fallbackStart.setHours(15, 0, 0, 0);
      return this.update(eventId, {
        start: fallbackStart.toISOString(),
        end: addMinutes(fallbackStart, duration).toISOString(),
      });
    }

    return this.update(eventId, {
      start: pick.start,
      end: pick.end,
    });
  }

  /** Used by Demo AI to check if a time falls on a given calendar day */
  isOnDay(event: CalendarEvent, day: Date): boolean {
    const d = startOfDay(day);
    return isWithinInterval(parseISO(event.start), {
      start: d,
      end: endOfDay(d),
    });
  }
}

export const calendarService = new CalendarService();
