import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DataTexture,
  type Euler,
  ExtrudeGeometry,
  Group,
  Matrix4,
  Mesh,
  MeshToonMaterial,
  NearestFilter,
  RedFormat,
  Shape,
  SphereGeometry,
  SRGBColorSpace,
  type BufferGeometry,
  type ColorRepresentation,
  type Material,
  type Object3D,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const toonGradient = new DataTexture(new Uint8Array([110, 190, 255]), 3, 1, RedFormat);
toonGradient.minFilter = NearestFilter;
toonGradient.magFilter = NearestFilter;
toonGradient.needsUpdate = true;

/** Three-step cel-shaded material — the whole comic look hangs on this. */
export function toon(color: ColorRepresentation, emissive: ColorRepresentation = 0x000000): MeshToonMaterial {
  return new MeshToonMaterial({ color, emissive, gradientMap: toonGradient });
}

/**
 * Self-lit material for real light sources (lamps, LEDs, neon). Pushed well above the
 * bloom threshold in Stage, so only these glow — sunlit white paint stays matte.
 */
export const GLOW_INTENSITY = 4;
export function glow(color: ColorRepresentation): MeshToonMaterial {
  const material = toon(color, color);
  material.emissiveIntensity = GLOW_INTENSITY;
  return material;
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

/**
 * Collects many small static parts and merges them into one mesh per colour.
 * Hundreds of window frames become a handful of draw calls (×2 with outlines).
 */
export class GeometryBatch {
  private readonly parts = new Map<number, BufferGeometry[]>();

  box(size: [number, number, number], color: number, position: [number, number, number], rotation?: Euler): void {
    const geometry = new BoxGeometry(...size);
    if (rotation) {
      geometry.applyMatrix4(new Matrix4().makeRotationFromEuler(rotation));
    }
    geometry.translate(...position);
    this.add(geometry, color);
  }

  add(geometry: BufferGeometry, color: number): void {
    const flat = geometry.index ? geometry.toNonIndexed() : geometry;
    flat.clearGroups();
    const list = this.parts.get(color) ?? [];
    list.push(flat);
    this.parts.set(color, list);
  }

  build(): Group {
    const group = new Group();
    for (const [color, geometries] of this.parts) {
      const merged = mergeGeometries(geometries, false);
      if (!merged) {
        throw new Error(`GeometryBatch: could not merge ${geometries.length} parts of colour #${color.toString(16)}`);
      }
      group.add(mesh(merged, toon(color)));
      geometries.forEach((geometry) => geometry.dispose());
    }
    return group;
  }
}

export type ProfilePoint = readonly [x: number, y: number];

/** Extrudes a 2D silhouette (x/y) along z by `width`, centred on z = 0. Car bodies, roofs. */
export function profileBody(points: readonly ProfilePoint[], width: number, material: Material, bevel = 0.06): Mesh {
  const shape = new Shape();
  shape.moveTo(points[0][0], points[0][1]);
  points.slice(1).forEach(([x, y]) => shape.lineTo(x, y));
  shape.closePath();
  const depth = width - bevel * 2;
  const geometry = new ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 3,
  });
  geometry.translate(0, 0, -depth / 2);
  return mesh(geometry, material);
}

/**
 * Sets the comic ink-line thickness for everything under `root`
 * (characters thick, background thin). Materials with outlines switched off stay off.
 */
export function setOutlineThickness(root: Object3D, thickness: number): void {
  root.traverse((node) => {
    if (!(node instanceof Mesh)) {
      return;
    }
    const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials) {
      const current = material.userData.outlineParameters as { visible?: boolean } | undefined;
      if (current?.visible === false) {
        continue;
      }
      material.userData.outlineParameters = { ...current, thickness };
    }
  });
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
