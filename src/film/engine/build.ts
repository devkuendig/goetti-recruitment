import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DataTexture,
  Mesh,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  SphereGeometry,
  SRGBColorSpace,
  type BufferGeometry,
  type ColorRepresentation,
  type Material,
} from 'three';

const toonGradient = new DataTexture(new Uint8Array([110, 190, 255]), 3, 1, RedFormat);
toonGradient.minFilter = NearestFilter;
toonGradient.magFilter = NearestFilter;
toonGradient.needsUpdate = true;

/** Three-step cel-shaded material — the whole comic look hangs on this. */
export function toon(color: ColorRepresentation, emissive: ColorRepresentation = 0x000000): MeshToonMaterial {
  return new MeshToonMaterial({ color, emissive, gradientMap: toonGradient });
}

function mesh(geometry: BufferGeometry, material: Material): Mesh {
  const result = new Mesh(geometry, material);
  result.castShadow = true;
  result.receiveShadow = true;
  return result;
}

export function box(width: number, height: number, depth: number, material: Material): Mesh {
  return mesh(new BoxGeometry(width, height, depth), material);
}

export function sphere(radius: number, material: Material): Mesh {
  return mesh(new SphereGeometry(radius, 20, 14), material);
}

export function cylinder(radiusTop: number, radiusBottom: number, height: number, material: Material): Mesh {
  return mesh(new CylinderGeometry(radiusTop, radiusBottom, height, 18), material);
}

/** Renders text onto a canvas texture, used for signs and stickers. */
export function textTexture(
  text: string,
  options: { width: number; height: number; font: string; color: string; background: string },
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = options.width;
  canvas.height = options.height;
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('2D canvas context unavailable — cannot render text texture');
  }
  context.fillStyle = options.background;
  context.fillRect(0, 0, options.width, options.height);
  context.font = options.font;
  context.fillStyle = options.color;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, options.width / 2, options.height / 2);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}
