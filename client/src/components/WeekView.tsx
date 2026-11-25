import { format, isToday } from 'date-fns';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  HOUR_END,
  HOUR_START,
  PX_PER_HOUR,
  eventDurationMinutes,
  eventHeightPx,
  eventTopPx,
  eventsOnDay,
  formatEventTime,
  kindStyles,
  snapTopPx,
  topPxToRange,
} from '../lib/calendar';
import type { CalendarEvent } from '../types';

interface WeekViewProps {
  days: Date[];
  events: CalendarEvent[];
  highlightedIds: string[];
  selectedEventId: string | null;
  onSelect: (id: string) => void;
  onReschedule: (id: string, start: string, end: string) => Promise<void>;
}

interface DragState {
  event: CalendarEvent;
  durationMinutes: number;
  dayIndex: number;
  topPx: number;
  grabOffsetY: number;
  startClientX: number;
  startClientY: number;
  moved: boolean;
  pointerId: number;
}

const hours = Array.from(
  { length: HOUR_END - HOUR_START },
  (_, i) => HOUR_START + i,
);

const DRAG_THRESHOLD_PX = 5;

export function WeekView({
  days,
  events,
  highlightedIds,
  selectedEventId,
  onSelect,
  onReschedule,
}: WeekViewProps) {
  const gridHeight = (HOUR_END - HOUR_START) * PX_PER_HOUR;
  const bodyRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [drag, setDrag] = useState<DragState | null>(null);
  const dragRef = useRef<DragState | null>(null);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  const resolveDayIndex = useCallback((clientX: number) => {
    const cols = dayRefs.current;
    for (let i = 0; i < cols.length; i++) {
      const el = cols[i];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (clientX >= rect.left && clientX <= rect.right) return i;
    }
    const first = cols[0]?.getBoundingClientRect();
    const last = cols[cols.length - 1]?.getBoundingClientRect();
    if (first && clientX < first.left) return 0;
    if (last && clientX > last.right) return Math.max(0, cols.length - 1);
    return 0;
  }, []);

  const resolveTopPx = useCallback(
    (clientY: number, grabOffsetY: number, durationMinutes: number) => {
      const body = bodyRef.current;
      if (!body) return 0;
      const rect = body.getBoundingClientRect();
      const raw = clientY - rect.top - grabOffsetY + body.scrollTop;
      return snapTopPx(raw, durationMinutes);
    },
    [],
  );

  useEffect(() => {
    if (!drag) return;

    function onPointerMove(e: PointerEvent) {
      const current = dragRef.current;
      if (!current || e.pointerId !== current.pointerId) return;

      const dayIndex = resolveDayIndex(e.clientX);
      const topPx = resolveTopPx(
        e.clientY,
        current.grabOffsetY,
        current.durationMinutes,
      );
      const dist = Math.hypot(
        e.clientX - current.startClientX,
        e.clientY - current.startClientY,
      );
      const moved = current.moved || dist > DRAG_THRESHOLD_PX;

      setDrag({
        ...current,
        dayIndex,
        topPx,
        moved,
      });
    }

    async function onPointerUp(e: PointerEvent) {
      const current = dragRef.current;
      if (!current || e.pointerId !== current.pointerId) return;

      const dayIndex = resolveDayIndex(e.clientX);
      const topPx = resolveTopPx(
        e.clientY,
        current.grabOffsetY,
        current.durationMinutes,
      );
      const dist = Math.hypot(
        e.clientX - current.startClientX,
        e.clientY - current.startClientY,
      );
      const moved = current.moved || dist > DRAG_THRESHOLD_PX;

      setDrag(null);
      dragRef.current = null;

      if (!moved) {
        onSelect(current.event.id);
        return;
      }

      const day = days[dayIndex] ?? days[0];
      const { start, end } = topPxToRange(
        day,
        topPx,
        current.durationMinutes,
      );
      if (start === current.event.start && end === current.event.end) return;
      await onReschedule(current.event.id, start, end);
    }

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [drag, days, onReschedule, onSelect, resolveDayIndex, resolveTopPx]);

  function beginDrag(
    event: CalendarEvent,
    e: ReactPointerEvent,
    dayIndex: number,
  ) {
    if (e.button !== 0) return;
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const next: DragState = {
      event,
      durationMinutes: eventDurationMinutes(event),
      dayIndex,
      topPx: eventTopPx(event),
      grabOffsetY: e.clientY - rect.top,
      startClientX: e.clientX,
      startClientY: e.clientY,
      moved: false,
      pointerId: e.pointerId,
    };
    dragRef.current = next;
    setDrag(next);
  }

  const ghostRange =
    drag && days[drag.dayIndex]
      ? topPxToRange(days[drag.dayIndex], drag.topPx, drag.durationMinutes)
      : null;

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

      <div className="min-h-0 flex-1 overflow-auto" ref={bodyRef}>
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
                    top: isFirst ? 6 : (h - HOUR_START) * PX_PER_HOUR,
                  }}
                >
                  {format(new Date().setHours(h, 0, 0, 0), 'ha')}
                </div>
              );
            })}
          </div>

          {days.map((day, dayIndex) => {
            const dayEvents = eventsOnDay(events, day);
            return (
              <div
                key={day.toISOString()}
                ref={(el) => {
                  dayRefs.current[dayIndex] = el;
                }}
                className={`relative border-r border-line last:border-r-0 ${
                  isToday(day) ? 'bg-sea-soft/20' : ''
                } ${drag ? 'cursor-grabbing' : ''}`}
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
                    dragging={drag?.event.id === event.id}
                    onPointerDown={(e) => beginDrag(event, e, dayIndex)}
                  />
                ))}

                {drag &&
                drag.moved &&
                drag.dayIndex === dayIndex &&
                ghostRange ? (
                  <EventBlock
                    event={{
                      ...drag.event,
                      start: ghostRange.start,
                      end: ghostRange.end,
                    }}
                    highlighted
                    selected
                    ghost
                    topOverride={drag.topPx}
                    onPointerDown={() => undefined}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div className="border-t border-line px-3 py-1.5 text-[11px] text-ink-muted">
        Drag an event to reschedule · snaps to 15 minutes · drop on another day
        to move
      </div>
    </div>
  );
}

function EventBlock({
  event,
  highlighted,
  selected,
  dragging,
  ghost,
  topOverride,
  onPointerDown,
}: {
  event: CalendarEvent;
  highlighted: boolean;
  selected: boolean;
  dragging?: boolean;
  ghost?: boolean;
  topOverride?: number;
  onPointerDown: (e: ReactPointerEvent) => void;
}) {
  const styles = kindStyles(event.kind);
  const top = topOverride ?? eventTopPx(event);
  const height =
    topOverride != null
      ? Math.max((eventDurationMinutes(event) / 60) * PX_PER_HOUR, 22)
      : eventHeightPx(event);

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDown}
      className={`absolute inset-x-1 z-10 overflow-hidden rounded-md border-l-4 px-1.5 py-1 text-left select-none ${styles.bg} ${styles.border} ${
        ghost
          ? 'pointer-events-none z-20 opacity-90 shadow-lg ring-2 ring-sea'
          : dragging
            ? 'opacity-25'
            : highlighted || selected
              ? 'ring-2 ring-sea ring-offset-1 shadow-md'
              : 'hover:shadow-sm'
      } ${ghost || dragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ top, height }}
      title={`${event.title} · ${formatEventTime(event)} · drag to reschedule`}
    >
      <div className={`truncate text-[11px] font-semibold ${styles.text}`}>
        {event.title}
        {event.priority === 'soft' ? (
          <span className="ml-1 font-normal opacity-70">· soft</span>
        ) : null}
      </div>
      {height > 36 ? (
        <div className="truncate text-[10px] text-ink-muted">
          {formatEventTime(event)}
        </div>
      ) : null}
    </div>
  );
}
