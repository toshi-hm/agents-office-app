/** The only shadow-casting light; its shadow camera covers the whole floor. */
export function SunLight({ shadowExtent, dark }: { shadowExtent: number; dark: boolean }) {
  return (
    <directionalLight
      position={[5.5, 10, 6.5]}
      intensity={dark ? 0.85 : 1.75}
      color={dark ? '#cdd6ff' : '#fff0d8'}
      castShadow
      shadow-mapSize={[1024, 1024]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-camera-left={-shadowExtent}
      shadow-camera-right={shadowExtent}
      shadow-camera-top={shadowExtent}
      shadow-camera-bottom={-shadowExtent}
      shadow-camera-near={1}
      shadow-camera-far={30 + shadowExtent}
    />
  );
}
