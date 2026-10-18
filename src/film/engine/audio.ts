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
   * Bass-heavy loop from the tuned car. Returns a volume control so the scene
   * can fade it with the car's distance.
   */
  bassMusic(durationSeconds: number): (volume: number) => void {
    const now = this.context.currentTime;
    const musicGain = this.context.createGain();
    musicGain.gain.value = 0;
    const muffle = this.context.createBiquadFilter();
    muffle.type = 'lowpass';
    muffle.frequency.value = 900;
    musicGain.connect(muffle).connect(this.master);

    const beatSeconds = 60 / 96;
    const bassline = [55, 55, 65.4, 49];
    for (let beat = 0; beat * beatSeconds < durationSeconds; beat++) {
      const beatTime = now + beat * beatSeconds;
      this.tone('sine', 150, 40, beatTime, 0.3, 0.9, musicGain);
      if (beat % 2 === 1) {
        const note = bassline[Math.floor(beat / 2) % bassline.length];
        this.tone('sawtooth', note, note, beatTime, beatSeconds * 0.9, 0.25, musicGain);
      }
    }
    return (volume: number) => {
      musicGain.gain.setTargetAtTime(volume, this.context.currentTime, 0.05);
    };
  }

  close(): void {
    void this.context.close();
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
