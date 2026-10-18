export type Ease = (progress: number) => number;

export const ease = {
  linear: (progress: number) => progress,
  in: (progress: number) => progress * progress * progress,
  out: (progress: number) => 1 - (1 - progress) ** 3,
  inOut: (progress: number) =>
    progress < 0.5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2,
} satisfies Record<string, Ease>;

/** Receives eased progress (0..1) and the seconds elapsed since the clip started. */
export type ClipUpdate = (progress: number, elapsed: number) => void;

interface Clip {
  start: number;
  duration: number;
  easing: Ease;
  update: ClipUpdate;
}

interface Cue {
  time: number;
  fire: () => void;
  fired: boolean;
}

/**
 * Forward-only scene script. Every clip that has started is re-applied each frame
 * (clamped to progress 1 once finished), so later clips win over earlier ones on
 * the same property. Restarting means rebuilding the scene, not seeking backwards.
 */
export class Timeline {
  private readonly clips: Clip[] = [];
  private readonly cues: Cue[] = [];
  private currentTime = 0;

  get time(): number {
    return this.currentTime;
  }

  get duration(): number {
    const clipEnds = this.clips.map((clip) => clip.start + clip.duration);
    const cueTimes = this.cues.map((cue) => cue.time);
    return Math.max(0, ...clipEnds, ...cueTimes);
  }

  tween(start: number, duration: number, update: ClipUpdate, easing: Ease = ease.inOut): this {
    this.clips.push({ start, duration, easing, update });
    return this;
  }

  at(time: number, fire: () => void): this {
    this.cues.push({ time, fire, fired: false });
    return this;
  }

  advance(deltaSeconds: number): void {
    this.currentTime += deltaSeconds;
    for (const clip of this.clips) {
      if (this.currentTime < clip.start) {
        continue;
      }
      const elapsed = this.currentTime - clip.start;
      const linearProgress = clip.duration > 0 ? Math.min(1, elapsed / clip.duration) : 1;
      clip.update(clip.easing(linearProgress), elapsed);
    }
    for (const cue of this.cues) {
      if (!cue.fired && this.currentTime >= cue.time) {
        cue.fired = true;
        cue.fire();
      }
    }
  }
}

export function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}
