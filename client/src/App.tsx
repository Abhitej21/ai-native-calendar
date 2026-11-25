import { useEffect, useMemo, useState } from 'react';
import { AssistantPanel } from './components/AssistantPanel';
import {
  CommandPalette,
  type CommandItem,
} from './components/CommandPalette';
import { CreateEventModal } from './components/CreateEventModal';
import { DayHealth } from './components/DayHealth';
import { EventDetail } from './components/EventDetail';
import { ToastHost } from './components/ToastHost';
import { WeekView } from './components/WeekView';
import { getWeekDays, shiftWeek, weekLabel } from './lib/calendar';
import { useCalendarStore } from './store';

export default function App() {
  const events = useCalendarStore((s) => s.events);
  const highlightedIds = useCalendarStore((s) => s.highlightedIds);
  const selectedEventId = useCalendarStore((s) => s.selectedEventId);
  const loading = useCalendarStore((s) => s.loading);
  const error = useCalendarStore((s) => s.error);
  const sending = useCalendarStore((s) => s.sending);
  const canUndo = useCalendarStore((s) => s.canUndo);
  const loadEvents = useCalendarStore((s) => s.loadEvents);
  const selectEvent = useCalendarStore((s) => s.selectEvent);
  const createEvent = useCalendarStore((s) => s.createEvent);
  const deleteEvent = useCalendarStore((s) => s.deleteEvent);
  const resetDemo = useCalendarStore((s) => s.resetDemo);
  const sendMessage = useCalendarStore((s) => s.sendMessage);
  const undo = useCalendarStore((s) => s.undo);

  const [anchor, setAnchor] = useState(() => new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const days = useMemo(() => getWeekDays(anchor), [anchor]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (meta && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        void undo();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo]);

  const selected = events.find((e) => e.id === selectedEventId) ?? null;

  const commands: CommandItem[] = useMemo(
    () => [
      {
        id: 'brief',
        label: 'Brief me on today',
        hint: 'Assistant',
        run: () => void sendMessage('Brief me on today'),
      },
      {
        id: 'focus',
        label: 'Protect 2 hours of focus tomorrow morning',
        hint: 'Assistant',
        run: () =>
          void sendMessage('Protect 2 hours of focus tomorrow morning'),
      },
      {
        id: 'move-priya',
        label: 'Move 1:1 with Priya to Friday afternoon',
        hint: 'Assistant',
        run: () =>
          void sendMessage('Move my 1:1 with Priya to Friday afternoon'),
      },
      {
        id: 'decline-soft',
        label: 'Decline soft meetings today',
        hint: 'Quick fix',
        run: () => void sendMessage('Decline soft meetings today'),
      },
      {
        id: 'resolve',
        label: 'Resolve conflicts today',
        hint: 'Quick fix',
        run: () => void sendMessage('Resolve conflicts today'),
      },
      {
        id: 'slots',
        label: 'Find free slots tomorrow',
        hint: 'Assistant',
        run: () => void sendMessage('Find free slots tomorrow'),
      },
      {
        id: 'new-event',
        label: 'Create event…',
        hint: 'Manual',
        run: () => setCreateOpen(true),
      },
      {
        id: 'undo',
        label: 'Undo last change',
        hint: '⌘/Ctrl+Z',
        run: () => void undo(),
      },
      {
        id: 'reset',
        label: 'Reset demo week',
        hint: 'Seed',
        run: () => void resetDemo(),
      },
    ],
    [sendMessage, undo, resetDemo],
  );

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sea">
            Google Calendar · reimagined
          </div>
          <h1 className="font-display text-4xl tracking-tight text-ink md:text-5xl">
            Pulse
          </h1>
          <p className="mt-1 max-w-xl text-sm text-ink-muted md:text-base">
            AI-native calendar for business users — Abhiteja&apos;s week.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setAnchor(shiftWeek(days, -1))}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setAnchor(shiftWeek(days, 1))}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm"
          >
            Next →
          </button>
          <span className="px-2 text-sm font-medium text-ink">
            {weekLabel(days)}
          </span>
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-muted hover:text-ink"
            title="Command palette"
          >
            ⌘K
          </button>
          <button
            type="button"
            disabled={!canUndo}
            onClick={() => void undo()}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm disabled:opacity-40"
            title="Undo last change (⌘/Ctrl+Z)"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-ink px-3 py-2 text-sm font-medium text-white hover:bg-sea"
          >
            + Event
          </button>
          <button
            type="button"
            onClick={() => void resetDemo()}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-muted hover:text-ink"
            title="Reseed Abhiteja’s week for a clean demo run"
          >
            Reset demo
          </button>
        </div>
      </header>

      {error ? (
        <div className="rounded-xl border border-coral/40 bg-coral-soft px-4 py-3 text-sm text-coral">
          {error} — is the API running on port 3001?
        </div>
      ) : null}

      <DayHealth
        events={events}
        busy={sending}
        onDeclineSoft={() => void sendMessage('Decline soft meetings today')}
        onResolveConflicts={() => void sendMessage('Resolve conflicts today')}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
        <main className="flex min-h-[420px] min-w-0 flex-1 flex-col gap-3">
          {loading && !events.length ? (
            <div className="flex flex-1 items-center justify-center rounded-2xl border border-line bg-white/60 text-ink-muted">
              Loading calendar…
            </div>
          ) : (
            <WeekView
              days={days}
              events={events}
              highlightedIds={highlightedIds}
              selectedEventId={selectedEventId}
              onSelect={selectEvent}
            />
          )}
          <EventDetail
            event={selected}
            onClose={() => selectEvent(null)}
            onDelete={(id) => {
              void deleteEvent(id);
            }}
          />
        </main>
        <AssistantPanel />
      </div>

      <CreateEventModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createEvent}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />
      <ToastHost />
    </div>
  );
}
