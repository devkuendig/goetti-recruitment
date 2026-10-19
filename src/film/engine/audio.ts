export const HIPHOP_BPM = 90;

/** One bar of sixteenth-note steps (0–15); bassline/chord in Hz (E minor). */
const BOOM_BAP: Record<'kick' | 'snare' | 'stab' | 'bassline' | 'chord', readonly number[]> = {
  kick: [0, 7, 10],
  snare: [4, 12],
  stab: [0, 6],
  bassline: [41.2, 41.2, 49, 36.7],
  chord: [164.8, 196, 246.9],
};

/**
 * Procedural sound effects via Web Audio — no audio files, no licensing questions.
 * Must be created from a user gesture (browser autoplay policy).
 */
export class SoundBoard {
  private readonly context = new AudioContext();
  private readonly master: GainNode;
  private readonly noiseBuffer: AudioBuffer;

  constructor() {
    this.master = this.context.createGain();
    this.master.gain.value = 0.8;
    this.master.connect(this.context.destination);
    this.noiseBuffer = this.createNoiseBuffer(2);
  }

  /** Low city rumble plus the odd bird chirp. */
  cityAmbience(durationSeconds: number): void {
    const now = this.context.currentTime;
    const rumble = this.context.createBufferSource();
    rumble.buffer = this.noiseBuffer;
    rumble.loop = true;
    const lowpass = this.context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 400;
    const rumbleGain = this.context.createGain();
    rumbleGain.gain.setValueAtTime(0, now);
    rumbleGain.gain.linearRampToValueAtTime(0.06, now + 1.5);
    rumble.connect(lowpass).connect(rumbleGain).connect(this.master);
    rumble.start(now);
    rumble.stop(now + durationSeconds);

    for (let chirpTime = 0.8; chirpTime < durationSeconds; chirpTime += 1.3 + Math.random() * 2) {
      this.chirp(now + chirpTime);
      this.chirp(now + chirpTime + 0.12);
    }
  }

