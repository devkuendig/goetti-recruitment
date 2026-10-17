import {
  HalfFloatType,
  Mesh,
  NeutralToneMapping,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  Timer,
  Vector2,
  WebGLRenderer,
  WebGLRenderTarget,
  type Camera,
  type Material,
  type Object3D,
} from 'three';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { HueSaturationShader } from 'three/addons/shaders/HueSaturationShader.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';

/** Clamp so a hiccup (tab switch, GC pause) never makes the film jump ahead. */
const MAX_FRAME_DELTA_SECONDS = 0.1;
const MAX_PIXEL_RATIO = 2;

/**
 * Renders the scene through OutlineEffect (comic ink lines) into the composer's
 * buffer, so bloom & grading run on top of the outlined image.
 */
class OutlineRenderPass extends Pass {
  constructor(
    private readonly outline: OutlineEffect,
    private readonly scene: Scene,
    private readonly camera: Camera,
  ) {
    super();
    this.needsSwap = false;
  }

  override render(renderer: WebGLRenderer, _writeBuffer: WebGLRenderTarget, readBuffer: WebGLRenderTarget): void {
    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer);
    this.outline.render(this.scene, this.camera);
  }
}

/** Owns renderer, scene, camera, post-processing and the render loop. Knows nothing about the story. */
export class Stage {
  readonly scene = new Scene();
  readonly camera = new PerspectiveCamera(60, 1, 0.05, 400);
  private readonly renderer: WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly timer = new Timer();
  private frameHandler: ((deltaSeconds: number) => void) | undefined;

  constructor(private readonly host: HTMLElement) {
    this.renderer = new WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = PCFShadowMap;
    this.renderer.toneMapping = NeutralToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    host.appendChild(this.renderer.domElement);

    const outline = new OutlineEffect(this.renderer, {
      defaultThickness: 0.0035,
      defaultColor: [0.12, 0.09, 0.14],
    });

    // Multisampled target keeps edges smooth — the composer's default target has no MSAA.
    const target = new WebGLRenderTarget(1, 1, { type: HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new OutlineRenderPass(outline, this.scene, this.camera));
    // Sunlit white surfaces reach ~1.0–1.35 in the HDR buffer; glow() materials and
    // sparkles are pushed to ~4. The threshold sits between, so only real lights bloom.
    this.bloom = new UnrealBloomPass(new Vector2(1, 1), 0.55, 0.5, 1.8);
    this.composer.addPass(this.bloom);
    const saturation = new ShaderPass(HueSaturationShader);
    saturation.uniforms.saturation.value = 0.12;
    this.composer.addPass(saturation);
    const vignette = new ShaderPass(VignetteShader);
    vignette.uniforms.offset.value = 0.95;
    vignette.uniforms.darkness.value = 1.1;
    this.composer.addPass(vignette);
    this.composer.addPass(new OutputPass());

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
    const pixelRatio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    this.renderer.setSize(width, height);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(width, height);
    this.bloom.resolution.set(width * pixelRatio, height * pixelRatio);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private frame(timestamp: number): void {
    this.timer.update(timestamp);
    const deltaSeconds = Math.min(this.timer.getDelta(), MAX_FRAME_DELTA_SECONDS);
    this.frameHandler?.(deltaSeconds);
    this.composer.render(deltaSeconds);
  }
}
