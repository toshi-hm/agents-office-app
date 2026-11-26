export type SceneTheme = 'light' | 'dark';

export type Palette = Readonly<{
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
