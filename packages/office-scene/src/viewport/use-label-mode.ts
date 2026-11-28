import { useState } from 'react';
import { defaultLabelMode } from '../scene-labels.ts';
import type { LabelMode } from '../scene-labels.ts';

/** The controlled nameplate mode when given, otherwise the viewer's own choice. */
export function useLabelMode(
  controlled: LabelMode | undefined,
  compact: boolean,
  onChange: ((mode: LabelMode) => void) | undefined,
) {
  const [own, setOwn] = useState<LabelMode | null>(null);
  const labelMode = controlled ?? own ?? defaultLabelMode(compact);
  const changeLabelMode = (next: LabelMode) => {
    setOwn(next);
    onChange?.(next);
  };
  return [labelMode, changeLabelMode] as const;
}
