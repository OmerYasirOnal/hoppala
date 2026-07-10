// Generative calm ambient music — procedural Web Audio, no audio files (keeps the tiny bundle + zero deps).
// A soft evolving pad: an add9 chord of detuned sine/triangle voices through a gentle low-pass with a slow
// "breathing" LFO and a feedback delay for space. The chord root rises subtly as the player climbs the zones,
// reinforcing the sense of ascension. Deliberately quiet and unobtrusive ("sessiz, dingin").

/** Warm mid-low root (C#3). */
const BASE_HZ = 138.59;
/** Semitone offset of the chord root per zone 0..7 — a calm ascending pentatonic so climbing gently lifts the key. */
const ZONE_SEMITONES = [0, 3, 5, 7, 10, 12, 15, 17];
/** add9 voicing as ratios of the root: root · fifth · octave · ninth — dreamy and consonant. */
const VOICES = [1, 1.4983, 2, 2.2449];

/** Root frequency (Hz) for a zone index. Pure — unit-tested. */
export function zoneRootHz(zoneIndex: number, base = BASE_HZ): number {
  const i = Math.max(0, Math.min(ZONE_SEMITONES.length - 1, Math.floor(zoneIndex || 0)));
  return base * Math.pow(2, ZONE_SEMITONES[i]! / 12);
}

export interface Music {
  /** Create/resume the AudioContext inside a user gesture (autoplay policy). Idempotent. */
  start(): void;
  /** Whether the pad should be audible (gated by the master-mute in main.ts). */
  setEnabled(on: boolean): void;
  /** Shift the tonality as the player climbs (zone 0..7). Smoothly glides the root. */
  setZone(zoneIndex: number): void;
  /** A soft rising chime when a new zone is reached — a gentle musical "lift". */
  chime(): void;
}

export function createMusic(): Music {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let filter: BiquadFilterNode | null = null;
  const oscs: OscillatorNode[] = [];
  let built = false;
  let enabled = false;
  let root = BASE_HZ;

  const TARGET_GAIN = 0.085; // quiet

  function build(ac: AudioContext): void {
    if (built) return;
    master = ac.createGain();
    master.gain.value = 0; // fade in via setEnabled
    filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 820;
    filter.Q.value = 0.6;

    // feedback delay for a sense of space
    const delay = ac.createDelay(1);
    delay.delayTime.value = 0.42;
    const fb = ac.createGain();
    fb.gain.value = 0.32;
    const wet = ac.createGain();
    wet.gain.value = 0.22;
    filter.connect(delay);
    delay.connect(fb);
    fb.connect(delay);
    delay.connect(wet);
    wet.connect(master);
    filter.connect(master);
    master.connect(ac.destination);

    // pad voices — slightly detuned sine/triangle for warmth
    VOICES.forEach((ratio, i) => {
      const osc = ac.createOscillator();
      osc.type = i % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = root * ratio;
      osc.detune.value = (i - 1.5) * 4; // a few cents apart
      const vg = ac.createGain();
      vg.gain.value = 0.9 / VOICES.length / (1 + i * 0.35); // higher voices quieter
      osc.connect(vg).connect(filter!);
      osc.start();
      oscs.push(osc);
    });

    // slow "breathing" LFO on the filter cutoff for gentle movement
    const lfo = ac.createOscillator();
    lfo.frequency.value = 0.06;
    const lfoGain = ac.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();

    // a second, slower tremolo on the master for a tide-like swell
    const trem = ac.createOscillator();
    trem.frequency.value = 0.04;
    const tremGain = ac.createGain();
    tremGain.gain.value = 0.02;
    trem.connect(tremGain).connect(master.gain);
    trem.start();

    built = true;
  }

  function apply(): void {
    if (!ctx || !master) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setTargetAtTime(enabled ? TARGET_GAIN : 0, now, 1.4); // slow fade
  }

  return {
    start() {
      try {
        ctx ??= new AudioContext();
        if (ctx.state === 'suspended') void ctx.resume();
        build(ctx);
        apply();
      } catch {
        /* audio unavailable — silent */
      }
    },
    setEnabled(on) {
      enabled = on;
      apply();
    },
    setZone(zoneIndex) {
      root = zoneRootHz(zoneIndex);
      if (!ctx) return;
      const now = ctx.currentTime;
      oscs.forEach((osc, i) => {
        const target = root * VOICES[i % VOICES.length]!;
        osc.frequency.cancelScheduledValues(now);
        osc.frequency.setTargetAtTime(target, now, 3.5); // slow glide, no jumps
      });
    },
    chime() {
      if (!ctx || !enabled || !filter) return;
      try {
        const ac = ctx;
        const now = ac.currentTime;
        // a gentle two-note rising arpeggio (fifth → octave) over the current root
        [root * 1.4983, root * 2].forEach((f, i) => {
          const o = ac.createOscillator();
          o.type = 'sine';
          o.frequency.value = f * 2; // an octave up — bell-like
          const g = ac.createGain();
          const t0 = now + i * 0.14;
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.exponentialRampToValueAtTime(0.05, t0 + 0.05);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
          o.connect(g).connect(filter!);
          o.start(t0);
          o.stop(t0 + 1.2);
        });
      } catch {
        /* ignore */
      }
    },
  };
}
