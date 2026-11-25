import { useEffect, useMemo, useState } from 'react';
import { AssistantPanel } from './components/AssistantPanel';
import { CreateEventModal } from './components/CreateEventModal';
import { DateJumpPicker } from './components/DateJumpPicker';
import { DayHealth } from './components/DayHealth';
import { EventDetail } from './components/EventDetail';
import { ToastHost } from './components/ToastHost';
import { WeekView } from './components/WeekView';
import { exportDayAgenda } from './lib/agenda';
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
  const rescheduleEvent = useCalendarStore((s) => s.rescheduleEvent);
  const resetDemo = useCalendarStore((s) => s.resetDemo);
  const sendMessage = useCalendarStore((s) => s.sendMessage);
  const undo = useCalendarStore((s) => s.undo);
  const pushToast = useCalendarStore((s) => s.pushToast);

  const [anchor, setAnchor] = useState(() => new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const days = useMemo(() => getWeekDays(anchor), [anchor]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
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

  return (
    <div className="mx-auto flex h-full max-w-[1400px] flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sea">
            Google Calendar
          </div>
          <h1 className="font-display text-4xl tracking-wide text-ink md:text-5xl">
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
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-muted transition hover:border-sea/40 hover:text-ink"
            title="Previous week"
          >
            ← Prev
          </button>
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className="rounded-lg border border-sea/40 bg-sea-soft px-3.5 py-2 text-sm font-medium text-sea transition hover:border-sea hover:bg-sea hover:text-white"
            title="Jump to this week"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setAnchor(shiftWeek(days, 1))}
            className="rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink-muted transition hover:border-sea/40 hover:text-ink"
            title="Next week"
          >
            Next →
          </button>
          <DateJumpPicker value={anchor} onChange={setAnchor} />
          <span className="px-2 text-sm font-medium text-ink">
            {weekLabel(days)}
          </span>
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
        onExportAgenda={() => {
          void exportDayAgenda(events).then((result) => {
            pushToast(
              result === 'copied-and-downloaded'
                ? 'Agenda downloaded and copied to clipboard'
                : 'Agenda downloaded',
            );
          });
        }}
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
              onReschedule={rescheduleEvent}
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
      <ToastHost />
    </div>
  );
}
