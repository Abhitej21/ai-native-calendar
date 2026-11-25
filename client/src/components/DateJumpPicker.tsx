import { format, startOfDay } from 'date-fns';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

interface DateJumpPickerProps {
  value: Date;
  onChange: (date: Date) => void;
}

function CalendarIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      <rect
        x="1.75"
        y="2.75"
        width="12.5"
        height="11.5"
        rx="2"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M1.75 6.25h12.5M5 1.5v2.75M11 1.5v2.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="5.5" cy="9.25" r="0.9" fill="currentColor" />
      <circle cx="8" cy="9.25" r="0.9" fill="currentColor" />
      <circle cx="10.5" cy="9.25" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function DateJumpPicker({ value, onChange }: DateJumpPickerProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function place() {
      const btn = buttonRef.current;
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const width = 320;
      const left = Math.min(
        rect.left,
        Math.max(8, window.innerWidth - width - 8),
      );
      setCoords({ top: rect.bottom + 8, left });
    }

    place();

    function onDoc(e: MouseEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || panelRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }

    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    // defer so the opening click doesn't immediately close
    const timer = window.setTimeout(() => {
      document.addEventListener('mousedown', onDoc);
    }, 0);

    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm select-none ${
          open
            ? 'border-sea text-sea ring-2 ring-sea/20'
            : 'border-line text-ink hover:border-sea hover:text-sea'
        }`}
        aria-label="Open calendar to jump to a date"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? titleId : undefined}
      >
        <span className={open ? 'text-sea' : 'text-ink-muted'}>
          <CalendarIcon />
        </span>
        <span className="font-medium">{format(value, 'dd MMM yyyy')}</span>
      </button>

      {open
        ? createPortal(
            <div
              ref={panelRef}
              id={titleId}
              className="pulse-daypicker fixed z-[200] rounded-2xl border border-line bg-white p-3 shadow-xl"
              style={{ top: coords.top, left: coords.left }}
              role="dialog"
              aria-label="Choose a date"
            >
              <DayPicker
                mode="single"
                weekStartsOn={1}
                selected={startOfDay(value)}
                defaultMonth={value}
                onSelect={(day) => {
                  if (!day) return;
                  onChange(startOfDay(day));
                  setOpen(false);
                }}
              />
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
