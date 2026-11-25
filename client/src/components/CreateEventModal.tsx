import { addHours, formatISO, setHours, setMinutes, startOfDay } from 'date-fns';
import { useState, type FormEvent } from 'react';
import type { CalendarEvent, EventKind } from '../types';

interface CreateEventModalProps {
  open: boolean;
  onClose: () => void;
  onCreate: (input: Omit<CalendarEvent, 'id'>) => Promise<void>;
}

export function CreateEventModal({
  open,
  onClose,
  onCreate,
}: CreateEventModalProps) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<EventKind>('meeting');
  const [date, setDate] = useState(() =>
    formatISO(startOfDay(new Date()), { representation: 'date' }),
  );
  const [startTime, setStartTime] = useState('10:00');
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const [hh, mm] = startTime.split(':').map(Number);
      const start = setMinutes(
        setHours(startOfDay(new Date(`${date}T00:00:00`)), hh),
        mm,
      );
      const end = addHours(start, 1);
      await onCreate({
        title: title.trim(),
        start: start.toISOString(),
        end: end.toISOString(),
        kind,
        priority: kind === 'focus' ? 'hard' : 'hard',
      });
      setTitle('');
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-line bg-paper p-5 shadow-xl"
      >
        <h3 className="font-display text-2xl text-ink">New event</h3>
        <p className="mt-1 text-sm text-ink-muted">
          Manual path — Pulse can also create events from chat.
        </p>

        <label className="mt-4 block text-sm font-medium text-ink">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 outline-none ring-sea focus:ring-2"
            required
          />
        </label>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-ink">
            Date
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 outline-none ring-sea focus:ring-2"
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Start
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 outline-none ring-sea focus:ring-2"
            />
          </label>
        </div>

        <label className="mt-3 block text-sm font-medium text-ink">
          Kind
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as EventKind)}
            className="mt-1 w-full rounded-xl border border-line bg-white px-3 py-2 outline-none ring-sea focus:ring-2"
          >
            <option value="meeting">Meeting</option>
            <option value="focus">Focus</option>
            <option value="personal">Personal</option>
            <option value="hold">Hold</option>
          </select>
        </label>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-sm text-ink-muted hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-sea px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}
