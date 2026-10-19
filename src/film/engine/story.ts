import type { Timeline } from './timeline';

export interface ChoiceOption {
  label: string;
  icon: string;
}

/** Shows a question with its options and resolves with the index of the option the viewer picked. */
export type PresentChoice = (question: string, options: readonly ChoiceOption[]) => Promise<number>;

interface RunningClip {
  timeline: Timeline;
  duration: number;
  finish: () => void;
}

/**
 * Runs an interactive film as a plain async script:
 * `await story.play(clip)` plays a timeline to its end, `await story.ask(...)` waits for the
 * viewer's pick while an idle timeline keeps the world alive. Loops run underneath everything.
 */
export class Story {
  private readonly loops: Timeline[] = [];
  private running: RunningClip | undefined;
  private stopped = false;

  constructor(private readonly presentChoice: PresentChoice) {}

  /** Background timeline (clouds, sparkles, trains) that runs for the whole film. */
  loop(timeline: Timeline): void {
    this.loops.push(timeline);
  }

  play(timeline: Timeline): Promise<void> {
    return new Promise((resolve) => {
      this.running = { timeline, duration: timeline.duration, finish: resolve };
    });
  }

  async ask(question: string, options: readonly ChoiceOption[], idle?: Timeline): Promise<number> {
    this.running = idle ? { timeline: idle, duration: Number.POSITIVE_INFINITY, finish: () => undefined } : undefined;
    const picked = await this.presentChoice(question, options);
    this.running = undefined;
    return picked;
  }

  advance(deltaSeconds: number): void {
    if (this.stopped) {
      return;
    }
    this.loops.forEach((loop) => loop.advance(deltaSeconds));
    const running = this.running;
    if (!running) {
      return;
    }
    running.timeline.advance(deltaSeconds);
    if (running.timeline.time >= running.duration) {
      this.running = undefined;
      running.finish();
    }
  }

  /** Freezes the film for good; pending `play`/`ask` promises never settle. */
  stop(): void {
    this.stopped = true;
    this.running = undefined;
  }
}
