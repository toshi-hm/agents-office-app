import type { Agent } from '@agents-office-app/domain';

export function Avatar({ agent, size = 'md' }: { agent: Agent; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span
      className={`avatar avatar--${size}`}
      style={{ background: agent.avatarColor }}
      aria-hidden="true"
    >
      {[...agent.displayName][0] ?? '?'}
    </span>
  );
}
