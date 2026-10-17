import { describe, expect, it } from 'vitest';
import { ease, Timeline } from './timeline';

describe('Timeline', () => {
  it('whenBeforeClipStart_thenClipIsNotApplied', () => {
    const applied: number[] = [];
    const timeline = new Timeline().tween(2, 1, (progress) => applied.push(progress), ease.linear);

    timeline.advance(1.5);

    expect(applied).toEqual([]);
  });

  it('whenInsideClip_thenProgressIsProportional', () => {
    let progressSeen = -1;
    const timeline = new Timeline().tween(1, 2, (progress) => {
      progressSeen = progress;
    }, ease.linear);

    timeline.advance(2);

    expect(progressSeen).toBeCloseTo(0.5);
  });

  it('whenPastClipEnd_thenProgressIsClampedToOneAndElapsedKeepsGrowing', () => {
    let progressSeen = -1;
    let elapsedSeen = -1;
    const timeline = new Timeline().tween(0, 1, (progress, elapsed) => {
      progressSeen = progress;
      elapsedSeen = elapsed;
    }, ease.linear);

    timeline.advance(3);

    expect(progressSeen).toBe(1);
    expect(elapsedSeen).toBe(3);
  });

  it('whenOverlappingClipsWriteSameValue_thenLaterAddedClipWins', () => {
    let value = 0;
    const timeline = new Timeline()
      .tween(0, 1, () => {
        value = 1;
      })
      .tween(0.5, 1, () => {
        value = 2;
      });

    timeline.advance(0.7);

    expect(value).toBe(2);
  });

  it('whenCueTimePassed_thenCueFiresExactlyOnce', () => {
    let fireCount = 0;
    const timeline = new Timeline().at(1, () => {
      fireCount++;
    });

    timeline.advance(0.5);
    timeline.advance(1);
    timeline.advance(1);

    expect(fireCount).toBe(1);
  });

  it('whenZeroDurationClip_thenAppliedAtFullProgress', () => {
    let progressSeen = -1;
    const timeline = new Timeline().tween(1, 0, (progress) => {
      progressSeen = progress;
    }, ease.linear);

    timeline.advance(1);

    expect(progressSeen).toBe(1);
  });

  it('whenClipsAndCuesAdded_thenDurationIsLatestEnd', () => {
    const timeline = new Timeline()
      .tween(1, 4, () => undefined)
      .at(7, () => undefined);

    expect(timeline.duration).toBe(7);
  });
});

describe('ease', () => {
  it('whenAtBounds_thenAllCurvesStartAtZeroAndEndAtOne', () => {
    for (const curve of Object.values(ease)) {
      expect(curve(0)).toBeCloseTo(0);
      expect(curve(1)).toBeCloseTo(1);
    }
  });
});
