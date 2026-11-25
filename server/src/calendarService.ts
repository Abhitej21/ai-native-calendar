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

  /**
   * Clear overlaps for a day:
   * - soft vs anything → drop the soft side
   * - hard vs hard → move the later-starting meeting to the next free slot
   */
  resolveConflicts(dayIso?: string): {
    removed: CalendarEvent[];
    moved: CalendarEvent[];
  } {
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
    const moved: CalendarEvent[] = [];
    const needsHardPass = dayEvents.some((a, i) =>
      dayEvents.slice(i + 1).some(
        (b) =>
          a.priority === 'hard' &&
          b.priority === 'hard' &&
          !toRemove.has(a.id) &&
          !toRemove.has(b.id) &&
          areIntervalsOverlapping(
            { start: parseISO(a.start), end: parseISO(a.end) },
            { start: parseISO(b.start), end: parseISO(b.end) },
          ),
      ),
    );

    if (!toRemove.size && !needsHardPass) return { removed, moved };

    this.checkpoint();

    for (const id of toRemove) {
      const r = this.delete(id);
      if (r) removed.push(r);
    }

    const remaining = this.list(from, to);
    const movedIds = new Set<string>();
    for (let i = 0; i < remaining.length; i++) {
      for (let j = i + 1; j < remaining.length; j++) {
        const a = remaining[i];
        const b = remaining[j];
        if (a.priority !== 'hard' || b.priority !== 'hard') continue;
        if (movedIds.has(a.id) || movedIds.has(b.id)) continue;
        if (
          !areIntervalsOverlapping(
            { start: parseISO(a.start), end: parseISO(a.end) },
            { start: parseISO(b.start), end: parseISO(b.end) },
          )
        ) {
          continue;
        }

        const aStart = parseISO(a.start).getTime();
        const bStart = parseISO(b.start).getTime();
        const mover = bStart >= aStart ? b : a;
        const keeper = mover.id === a.id ? b : a;
        const duration = differenceInMinutes(
          parseISO(mover.end),
          parseISO(mover.start),
        );

        const searchFrom = new Date(day);
        searchFrom.setHours(9, 0, 0, 0);
        const slots = this.findFreeSlots(
          duration,
          searchFrom.toISOString(),
          to,
        );
        const keeperInterval = {
          start: parseISO(keeper.start),
          end: parseISO(keeper.end),
        };
        const isUsable = (slot: { start: string; end: string }) => {
          const start = parseISO(slot.start);
          const end = parseISO(slot.end);
          return (
            !areIntervalsOverlapping({ start, end }, keeperInterval) &&
            start.getTime() !== parseISO(mover.start).getTime()
          );
        };
        // Prefer a slot after the kept meeting so we don't yank people to 9am.
        const pick =
          slots.find(
            (slot) =>
              isUsable(slot) &&
              parseISO(slot.start).getTime() >= keeperInterval.end.getTime(),
          ) ??
          slots.find(isUsable) ??
          null;

        let updated: CalendarEvent | null = null;
        if (pick) {
          updated = this.update(mover.id, {
            start: pick.start,
            end: pick.end,
            title: mover.title.replace(/\s*\(overlap\)\s*$/i, ''),
            description:
              (mover.description ? `${mover.description} · ` : '') +
              `Rescheduled by Pulse to clear conflict with “${keeper.title}”`,
          });
        } else {
          const start = parseISO(keeper.end);
          updated = this.update(mover.id, {
            start: start.toISOString(),
            end: addMinutes(start, duration).toISOString(),
            title: mover.title.replace(/\s*\(overlap\)\s*$/i, ''),
            description:
              (mover.description ? `${mover.description} · ` : '') +
              `Rescheduled by Pulse to clear conflict with “${keeper.title}”`,
          });
        }

        if (updated) {
          moved.push(updated);
          movedIds.add(updated.id);
        }
      }
    }

    return { removed, moved };
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
