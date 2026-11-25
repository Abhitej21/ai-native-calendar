import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useCalendarStore } from '../store';

const SUGGESTIONS = [
  'Brief me on today',
  'Protect 2 hours of focus tomorrow morning',
  'Move my 1:1 with Priya to Friday afternoon',
  'Decline soft meetings today',
  'Resolve conflicts today',
];

function AgentAvatar({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-10 w-10 text-xs';
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-sea font-semibold tracking-wide text-white shadow-sm ${dim}`}
      aria-hidden
    >
      P
    </div>
  );
}

export function AssistantPanel() {
  const messages = useCalendarStore((s) => s.messages);
  const sending = useCalendarStore((s) => s.sending);
  const sendMessage = useCalendarStore((s) => s.sendMessage);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const usedSuggestions = new Set(
    messages.filter((m) => m.role === 'user').map((m) => m.content.trim()),
  );

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
    <aside className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm lg:w-[380px] lg:shrink-0">
      <header className="flex items-center gap-3 border-b border-line bg-gradient-to-b from-sea-soft/50 to-white px-4 py-3.5">
        <div className="relative">
          <AgentAvatar />
          <span
            className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-focus agent-online"
            title="Online"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-xl leading-none tracking-wide text-ink">
              Pulse
            </h2>
            <span className="rounded-full bg-sea-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sea">
              Agent
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-ink-muted">
            {sending ? 'Working on your calendar…' : 'Online · ready to help'}
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto bg-paper/40 px-3 py-4">
        {messages.map((m) =>
          m.role === 'assistant' ? (
            <div key={m.id} className="flex items-end gap-2">
              <AgentAvatar size="sm" />
              <div className="min-w-0 max-w-[85%]">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                  Pulse
                </div>
                <div className="whitespace-pre-wrap rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-2.5 text-sm leading-relaxed text-ink shadow-sm">
                  {m.content}
                </div>
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%]">
                <div className="mb-1 text-right text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                  You
                </div>
                <div className="whitespace-pre-wrap rounded-2xl rounded-br-md bg-sea px-3.5 py-2.5 text-sm leading-relaxed text-white shadow-sm">
                  {m.content}
                </div>
              </div>
            </div>
          ),
        )}

        {sending ? (
          <div className="flex items-end gap-2">
            <AgentAvatar size="sm" />
            <div className="rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-3 shadow-sm">
              <div className="typing-dots flex items-center gap-1">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-line bg-white px-3 py-3">
        <div className="mb-3">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-muted">
            Suggested for you
          </div>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => {
              const used = usedSuggestions.has(s);
              return (
                <button
                  key={s}
                  type="button"
                  disabled={sending}
                  onClick={() => void sendMessage(s)}
                  className={`rounded-full border px-2.5 py-1 text-left text-[11px] transition disabled:opacity-50 ${
                    used
                      ? 'border-line bg-paper text-ink-muted hover:border-sea/40 hover:bg-sea-soft/40 hover:text-sea'
                      : 'border-sea/25 bg-sea-soft/60 text-sea hover:border-sea hover:bg-sea-soft'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>

        <form
          onSubmit={onSubmit}
          className="flex items-center gap-2 rounded-2xl border border-line bg-paper px-2 py-1.5 focus-within:border-sea focus-within:ring-2 focus-within:ring-sea/20"
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message Pulse…"
            className="min-w-0 flex-1 border-0 bg-transparent px-2 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="rounded-xl bg-sea px-3.5 py-2 text-sm font-medium text-white transition hover:bg-ink disabled:opacity-40"
          >
            Send
          </button>
        </form>
      </div>
    </aside>
  );
}
