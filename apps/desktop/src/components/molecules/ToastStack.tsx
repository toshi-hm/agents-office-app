import type { Toast } from '../../hooks/useToasts.ts';

/** Clicking a toast dismisses it and, when it names an agent, selects that agent. */
export function ToastStack({
  toasts,
  onSelectAgent,
  onDismiss,
}: {
  toasts: readonly Toast[];
  onSelectAgent: (agentId: string) => void;
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className="toast"
          data-tone={toast.tone}
          onClick={() => {
            if (toast.agentId) onSelectAgent(toast.agentId);
            onDismiss(toast.id);
          }}
        >
          <strong>{toast.title}</strong>
          {toast.body && <span>{toast.body}</span>}
        </button>
      ))}
    </div>
  );
}
