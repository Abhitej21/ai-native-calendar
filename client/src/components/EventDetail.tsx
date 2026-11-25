import { formatEventTime, kindStyles } from '../lib/calendar';
import type { CalendarEvent } from '../types';

interface EventDetailProps {
  event: CalendarEvent | null;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export function EventDetail({ event, onClose, onDelete }: EventDetailProps) {
  if (!event) return null;
  const styles = kindStyles(event.kind);

  return (
    <div className="rounded-2xl border border-line bg-white/90 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className={`text-[11px] font-semibold uppercase tracking-wide ${styles.text}`}>
            {event.kind}
            {event.priority === 'soft' ? ' · soft' : ''}
          </div>
          <h3 className="mt-1 font-display text-xl text-ink">{event.title}</h3>
          <p className="mt-1 text-sm text-ink-muted">{formatEventTime(event)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-ink-muted hover:text-ink"
        >
          Close
        </button>
      </div>
      {event.description ? (
        <p className="mt-3 text-sm text-ink">{event.description}</p>
      ) : null}
      {event.attendees?.length ? (
        <p className="mt-2 text-sm text-ink-muted">
          With {event.attendees.join(', ')}
        </p>
      ) : null}
      {event.location ? (
        <p className="mt-1 text-sm text-ink-muted">{event.location}</p>
      ) : null}
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => onDelete(event.id)}
          className="rounded-lg border border-coral/40 bg-coral-soft px-3 py-1.5 text-sm text-coral"
        >
          Cancel event
        </button>
      </div>
    </div>
  );
}
