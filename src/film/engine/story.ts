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
  /** Idle clips run while a question is open; they don't count towards `filmTime`. */
  isIdle: boolean;
}

/** Lets the async script reach its next `play`/`ask` before the next step. */
const nextTask = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/**
 * Runs an interactive film as a plain async script:
 * `await story.play(clip)` plays a timeline to its end, `await story.ask(...)` waits for the
 * viewer's pick while an idle timeline keeps the world alive. Loops run underneath everything.
 */
export class Story {
  private readonly loops: Timeline[] = [];
  private readonly pickedAnswers: number[] = [];
  private readonly presetAnswers: number[];
  private running: RunningClip | undefined;
  private stopped = false;
  private playedSeconds = 0;

  /** `presetAnswers` answer the first questions without asking — used to replay up to a seek point. */
  constructor(private readonly presentChoice: PresentChoice, presetAnswers: readonly number[] = []) {
    this.presetAnswers = [...presetAnswers];
  }

  /** Seconds of played beats so far; time spent waiting on questions is not counted. */
  get filmTime(): number {
    return this.playedSeconds;
  }

  /** Every answer given so far, in order. */
  get answers(): readonly number[] {
    return this.pickedAnswers;
  }

  /** Background timeline (clouds, sparkles, trains) that runs for the whole film. */
  loop(timeline: Timeline): void {
    this.loops.push(timeline);
  }

  play(timeline: Timeline): Promise<void> {
    return new Promise((resolve) => {
      this.running = { timeline, duration: timeline.duration, finish: resolve, isIdle: false };
    });
  }

  async ask(question: string, options: readonly ChoiceOption[], idle?: Timeline): Promise<number> {
    const preset = this.presetAnswers.shift();
    if (preset !== undefined) {
      this.pickedAnswers.push(preset);
      return preset;
    }
    this.running = idle
      ? { timeline: idle, duration: Number.POSITIVE_INFINITY, finish: () => undefined, isIdle: true }
      : undefined;
    const picked = await this.presentChoice(question, options);
    this.running = undefined;
    this.pickedAnswers.push(picked);
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
    if (!running.isIdle) {
      this.playedSeconds += deltaSeconds;
    }
    if (running.timeline.time >= running.duration) {
      this.running = undefined;
      running.finish();
    }
  }

  /**
   * Plays forward in `stepSeconds` steps until `filmTime` reaches `targetSeconds`, or the film
   * waits for a viewer's answer or has ended. `onStep` runs after every step (e.g. callouts).
   */
  async fastForwardTo(targetSeconds: number, stepSeconds: number, onStep: (deltaSeconds: number) => void): Promise<void> {
    while (!this.stopped && this.playedSeconds < targetSeconds) {
      if (!this.running) {
        await nextTask();
      }
      if (!this.running || this.running.isIdle) {
        return;
      }
      const step = Math.min(stepSeconds, targetSeconds - this.playedSeconds);
      this.advance(step);
      onStep(step);
    }
  }

  /** Freezes the film for good; pending `play`/`ask` promises never settle. */
  stop(): void {
    this.stopped = true;
    this.running = undefined;
  }
}
