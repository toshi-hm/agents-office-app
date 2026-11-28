import { Play } from 'lucide-react';
import type { OfficeActions } from '../actions.ts';
import { ConfirmButton } from '../atoms/ConfirmButton.tsx';

export function DemoCard({ actions }: { actions: OfficeActions }) {
  const busy = actions.isBusy('demo');
  return (
    <section className="card demo-card">
      <h3 className="section-title">デモで試す</h3>
      <p>実際のCLIを使わずに、社員が席に着いて働く様子を確認できます。</p>
      <div className="button-row">
        <button
          type="button"
          className="button button--primary"
          disabled={busy}
          onClick={() => actions.runDemo('kickoff')}
        >
          <Play size={13} aria-hidden="true" />
          業務を始める
        </button>
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={() => actions.runDemo('approval')}
        >
          承認を試す
        </button>
      </div>
      <ConfirmButton
        className="link link--danger"
        confirmLabel="実行中の仕事をすべて停止する"
        disabled={busy}
        onConfirm={() => actions.runDemo('stop_all')}
      >
        すべての仕事を停止…
      </ConfirmButton>
    </section>
  );
}
