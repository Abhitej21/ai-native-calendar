import { useEffect, useMemo, useState } from 'react';

export interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export function CommandPalette({ open, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  if (!open) return null;

  function run(item: CommandItem) {
    onClose();
    item.run();
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center bg-ink/40 p-4 pt-[12vh]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-line bg-paper shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Command palette"
      >
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, filtered.length - 1));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            }
            if (e.key === 'Enter' && filtered[active]) {
              e.preventDefault();
              run(filtered[active]);
            }
          }}
          placeholder="Type a command… (Esc to close)"
          className="w-full border-b border-line bg-transparent px-4 py-3.5 text-sm outline-none"
        />
        <ul className="max-h-72 overflow-auto p-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-ink-muted">No matches</li>
          ) : (
            filtered.map((item, i) => (
              <li key={item.id}>
                <button
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => run(item)}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm ${
                    i === active ? 'bg-sea-soft text-ink' : 'text-ink hover:bg-paper-2'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.hint ? (
                    <span className="text-[11px] text-ink-muted">{item.hint}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="border-t border-line px-4 py-2 text-[11px] text-ink-muted">
          ⌘/Ctrl+K open · ↑↓ navigate · Enter run
        </div>
      </div>
    </div>
  );
}
