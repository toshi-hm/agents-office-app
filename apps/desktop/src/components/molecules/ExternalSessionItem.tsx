import { PROVIDER_LABELS } from '@agents-office-app/domain';
import type { ExternalSession } from '@agents-office-app/domain';
import { shortenPath } from '../../lib/view/format-utils.ts';

/** A CLI running on this Mac that the office did not start. */
export function ExternalSessionItem({ session }: { session: ExternalSession }) {
  return (
    <li className="external__item" title={session.command}>
      <span className="row__title">{PROVIDER_LABELS[session.provider]}</span>
      <span className="row__meta">
        PID {session.pid}・{session.cwd ? shortenPath(session.cwd) : '場所は不明'}
      </span>
    </li>
  );
}
