import { useCalendarStore } from '../store';

export function ToastHost() {
  const toasts = useCalendarStore((s) => s.toasts);
  const dismissToast = useCalendarStore((s) => s.dismissToast);

  if (!toasts.length) return null;

  return (
    <div
      className="pointer-events-none fixed bottom-5 right-5 z-[100] flex max-w-sm flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="pointer-events-auto flex items-start gap-3 rounded-xl border border-sea/30 bg-ink px-4 py-3 text-sm text-white shadow-lg animate-[toast-in_0.25s_ease-out]"
        >
          <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-sea text-[11px] font-bold">
            ✓
          </div>
          <div className="min-w-0 flex-1 leading-snug">{toast.message}</div>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="shrink-0 text-white/60 hover:text-white"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
