let cached: boolean | null = null;

/** True when a WebGL2 context can really be created (false in headless and test environments). */
export function supportsWebGL2(): boolean {
  if (cached !== null) return cached;
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (typeof WebGL2RenderingContext === 'undefined') return false;
  try {
    const context = document.createElement('canvas').getContext('webgl2');
    context?.getExtension('WEBGL_lose_context')?.loseContext();
    cached = context !== null;
  } catch {
    cached = false;
  }
  return cached;
}
