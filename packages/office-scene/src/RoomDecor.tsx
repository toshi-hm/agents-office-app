import { useEffect, useMemo } from 'react';
import { CanvasTexture, Color, RepeatWrapping, SRGBColorSpace, Shape } from 'three';
import { FittedAsset } from './FittedAsset.tsx';
import { SCENE_ASSET_URLS } from './asset-manifest.ts';
import type { OfficeLayout, SceneDecor, SceneZone } from './types.ts';

export type SceneTheme = 'light' | 'dark';

type Palette = Readonly<{
  wall: string;
  wallTrim: string;
  base: string;
  sky: string;
  floorTint: string;
  rugBase: string;
  lampGlow: number;
}>;

export const ROOM_PALETTES: Readonly<Record<SceneTheme, Palette>> = {
  light: {
    wall: '#f3e8d4',
    wallTrim: '#b98a5e',
    base: '#8f6a4a',
    sky: '#bfe0ec',
    floorTint: '#ffffff',
    rugBase: '#f4ead9',
    lampGlow: 0.55,
  },
  dark: {
    wall: '#5b5560',
    wallTrim: '#3b2f2c',
    base: '#3a2c24',
    sky: '#2b3a63',
    floorTint: '#a8998c',
    rugBase: '#6d655f',
    lampGlow: 1.6,
  },
};

const PLANK_COLORS = ['#d9b486', '#d2aa7a', '#dfbd92', '#cda374', '#d6b083'];

