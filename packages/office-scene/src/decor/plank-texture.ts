import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';
import { noise } from './noise.ts';

const PLANK_COLORS = ['#d9b486', '#d2aa7a', '#dfbd92', '#cda374', '#d6b083'];

/** Paints one staggered row of planks with their seams and grain. */
function paintRow(
  context: CanvasRenderingContext2D,
  row: number,
  rowWidth: number,
  rowHeight: number,
): void {
  let x = -noise(row) * 200;
  let plank = 0;
  while (x < rowWidth) {
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
  context.fillRect(0, row * rowHeight, rowWidth, 2);
}

/** A repeating wooden floor drawn on a canvas; null without a DOM. */
export function createPlankTexture(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const rows = 8;
  const rowHeight = canvas.height / rows;
  for (let row = 0; row < rows; row += 1) paintRow(context, row, canvas.width, rowHeight);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
