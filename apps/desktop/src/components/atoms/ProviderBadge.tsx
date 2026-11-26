import { PROVIDER_LABELS } from '@agents-office-app/domain';
import type { ProviderKind } from '@agents-office-app/domain';
import { PROVIDER_COLORS } from '@agents-office-app/office-scene';
import { PROVIDER_SHORT } from '../../lib/view/options.ts';

export function ProviderBadge({ provider }: { provider: ProviderKind }) {
  return (
    <span className="provider-badge" title={PROVIDER_LABELS[provider]}>
      <span className="provider-badge__dot" style={{ background: PROVIDER_COLORS[provider] }} />
      {PROVIDER_SHORT[provider]}
    </span>
  );
}
