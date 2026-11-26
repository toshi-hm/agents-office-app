import type { PushToast } from '../../hooks/useToasts.ts';
import type { RunAction } from '../../hooks/useActionRunner.ts';
import type { ApiClient } from '../api/http-client.ts';
import type { OfficeStore } from '../api/office-store.ts';
import type { TauriBridge } from '../tauri/types.ts';

/** What the factories of user actions need. */
export type ActionContext = Readonly<{
  api: ApiClient;
  store: OfficeStore;
  bridge: TauriBridge;
  run: RunAction;
  push: PushToast;
  select: (agentId: string | null) => void;
}>;
