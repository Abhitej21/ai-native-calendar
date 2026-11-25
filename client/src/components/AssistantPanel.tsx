import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useCalendarStore } from '../store';

const SUGGESTIONS = [
  'Brief me on today',
  'Protect 2 hours of focus tomorrow morning',
  'Move my 1:1 with Priya to Friday afternoon',
  'Decline soft meetings today',
  'Resolve conflicts today',
];

export function AssistantPanel() {
  const messages = useCalendarStore((s) => s.messages);
  const sending = useCalendarStore((s) => s.sending);
  const sendMessage = useCalendarStore((s) => s.sendMessage);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = draft;
    setDraft('');
    void sendMessage(text);
  }

  return (
    <aside className="flex h-full min-h-0 w-full flex-col rounded-2xl border border-line bg-white/80 shadow-sm backdrop-blur lg:w-[380px] lg:shrink-0">
      <header className="border-b border-line px-5 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sea">
          Assistant
        </div>
        <h2 className="font-display text-2xl text-ink">Pulse</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Calendar OS for a busy business day — brief, protect, reshuffle.
        </p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[95%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'ml-auto bg-sea text-white'
                : 'bg-paper-2 text-ink'
            }`}
          >
            {m.content}
          </div>
        ))}
        {sending ? (
          <div className="w-fit rounded-2xl bg-paper-2 px-3.5 py-2.5 text-sm text-ink-muted">
            Thinking…
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-line px-4 py-3">
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={sending}
              onClick={() => void sendMessage(s)}
              className="rounded-full border border-line bg-paper px-3 py-1.5 text-left text-[12px] text-ink transition hover:border-sea hover:bg-sea-soft disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form onSubmit={onSubmit} className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Ask Pulse…"
            className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none ring-sea focus:ring-2"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-white transition hover:bg-sea disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </aside>
  );
}
