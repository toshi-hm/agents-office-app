import type { ProviderKind } from '@agents-office-app/domain';

export const PROVIDER_COLORS: Readonly<Record<ProviderKind, string>> = Object.freeze({
  claude: '#d97757',
  codex: '#12a37f',
  agy: '#4c7cf0',
  demo: '#9a7bd0',
});
