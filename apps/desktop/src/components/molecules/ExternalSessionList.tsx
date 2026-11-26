import { TerminalSquare } from 'lucide-react';
import type { ExternalSession } from '@agents-office-app/domain';
import { ExternalSessionItem } from './ExternalSessionItem.tsx';

export function ExternalSessionList({ sessions }: { sessions: readonly ExternalSession[] }) {
  return (
    <section className="team external">
      <h2 className="section-title">
        <TerminalSquare size={13} aria-hidden="true" />
        このMacで動作中のCLI
      </h2>
      <ul className="list">
        {sessions.map((session) => (
          <ExternalSessionItem key={session.pid} session={session} />
        ))}
      </ul>
    </section>
  );
}
