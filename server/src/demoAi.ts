import {
  addDays,
  format,
  nextFriday,
  parseISO,
  startOfDay,
} from 'date-fns';
import type { CalendarService } from './calendarService.js';
import type { AssistantAction, AssistantResponse, CalendarEvent } from './types.js';

function fmt(iso: string): string {
  return format(parseISO(iso), 'EEE MMM d · h:mm a');
}

/**
 * Demo AI — deterministic intent engine for the interview script.
 * Production swap: same tools, LLM tool-calling on /api/assistant.
 */
export function handleAssistantMessage(
  calendar: CalendarService,
  message: string,
): AssistantResponse {
  const text = message.trim();
  const lower = text.toLowerCase();
  const actions: AssistantAction[] = [];

  // --- Briefing ---
  if (
    /brief|today at a glance|what's on today|whats on today|overview of today/.test(
      lower,
    )
  ) {
    const briefing = calendar.getBriefing();
    const lines = [
      `Here's your briefing for ${format(parseISO(briefing.date), 'EEEE, MMM d')}.`,
      briefing.summary,
      ...briefing.items.map((i) => `• ${i.message}`),
    ];
    actions.push({ type: 'briefing', message: 'Generated daily briefing' });
    return {
      reply: lines.join('\n'),
      actions,
      events: calendar.list(),
      briefing,
    };
  }

  // --- Decline soft meetings today ---
  if (
    /decline.*(soft|optional)|clear soft|remove soft|cut soft/.test(lower)
  ) {
    const removed = calendar.declineSoftOnDay();
    if (!removed.length) {
      return {
        reply: 'No soft/optional meetings left on today to decline.',
        actions: [{ type: 'info', message: 'Nothing to decline' }],
        events: calendar.list(),
      };
    }
    for (const e of removed) {
      actions.push({
        type: 'deleted',
        message: `Declined “${e.title}”`,
        eventId: e.id,
      });
    }
    return {
      reply:
        `Declined ${removed.length} soft meeting(s) today:\n` +
        removed.map((e) => `• ${e.title} (${fmt(e.start)})`).join('\n') +
        `\n\nUndo anytime with the Undo button or ⌘/Ctrl+Z.`,
      actions,
      events: calendar.list(),
    };
  }

  // --- Resolve conflicts (drop soft side; reshuffle hard↔hard) ---
  if (/resolve conflict|fix overlap|clear conflict|fix today/.test(lower)) {
    const { removed, moved } = calendar.resolveConflicts();
    if (!removed.length && !moved.length) {
      return {
        reply: 'No overlapping meetings to resolve today.',
        actions: [{ type: 'info', message: 'No conflicts' }],
        events: calendar.list(),
      };
    }
    for (const e of removed) {
      actions.push({
        type: 'deleted',
        message: `Removed “${e.title}” to clear overlap`,
        eventId: e.id,
      });
    }
    for (const e of moved) {
      actions.push({
        type: 'updated',
        message: `Moved “${e.title}” to ${fmt(e.start)}`,
        eventId: e.id,
      });
    }
    const parts: string[] = [];
    if (removed.length) {
      parts.push(
        `Dropped ${removed.length} soft meeting(s):\n` +
          removed.map((e) => `• ${e.title}`).join('\n'),
      );
    }
    if (moved.length) {
      parts.push(
        `Rescheduled ${moved.length} hard meeting(s) out of overlap:\n` +
          moved.map((e) => `• ${e.title} → ${fmt(e.start)}`).join('\n'),
      );
    }
    return {
      reply: parts.join('\n\n') + `\n\nUndo anytime with Undo or ⌘/Ctrl+Z.`,
      actions,
      events: calendar.list(),
    };
  }

  // --- Focus protect ---
  if (/protect|focus|deep work|focus time/.test(lower)) {
    const hoursMatch = lower.match(/(\d+)\s*h/);
    const duration = hoursMatch ? Number(hoursMatch[1]) * 60 : 120;
    const tomorrow = /tomorrow/.test(lower);
    const day = tomorrow
      ? addDays(startOfDay(new Date()), 1)
      : startOfDay(new Date());

    calendar.checkpoint();
    const { event, flagged } = calendar.protectFocus(
      duration,
      day.toISOString(),
      9,
    );
    actions.push({
      type: 'created',
      message: `Blocked ${duration / 60}h focus`,
      eventId: event.id,
    });

    let reply = `Protected ${duration / 60} hour(s) of focus on ${format(day, 'EEEE')}:\n• ${event.title} — ${fmt(event.start)} → ${format(parseISO(event.end), 'h:mm a')}`;
    if (flagged.length) {
      reply += `\n\nFlagged soft conflict(s) during that block:`;
      for (const f of flagged) {
        reply += `\n• “${f.title}” (${fmt(f.start)}) — consider declining or moving.`;
        actions.push({
          type: 'info',
          message: `Flagged soft meeting: ${f.title}`,
          eventId: f.id,
        });
      }
    } else {
      reply += `\n\nNo soft meetings overlap that block. You're clear to deep-work.`;
    }

    return { reply, actions, events: calendar.list() };
  }

  // --- Move 1:1 with Priya to Friday afternoon ---
  if (/move|reschedule|shift/.test(lower) && /priya|1:1|1-1|one.on.one/.test(lower)) {
    const matches = calendar.findByTitle('Priya');
    const target =
      matches[0] ??
      calendar.findByTitle('1:1')[0];

    if (!target) {
      return {
        reply: `I couldn't find a 1:1 with Priya on your calendar.`,
        actions: [{ type: 'info', message: 'Event not found' }],
        events: calendar.list(),
      };
    }

    const friday = nextFriday(startOfDay(new Date()));
    calendar.checkpoint();
    const updated = calendar.moveEventToDayAfternoon(target.id, friday);
    if (!updated) {
      return {
        reply: `Couldn't move “${target.title}”.`,
        actions: [],
        events: calendar.list(),
      };
    }
    actions.push({
      type: 'updated',
      message: `Moved “${updated.title}” to Friday afternoon`,
      eventId: updated.id,
    });
    return {
      reply: `Moved “${updated.title}” to Friday afternoon:\n• ${fmt(updated.start)} → ${format(parseISO(updated.end), 'h:mm a')}\n\nWant me to notify Priya? (Demo: notification not sent.)`,
      actions,
      events: calendar.list(),
    };
  }

  // --- Create meeting from NL ---
  const createMatch = lower.match(
    /(?:schedule|create|book|add)\s+(?:a\s+)?(?:meeting|call|sync)?\s*(?:with\s+)?(.+?)(?:\s+tomorrow|\s+on\s+\w+|$)/,
  );
  if (/schedule|create|book|add/.test(lower) && /meeting|call|sync|block/.test(lower)) {
    const tomorrow = /tomorrow/.test(lower);
    const day = tomorrow
      ? addDays(startOfDay(new Date()), 1)
      : startOfDay(new Date());
    const title =
      createMatch?.[1]?.replace(/^(a|an|the)\s+/i, '').trim() ||
      'New meeting';
    const slots = calendar.findFreeSlots(
      30,
      (() => {
        const s = new Date(day);
        s.setHours(9, 0, 0, 0);
        return s.toISOString();
      })(),
      (() => {
        const e = new Date(day);
        e.setHours(18, 0, 0, 0);
        return e.toISOString();
      })(),
    );
    if (!slots.length) {
      return {
        reply: `No free 30-minute slots on ${format(day, 'EEEE')}.`,
        actions: [{ type: 'slots', message: 'No slots' }],
        events: calendar.list(),
      };
    }
    calendar.checkpoint();
    const created = calendar.create({
      title: title.charAt(0).toUpperCase() + title.slice(1),
      start: slots[0].start,
      end: slots[0].end,
      kind: 'meeting',
      priority: 'hard',
    });
    actions.push({
      type: 'created',
      message: `Created “${created.title}”`,
      eventId: created.id,
    });
    return {
      reply: `Booked “${created.title}” at ${fmt(created.start)}.`,
      actions,
      events: calendar.list(),
    };
  }

  // --- Find free slots ---
  if (/free slot|find time|when am i free|availability/.test(lower)) {
    const day = /tomorrow/.test(lower)
      ? addDays(startOfDay(new Date()), 1)
      : startOfDay(new Date());
    const from = new Date(day);
    from.setHours(9, 0, 0, 0);
    const to = new Date(day);
    to.setHours(18, 0, 0, 0);
    const slots = calendar.findFreeSlots(
      30,
      from.toISOString(),
      to.toISOString(),
    );
    actions.push({ type: 'slots', message: `Found ${slots.length} slots` });
    if (!slots.length) {
      return {
        reply: `No open 30-minute slots on ${format(day, 'EEEE')}.`,
        actions,
        events: calendar.list(),
      };
    }
    return {
      reply:
        `Open 30-minute slots on ${format(day, 'EEEE')}:\n` +
        slots
          .slice(0, 5)
          .map((s) => `• ${fmt(s.start)}`)
          .join('\n'),
      actions,
      events: calendar.list(),
    };
  }

  // --- Cancel / delete ---
  if (/cancel|delete|remove/.test(lower)) {
    const soft = calendar
      .list()
      .find(
        (e) =>
          e.priority === 'soft' &&
          lower.includes(e.title.toLowerCase().split(' ')[0]),
      );
    const byName = calendar
      .list()
      .find((e) => lower.includes(e.title.toLowerCase()));
    const target = soft ?? byName;
    if (!target) {
      return {
        reply:
          'Tell me which event to cancel (e.g. “Cancel coffee chat”). Soft/optional meetings are safest to cut.',
        actions: [{ type: 'info', message: 'Need event name' }],
        events: calendar.list(),
      };
    }
    calendar.checkpoint();
    calendar.delete(target.id);
    actions.push({
      type: 'deleted',
      message: `Cancelled “${target.title}”`,
      eventId: target.id,
    });
    return {
      reply: `Cancelled “${target.title}” (${fmt(target.start)}).`,
      actions,
      events: calendar.list(),
    };
  }

  // --- Help / default ---
  return {
    reply: [
      `I'm Pulse — your calendar operating layer. Try:`,
      `• “Brief me on today”`,
      `• “Protect 2 hours of focus tomorrow morning”`,
      `• “Move my 1:1 with Priya to Friday afternoon”`,
      `• “Decline soft meetings today”`,
      `• “Resolve conflicts today”`,
      `• “Find free slots tomorrow”`,
    ].join('\n'),
    actions: [{ type: 'info', message: 'Showed help' }],
    events: calendar.list() as CalendarEvent[],
  };
}
