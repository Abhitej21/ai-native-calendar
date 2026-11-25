import { computeDayHealth } from '../lib/dayHealth';
import type { CalendarEvent } from '../types';

interface DayHealthProps {
  events: CalendarEvent[];
  onDeclineSoft: () => void;
  onResolveConflicts: () => void;
  busy?: boolean;
}

export function DayHealth({
  events,
  onDeclineSoft,
  onResolveConflicts,
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
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
            Today · Day health
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
