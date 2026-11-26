import { ShieldAlert } from 'lucide-react';

/** Beckons from the mini bar while someone is waiting for approval. */
export function MiniApprovalButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      type="button"
      className="mini__alert"
      title="承認を待っている社員を表示"
      onClick={onClick}
    >
      <ShieldAlert size={13} aria-hidden="true" />
      承認 {count}
    </button>
  );
}
