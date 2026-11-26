/** Deterministic pseudo random value in [0, 1) so the floor never shimmers between renders. */
export function noise(index: number): number {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}
