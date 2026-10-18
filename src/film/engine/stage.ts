import {
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  Timer,
  WebGLRenderer,
  type Material,
  type Object3D,
} from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';

/** Clamp so a hiccup (tab switch, GC pause) never makes the film jump ahead. */
const MAX_FRAME_DELTA_SECONDS = 0.1;

/** Owns renderer, scene, camera and the render loop. Knows nothing about the story. */
export class Stage {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(60, 1, 0.05, 400);
  private readonly renderer: WebGLRenderer;
  private readonly outline: OutlineEffect;
  private readonly timer = new Timer();
  private frameHandler: ((deltaSeconds: number) => void) | undefined;

  constructor(private readonly host: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    host.appendChild(this.renderer.domElement);

    this.outline = new OutlineEffect(this.renderer, {
      defaultThickness: 0.0035,
      defaultColor: [0.12, 0.09, 0.14],
    });

    this.timer.connect(document);
    new ResizeObserver(() => this.resize()).observe(host);
    this.resize();
    this.scene.add(this.camera);
    this.renderer.setAnimationLoop((timestamp) => this.frame(timestamp));
  }

  get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  onFrame(handler: (deltaSeconds: number) => void): void {
    this.frameHandler = handler;
  }

  /** Removes and disposes everything so a scene can be rebuilt from scratch. */
  reset(): void {
    const disposeTree = (root: Object3D) => {
      root.traverse((node) => {
        if (node instanceof Mesh) {
          node.geometry.dispose();
          const materials: Material[] = Array.isArray(node.material) ? node.material : [node.material];
          materials.forEach((material) => material.dispose());
        }
      });
    };
    for (const child of [...this.scene.children, ...this.camera.children]) {
      disposeTree(child);
      child.removeFromParent();
    }
    this.scene.add(this.camera);
    this.camera.fov = 60;
    this.camera.updateProjectionMatrix();
  }

  private resize(): void {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private frame(timestamp: number): void {
    this.timer.update(timestamp);
    const deltaSeconds = Math.min(this.timer.getDelta(), MAX_FRAME_DELTA_SECONDS);
    this.frameHandler?.(deltaSeconds);
    this.outline.render(this.scene, this.camera);
  }
}
