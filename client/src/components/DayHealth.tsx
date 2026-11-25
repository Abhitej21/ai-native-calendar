import { computeDayHealth } from '../lib/dayHealth';
import type { CalendarEvent } from '../types';

interface DayHealthProps {
  events: CalendarEvent[];
  onDeclineSoft: () => void;
  onResolveConflicts: () => void;
  onExportAgenda: () => void;
  busy?: boolean;
}

export function DayHealth({
  events,
  onDeclineSoft,
  onResolveConflicts,
  onExportAgenda,
  busy,
}: DayHealthProps) {
  const health = computeDayHealth(events);
  const barColor =
    health.label === 'Calm'
      ? 'bg-focus'
      : health.label === 'Busy'
        ? 'bg-coral'
        : 'bg-coral';

  return (
    <div className="rounded-2xl border border-line bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
              Today · Day health
            </div>
            <span className="group relative inline-flex">
              <button
                type="button"
                className="flex h-4 w-4 items-center justify-center rounded-full border border-line bg-paper text-[10px] font-semibold text-ink-muted transition hover:border-sea hover:bg-sea-soft hover:text-sea focus:outline-none focus-visible:ring-2 focus-visible:ring-sea/30"
                aria-label="What is Day Health?"
                aria-describedby="day-health-tooltip"
              >
                i
              </button>
              <span
                id="day-health-tooltip"
                role="tooltip"
                className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-64 origin-top-left rounded-xl border border-line bg-white p-3 text-left text-[11px] font-normal normal-case tracking-normal text-ink-muted opacity-0 shadow-lg transition duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
              >
                <span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-ink">
                  What this measures
                </span>
                A 0–100 score of how sustainable today looks — meeting load,
                schedule conflicts, soft (optional) invites, and whether you
                have protected focus time. Use the actions to decline soft
                meetings, clear conflicts, or export today’s agenda.
              </span>
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-3xl text-ink">{health.score}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                health.label === 'Calm'
                  ? 'bg-focus-soft text-focus'
                  : 'bg-coral-soft text-coral'
              }`}
            >
              {health.label}
            </span>
          </div>
          <p className="mt-1 max-w-md text-sm text-ink-muted">{health.tip}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onExportAgenda}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:border-sea hover:bg-sea-soft disabled:opacity-40"
            title="Download today’s agenda as text (also copies to clipboard)"
          >
            Export agenda
          </button>
          <button
            type="button"
            disabled={busy || health.softCount === 0}
            onClick={onDeclineSoft}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:border-sea hover:bg-sea-soft disabled:opacity-40"
          >
            Decline soft ({health.softCount})
          </button>
          <button
            type="button"
            disabled={busy || health.conflicts === 0}
            onClick={onResolveConflicts}
            className="rounded-lg border border-line bg-paper px-3 py-1.5 text-xs font-medium text-ink hover:border-sea hover:bg-sea-soft disabled:opacity-40"
          >
            Resolve conflicts ({health.conflicts})
          </button>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper-2">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${health.score}%` }}
        />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-ink-muted">
        <span>{health.meetingHours}h meetings</span>
        <span>{health.focusHours}h focus</span>
        <span>{health.conflicts} conflicts</span>
        <span>{health.softCount} soft</span>
      </div>
    </div>
  );
}