/** Deterministic pseudo random value in [0, 1) so the floor never shimmers between renders. */
function noise(index: number): number {
  const value = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function createPlankTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const rows = 8;
  const rowHeight = canvas.height / rows;
  for (let row = 0; row < rows; row += 1) {
    let x = -noise(row) * 200;
    let plank = 0;
    while (x < canvas.width) {
      const length = 150 + noise(row * 17 + plank) * 170;
      context.fillStyle =
        PLANK_COLORS[Math.floor(noise(row * 31 + plank * 7) * PLANK_COLORS.length)] ?? '#d6b083';
      context.fillRect(x, row * rowHeight, length, rowHeight);
      context.fillStyle = 'rgba(110, 72, 40, 0.28)';
      context.fillRect(x, row * rowHeight, 2, rowHeight);
      context.fillStyle = 'rgba(120, 82, 48, 0.07)';
      for (let grain = 0; grain < 4; grain += 1) {
        const y = row * rowHeight + 8 + noise(row * 5 + plank * 11 + grain) * (rowHeight - 16);
        context.fillRect(x + 8, y, length - 16, 1.5);
      }
      x += length;
      plank += 1;
    }
    context.fillStyle = 'rgba(110, 72, 40, 0.3)';
    context.fillRect(0, row * rowHeight, canvas.width, 2);
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function roundedRect(width: number, depth: number, radius: number): Shape {
  const x = -width / 2;
  const y = -depth / 2;
  const r = Math.min(radius, width / 2, depth / 2);
  const shape = new Shape();
  shape.moveTo(x + r, y);
  shape.lineTo(x + width - r, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + r);
  shape.lineTo(x + width, y + depth - r);
  shape.quadraticCurveTo(x + width, y + depth, x + width - r, y + depth);
  shape.lineTo(x + r, y + depth);
  shape.quadraticCurveTo(x, y + depth, x, y + depth - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

function ZoneRug({ zone, palette }: { zone: SceneZone; palette: Palette }) {
  const outer = useMemo(() => roundedRect(zone.width - 0.04, zone.depth - 0.04, 0.34), [zone]);
  const inner = useMemo(() => roundedRect(zone.width - 0.24, zone.depth - 0.24, 0.26), [zone]);
  const colors = useMemo(() => {
    const base = new Color(palette.rugBase);
    return {
      border: `#${base.clone().lerp(new Color(zone.color), 0.62).getHexString()}`,
      fill: `#${base.clone().lerp(new Color(zone.color), 0.24).getHexString()}`,
    };
  }, [palette.rugBase, zone.color]);
  const [x, , z] = zone.center;
  return (
    <group name={`zone-${zone.teamId}`}>
      <mesh position={[x, 0.006, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[outer]} />
        <meshStandardMaterial color={colors.border} roughness={1} />
      </mesh>
      <mesh position={[x, 0.01, z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <shapeGeometry args={[inner]} />
        <meshStandardMaterial color={colors.fill} roughness={1} />
      </mesh>
    </group>
  );
}

function Plant({ position, seed }: { position: readonly [number, number, number]; seed: number }) {
  const leaves = useMemo(
    () =>
      Array.from({ length: 5 }, (_, index) => ({
        x: (noise(seed * 13 + index) - 0.5) * 0.28,
        y: 0.44 + noise(seed * 29 + index) * 0.32,
        z: (noise(seed * 43 + index) - 0.5) * 0.28,
        size: 0.13 + noise(seed * 59 + index) * 0.08,
        color: ['#6f9a5c', '#82ad68', '#5d8a56'][index % 3] ?? '#6f9a5c',
      })),
    [seed],
  );
  return (
    <group position={[...position]} name="office-plant">
      <mesh position={[0, 0.15, 0]} castShadow>
        <cylinderGeometry args={[0.17, 0.12, 0.3, 8]} />
        <meshStandardMaterial color="#c9785a" roughness={0.8} flatShading />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <cylinderGeometry args={[0.025, 0.035, 0.24, 5]} />
        <meshStandardMaterial color="#6d5237" />
      </mesh>
      {leaves.map((leaf, index) => (
        <mesh key={index} position={[leaf.x, leaf.y, leaf.z]} castShadow>
          <icosahedronGeometry args={[leaf.size, 0]} />
          <meshStandardMaterial color={leaf.color} roughness={0.9} flatShading />
        </mesh>
      ))}
    </group>
  );
}

function Lamp({
  position,
  glow,
}: {
  position: readonly [number, number, number];
  glow: number;
}) {
  return (
    <group position={[...position]} name="office-lamp">
      <mesh position={[0, 0.025, 0]}>
        <cylinderGeometry args={[0.15, 0.17, 0.05, 12]} />
        <meshStandardMaterial color="#5f6b62" />
      </mesh>
      <mesh position={[0, 0.58, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 1.1, 6]} />
        <meshStandardMaterial color="#5f6b62" />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.22, 0.24, 10, 1, true]} />
        <meshStandardMaterial
          color="#ffe3ac"
          emissive="#ffc766"
          emissiveIntensity={glow}
          side={2}
          flatShading
        />
      </mesh>
    </group>
  );
}

function Decor({ item, index, palette }: { item: SceneDecor; index: number; palette: Palette }) {
  if (item.kind === 'plant') return <Plant position={item.position} seed={index + 1} />;
  if (item.kind === 'lamp') return <Lamp position={item.position} glow={palette.lampGlow} />;
  return (
    <FittedAsset
      url={SCENE_ASSET_URLS.bookcase}
      width={0.8}
      position={item.position}
      rotationY={item.rotationY}
      name="office-bookcase"
    />
  );
}

/** Windows on the back wall and framed pictures on the left wall. */
function WallDetails({ layout, palette }: { layout: OfficeLayout; palette: Palette }) {
  const { width, depth } = layout.floor;
  const back = -depth / 2;
  const left = -width / 2;
  const windows = width > 8.5 ? [-width * 0.015 - 0.9, width * 0.015 + 0.9] : [0];
  return (
    <group name="wall-details">
      {windows.map((x) => (
        <group key={x} position={[x, 0.72, back + 0.006]}>
          <mesh>
            <planeGeometry args={[1.2, 0.66]} />
            <meshStandardMaterial color={palette.wallTrim} />
          </mesh>
          <mesh position={[0, 0, 0.004]}>
            <planeGeometry args={[1.08, 0.54]} />
            <meshStandardMaterial
              color={palette.sky}
              emissive={palette.sky}
              emissiveIntensity={0.35}
            />
          </mesh>
          <mesh position={[0, 0, 0.008]}>
            <planeGeometry args={[0.04, 0.54]} />
            <meshStandardMaterial color={palette.wallTrim} />
          </mesh>
        </group>
      ))}
      {(
        [
          [0.08, '#9cb38f'],
          [0.26, '#e0a77a'],
        ] as const
      ).map(([offset, color]) => (
        <group
          key={color}
          position={[left + 0.006, 0.78, depth * offset]}
          rotation={[0, Math.PI / 2, 0]}
        >
          <mesh>
            <planeGeometry args={[0.56, 0.42]} />
            <meshStandardMaterial color={palette.wallTrim} />
          </mesh>
          <mesh position={[0, 0, 0.004]}>
            <planeGeometry args={[0.46, 0.32]} />
            <meshStandardMaterial color={color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** The miniature box: plank floor on a thick base, two low walls, rugs and accents. */
export function RoomDecor({ layout, theme }: { layout: OfficeLayout; theme: SceneTheme }) {
  const palette = ROOM_PALETTES[theme];
  const { width, depth } = layout.floor;
  const height = layout.wallHeight;
  const texture = useMemo(() => {
    const created = createPlankTexture();
    created?.repeat.set(width / 3.2, depth / 3.2);
    return created;
  }, [width, depth]);
  useEffect(() => () => texture?.dispose(), [texture]);

  return (
    <group name="office-room">
      <mesh position={[-0.08, -0.15, -0.08]}>
        <boxGeometry args={[width + 0.16, 0.28, depth + 0.16]} />
        <meshStandardMaterial color={palette.base} roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]} receiveShadow name="office-floor">
        <planeGeometry args={[width, depth]} />
        <meshStandardMaterial
          key={texture?.uuid ?? 'plain'}
          map={texture}
          color={texture ? palette.floorTint : '#d6b083'}
          roughness={0.85}
        />
      </mesh>
      <mesh position={[-0.08, height / 2 - 0.01, -depth / 2 - 0.08]} receiveShadow>
        <boxGeometry args={[width + 0.16, height, 0.16]} />
        <meshStandardMaterial color={palette.wall} roughness={0.95} />
      </mesh>
      <mesh position={[-width / 2 - 0.08, height / 2 - 0.01, 0]} receiveShadow>
        <boxGeometry args={[0.16, height, depth]} />
        <meshStandardMaterial color={palette.wall} roughness={0.95} />
      </mesh>
      <mesh position={[-0.08, height + 0.02, -depth / 2 - 0.08]}>
        <boxGeometry args={[width + 0.22, 0.06, 0.22]} />
        <meshStandardMaterial color={palette.wallTrim} />
      </mesh>
      <mesh position={[-width / 2 - 0.08, height + 0.02, 0.03]}>
        <boxGeometry args={[0.22, 0.06, depth]} />
        <meshStandardMaterial color={palette.wallTrim} />
      </mesh>
      <WallDetails layout={layout} palette={palette} />
      {layout.zones.map((zone) => (
        <ZoneRug key={zone.teamId} zone={zone} palette={palette} />
      ))}
      {layout.decor.map((item, index) => (
        <Decor key={`${item.kind}-${index}`} item={item} index={index} palette={palette} />
      ))}
    </group>
  );
}
