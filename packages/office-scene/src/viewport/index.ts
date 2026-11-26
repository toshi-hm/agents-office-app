// OfficeCanvas is deliberately not re-exported: a static export would pull three.js into the
// main chunk. `use-scene-recovery.ts` imports it dynamically.
export { OfficeViewport } from './OfficeViewport.tsx';
export type { OfficeViewportProps } from './viewport-props.ts';
export { OfficeFallback } from './OfficeFallback.tsx';
export type { FallbackReason } from './OfficeFallback.tsx';
export { SceneErrorBoundary } from './SceneErrorBoundary.tsx';
export { ViewportControls } from './ViewportControls.tsx';
