import { useMemo } from 'react';
import { buildOfficeLayout } from '../layout/build-layout.ts';
import { getLayoutSignature } from '../layout/layout-signature.ts';
import type { OfficeLayout, SceneMember, SceneTeam } from '../types.ts';

/** The room for this roster, or null when it cannot be laid out. */
export function useOfficeLayout(
  members: readonly SceneMember[],
  teams: readonly SceneTeam[],
): OfficeLayout | null {
  // Snapshots arrive constantly; only identity changes may rebuild the room.
  const signature = getLayoutSignature(members, teams);
  return useMemo<OfficeLayout | null>(() => {
    try {
      return buildOfficeLayout(members, teams);
    } catch (error) {
      console.error('[office-scene]', error);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);
}