  footstep(): void {
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700 + Math.random() * 300;
    const gain = this.envelope(now, 0.005, 0.09, 0.25);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now, Math.random());
    source.stop(now + 0.12);
  }

  /** Car unlock: two short beeps. */
  unlockBeep(): void {
    const now = this.context.currentTime;
    this.tone('square', 1760, 1760, now, 0.08, 0.06);
    this.tone('square', 1760, 1760, now + 0.15, 0.08, 0.06);
  }

  /** Cartoon "ping" for sparkles and glints. */
  ping(pitch = 2600): void {
    const now = this.context.currentTime;
    this.tone('triangle', pitch, pitch * 1.5, now, 0.5, 0.12);
    this.tone('sine', pitch * 2, pitch * 2, now + 0.04, 0.35, 0.05);
  }

  bonk(): void {
    const now = this.context.currentTime;
    this.tone('sine', 420, 70, now, 0.35, 0.5);
    this.tone('square', 1200, 300, now, 0.04, 0.1);
  }

  cameraShutter(): void {
    const now = this.context.currentTime;
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3000;
    source.connect(filter).connect(this.envelope(now, 0.002, 0.05, 0.2)).connect(this.master);
    source.start(now);
    source.stop(now + 0.08);
  }

  /** Classic two-part wolf whistle: fiu — fiuuu. */
  wolfWhistle(): void {
    const now = this.context.currentTime;
    this.whistleSweep([900, 2300], now, 0.28);
    this.whistleSweep([1000, 2500, 800], now + 0.42, 0.7);
  }

  /**
   * Boom-bap hip-hop loop from the tuned car: swung hats, kick, snare, bass and a
   * minor-chord stab. Returns a volume control so the scene can fade it with the
   * car's distance.
   */
  hipHopMusic(durationSeconds: number): (volume: number) => void {
    const now = this.context.currentTime;
    const musicGain = this.context.createGain();
    musicGain.gain.value = 0;
    const muffle = this.context.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = 2500;
    musicGain.connect(muffle).connect(this.master);

    const stepSeconds = 60 / HIPHOP_BPM / 4;
    const swingSeconds = stepSeconds * 0.18;
    for (let step = 0; step * stepSeconds < durationSeconds; step++) {
      const stepInBar = step % 16;
      const bar = Math.floor(step / 16);
      const isOffbeatEighth = stepInBar % 4 === 2;
      const stepTime = now + step * stepSeconds + (isOffbeatEighth ? swingSeconds : 0);

      if (BOOM_BAP.kick.includes(stepInBar)) {
        this.tone('sine', 140, 42, stepTime, 0.35, 1, musicGain);
        const bassNote = BOOM_BAP.bassline[bar % BOOM_BAP.bassline.length];
        this.tone('triangle', bassNote, bassNote, stepTime, stepSeconds * 3, 0.45, musicGain);
      }
      if (BOOM_BAP.snare.includes(stepInBar)) {
        this.noiseHit(stepTime, 'bandpass', 1800, 0.18, 0.5, musicGain);
        this.tone('triangle', 220, 160, stepTime, 0.1, 0.3, musicGain);
      }
      if (stepInBar % 2 === 0) {
        const accent = stepInBar % 4 === 0 ? 0.12 : 0.07;
        this.noiseHit(stepTime, 'highpass', 7000, 0.04, accent, musicGain);
      }
      if (BOOM_BAP.stab.includes(stepInBar) && bar % 2 === 0) {
        for (const frequency of BOOM_BAP.chord) {
          this.tone('square', frequency, frequency, stepTime, stepSeconds * 2, 0.04, musicGain);
        }
      }
    }
    return (volume: number) => {
      musicGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.05);
    };
  }

  close(): void {
    void this.context.close();
  }

  private noiseHit(
    startTime: number,
    filterType: BiquadFilterType,
    frequency: number,
    durationSeconds: number,
    peak: number,
    destination: AudioNode,
  ): void {
    const source = this.context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = this.context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    source.connect(filter).connect(this.envelope(startTime, 0.002, durationSeconds, peak)).connect(destination);
    source.start(startTime, Math.random());
    source.stop(startTime + durationSeconds + 0.02);
  }

  private chirp(startTime: number): void {
    const pitch = 3000 + Math.random() * 1500;
    this.tone('sine', pitch, pitch * 1.3, startTime, 0.08, 0.025);
  }

  private whistleSweep(frequencies: number[], startTime: number, durationSeconds: number): void {
    const oscillator = this.context.createOscillator();
    oscillator.type = 'sine';
    const stepSeconds = durationSeconds / (frequencies.length - 1);
    oscillator.frequency.setValueAtTime(frequencies[0], startTime);
    frequencies.slice(1).forEach((frequency, index) => {
      oscillator.frequency.exponentialRampToValueAtTime(frequency, startTime + stepSeconds * (index + 1));
    });
    const gain = this.envelope(startTime, 0.03, durationSeconds, 0.22);
    oscillator.connect(gain).connect(this.master);
    oscillator.start(startTime);
    oscillator.stop(startTime + durationSeconds + 0.1);
  }

  private tone(
    type: OscillatorType,
    fromFrequency: number,
    toFrequency: number,
    startTime: number,
    durationSeconds: number,
    peak: number,
    destination: AudioNode = this.master,
  ): void {
    const oscillator = this.context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(fromFrequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(toFrequency, startTime + durationSeconds);
    oscillator.connect(this.envelope(startTime, 0.005, durationSeconds, peak)).connect(destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + durationSeconds + 0.05);
  }

  private envelope(startTime: number, attackSeconds: number, durationSeconds: number, peak: number): GainNode {
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(peak, startTime + attackSeconds);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + durationSeconds);
    return gain;
  }

  private createNoiseBuffer(seconds: number): AudioBuffer {
    const buffer = this.context.createBuffer(1, this.context.sampleRate * seconds, this.context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < samples.length; index++) {
      samples[index] = Math.random() * 2 - 1;
    }
    return buffer;
  }
}
