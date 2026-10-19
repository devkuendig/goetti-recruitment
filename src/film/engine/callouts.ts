import { Vector3, type Camera, type Object3D } from 'three';

interface ActiveCallout {
  element: HTMLElement;
  anchor: Object3D;
  offsetY: number;
  remainingSeconds: number;
}

const projected = new Vector3();

/** Comic onomatopoeia ("BONK!") as DOM labels pinned to a 3D object. */
export class Callouts {
  private active: ActiveCallout[] = [];
  private banners: { element: HTMLElement; remainingSeconds: number }[] = [];

  constructor(
    private readonly layer: HTMLElement,
    private readonly camera: Camera,
  ) {}

  show(text: string, anchor: Object3D, durationSeconds: number, offsetY = 0.4): void {
    const element = this.pin('callout', text, anchor, durationSeconds, offsetY);
    element.style.setProperty('--tilt', `${(Math.random() * 16 - 8).toFixed(1)}deg`);
  }

  /** Speech bubble with a tail pointing down at the speaker. */
  say(text: string, anchor: Object3D, durationSeconds: number, offsetY = 0.5): void {
    this.pin('speech', text, anchor, durationSeconds, offsetY);
  }

  /** Commercial-style lower third, not pinned to any object. */
  showBanner(title: string, subtitle: string, durationSeconds: number): void {
    const element = document.createElement('div');
    element.className = 'banner';
    const titleElement = document.createElement('strong');
    titleElement.textContent = title;
    const subtitleElement = document.createElement('span');
    subtitleElement.textContent = subtitle;
    element.append(titleElement, subtitleElement);
    this.layer.appendChild(element);
    this.banners.push({ element, remainingSeconds: durationSeconds });
  }

  update(deltaSeconds: number): void {
    for (const banner of this.banners) {
      banner.remainingSeconds -= deltaSeconds;
    }
    this.banners.filter((banner) => banner.remainingSeconds <= 0).forEach((banner) => banner.element.remove());
    this.banners = this.banners.filter((banner) => banner.remainingSeconds > 0);

    const width = this.layer.clientWidth;
    const height = this.layer.clientHeight;
    for (const callout of this.active) {
      callout.remainingSeconds -= deltaSeconds;
      callout.anchor.getWorldPosition(projected);
      projected.y += callout.offsetY;
      projected.project(this.camera);
      const isBehindCamera = projected.z > 1;
      callout.element.style.display = isBehindCamera ? 'none' : '';
      callout.element.style.left = `${((projected.x + 1) / 2) * width}px`;
      callout.element.style.top = `${((1 - projected.y) / 2) * height}px`;
    }
    const expired = this.active.filter((callout) => callout.remainingSeconds <= 0);
    expired.forEach((callout) => callout.element.remove());
    this.active = this.active.filter((callout) => callout.remainingSeconds > 0);
  }

  private pin(className: string, text: string, anchor: Object3D, durationSeconds: number, offsetY: number): HTMLElement {
    const element = document.createElement('div');
    element.className = className;
    element.textContent = text;
    this.layer.appendChild(element);
    this.active.push({ element, anchor, offsetY, remainingSeconds: durationSeconds });
    return element;
  }

  clear(): void {
    this.active.forEach((callout) => callout.element.remove());
    this.active = [];
    this.banners.forEach((banner) => banner.element.remove());
    this.banners = [];
  }
}
