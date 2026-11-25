import { create } from 'zustand';
import { api } from './api';
import type {
  CalendarEvent,
  ChatMessage,
  DailyBriefing,
} from './types';

export interface ToastItem {
  id: string;
  message: string;
}

interface CalendarState {
  events: CalendarEvent[];
  highlightedIds: string[];
  messages: ChatMessage[];
  briefing: DailyBriefing | null;
  loading: boolean;
  sending: boolean;
  error: string | null;
  selectedEventId: string | null;
  toasts: ToastItem[];
  canUndo: boolean;
  loadEvents: () => Promise<void>;
  selectEvent: (id: string | null) => void;
  sendMessage: (text: string) => Promise<void>;
  createEvent: (input: Omit<CalendarEvent, 'id'>) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  resetDemo: () => Promise<void>;
  undo: () => Promise<void>;
  refreshUndoState: () => Promise<void>;
  pushToast: (message: string) => void;
  dismissToast: (id: string) => void;
}

let msgCounter = 0;
function nextMsgId() {
  msgCounter += 1;
  return `m-${msgCounter}`;
}

let toastCounter = 0;
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const useCalendarStore = create<CalendarState>((set, get) => ({
  events: [],
  highlightedIds: [],
  messages: [
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hi Abhiteja — I'm Pulse. I manage your calendar like an operating system, not a grid of boxes.\n\nTry a chip below, or press ⌘/Ctrl+K for the command palette.",
    },
  ],
  briefing: null,
  loading: false,
  sending: false,
  error: null,
  selectedEventId: null,
  toasts: [],
  canUndo: false,

  pushToast(message) {
    toastCounter += 1;
    const id = `t-${toastCounter}`;
    set((s) => ({ toasts: [...s.toasts, { id, message }] }));
    const timer = setTimeout(() => {
      get().dismissToast(id);
    }, 3500);
    toastTimers.set(id, timer);
  },

  dismissToast(id) {
    const timer = toastTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      toastTimers.delete(id);
    }
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  async refreshUndoState() {
    try {
      const { canUndo } = await api.canUndo();
      set({ canUndo });
    } catch {
      set({ canUndo: false });
    }
  },

  async loadEvents() {
    set({ loading: true, error: null });
    try {
      const { events } = await api.listEvents();
      set({ events, loading: false });
      await get().refreshUndoState();
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : 'Failed to load events',
      });
    }
  },

  selectEvent(id) {
    set({ selectedEventId: id });
  },

  async sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || get().sending) return;

    set((s) => ({
      sending: true,
      messages: [
        ...s.messages,
        { id: nextMsgId(), role: 'user', content: trimmed },
      ],
    }));

    try {
      const result = await api.askAssistant(trimmed);
      const highlight =
        result.actions
          .map((a) => a.eventId)
          .filter((id): id is string => Boolean(id)) ?? [];
      const briefingIds =
        result.briefing?.items.flatMap((i) => i.eventIds ?? []) ?? [];

      set((s) => ({
        sending: false,
        events: result.events,
        briefing: result.briefing ?? s.briefing,
        highlightedIds: [...new Set([...highlight, ...briefingIds])],
        messages: [
          ...s.messages,
          { id: nextMsgId(), role: 'assistant', content: result.reply },
        ],
      }));

      const created = result.actions.filter((a) => a.type === 'created');
      for (const action of created) {
        const event = action.eventId
          ? result.events.find((e) => e.id === action.eventId)
          : undefined;
        get().pushToast(
          event
            ? `Added “${event.title}” to your calendar`
            : action.message || 'Event added',
        );
      }

      const deleted = result.actions.filter((a) => a.type === 'deleted');
      if (deleted.length) {
        get().pushToast(
          deleted.length === 1
            ? deleted[0].message
            : `Updated calendar (${deleted.length} changes)`,
        );
      }

      await get().refreshUndoState();
    } catch (e) {
      set((s) => ({
        sending: false,
        messages: [
          ...s.messages,
          {
            id: nextMsgId(),
            role: 'assistant',
            content:
              e instanceof Error
                ? `Something went wrong: ${e.message}`
                : 'Something went wrong talking to the assistant.',
          },
        ],
      }));
    }
  },

  async createEvent(input) {
    const { event } = await api.createEvent(input);
    set((s) => ({
      events: [...s.events, event].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
      ),
      highlightedIds: [event.id],
    }));
    get().pushToast(`Added “${event.title}” to your calendar`);
    await get().refreshUndoState();
  },

  async deleteEvent(id) {
    await api.deleteEvent(id);
    set((s) => ({
      events: s.events.filter((e) => e.id !== id),
      selectedEventId: s.selectedEventId === id ? null : s.selectedEventId,
    }));
    get().pushToast('Event cancelled');
    await get().refreshUndoState();
  },

  async undo() {
    try {
      const { events, canUndo } = await api.undo();
      set({
        events,
        canUndo,
        highlightedIds: [],
        selectedEventId: null,
      });
      get().pushToast('Undid last calendar change');
    } catch {
      get().pushToast('Nothing to undo');
      set({ canUndo: false });
    }
  },

  async resetDemo() {
    const { events } = await api.resetDemo();
    set({
      events,
      highlightedIds: [],
      selectedEventId: null,
      briefing: null,
      canUndo: false,
      messages: [
        {
          id: nextMsgId(),
          role: 'assistant',
          content:
            'Demo week reset. Try briefing, focus protect, decline soft meetings, or ⌘/Ctrl+K.',
        },
      ],
    });
  },
}));
