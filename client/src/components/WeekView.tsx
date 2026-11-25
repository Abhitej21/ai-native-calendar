import { format, isToday } from 'date-fns';
import {
  HOUR_END,
  HOUR_START,
  PX_PER_HOUR,
  eventHeightPx,
  eventTopPx,
  eventsOnDay,
  formatEventTime,
  kindStyles,
} from '../lib/calendar';
import type { CalendarEvent } from '../types';

interface WeekViewProps {
  days: Date[];
  events: CalendarEvent[];
  highlightedIds: string[];
  selectedEventId: string | null;
  onSelect: (id: string) => void;
}

const hours = Array.from(
  { length: HOUR_END - HOUR_START },
  (_, i) => HOUR_START + i,
);

export function WeekView({
  days,
  events,
  highlightedIds,
  selectedEventId,
  onSelect,
}: WeekViewProps) {
  const gridHeight = (HOUR_END - HOUR_START) * PX_PER_HOUR;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-line bg-white/70 shadow-sm backdrop-blur">
      <div className="grid grid-cols-[56px_repeat(5,minmax(0,1fr))] border-b border-line">
        <div className="border-r border-line" />
        {days.map((day) => {
          const today = isToday(day);
          return (
            <div
              key={day.toISOString()}
              className={`border-r border-line px-2 py-3 text-center last:border-r-0 ${
                today ? 'bg-sea-soft/60' : ''
              }`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {format(day, 'EEE')}
              </div>
              <div
                className={`mt-1 font-display text-2xl ${
                  today ? 'text-sea' : 'text-ink'
                }`}
              >
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div
          className="grid grid-cols-[56px_repeat(5,minmax(0,1fr))]"
          style={{ height: gridHeight }}
        >
          <div className="relative border-r border-line">
            {hours.map((h) => {
              const isFirst = h === HOUR_START;
              return (
                <div
                  key={h}
                  className={`absolute right-2 text-[11px] leading-none text-ink-muted ${
                    isFirst ? '' : '-translate-y-1/2'
                  }`}
                  style={{
                    // First hour sits just below the top edge so it isn't clipped by overflow
                    top: isFirst ? 6 : (h - HOUR_START) * PX_PER_HOUR,
                  }}
                >
                  {format(new Date().setHours(h, 0, 0, 0), 'ha')}
                </div>
              );
            })}
          </div>

          {days.map((day) => {
            const dayEvents = eventsOnDay(events, day);
            return (
              <div
                key={day.toISOString()}
                className={`relative border-r border-line last:border-r-0 ${
                  isToday(day) ? 'bg-sea-soft/20' : ''
                }`}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute inset-x-0 border-t border-line/70"
                    style={{ top: (h - HOUR_START) * PX_PER_HOUR }}
                  />
                ))}

                {dayEvents.map((event) => (
                  <EventBlock
                    key={event.id}
                    event={event}
                    highlighted={highlightedIds.includes(event.id)}
                    selected={selectedEventId === event.id}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function EventBlock({
  event,
  highlighted,
  selected,
  onSelect,
}: {
  event: CalendarEvent;
  highlighted: boolean;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const styles = kindStyles(event.kind);
  return (
    <button
      type="button"
      onClick={() => onSelect(event.id)}
      className={`absolute inset-x-1 z-10 overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left transition ${styles.bg} ${styles.border} ${
        highlighted || selected
          ? 'ring-2 ring-sea ring-offset-1 shadow-md'
          : 'hover:shadow-sm'
      }`}
      style={{
        top: eventTopPx(event),
        height: eventHeightPx(event),
      }}
      title={`${event.title} · ${formatEventTime(event)}`}
    >
      <div className={`truncate text-[11px] font-semibold ${styles.text}`}>
        {event.title}
        {event.priority === 'soft' ? (
          <span className="ml-1 font-normal opacity-70">· soft</span>
        ) : null}
      </div>
      {eventHeightPx(event) > 36 ? (
        <div className="truncate text-[10px] text-ink-muted">
          {formatEventTime(event)}
        </div>
      ) : null}
    </button>
  );
}
