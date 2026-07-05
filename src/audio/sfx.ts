type SfxName = 'bounce' | 'spring' | 'break' | 'boost' | 'stomp' | 'record' | 'gameover';

/** [frequency Hz, duration s, type] per effect — synthesized, no audio files. */
const FX: Record<SfxName, [number, number, OscillatorType]> = {
  bounce: [420, 0.07, 'square'],
  spring: [660, 0.16, 'square'],
  break: [180, 0.12, 'sawtooth'],
  boost: [880, 0.1, 'sine'],
  stomp: [520, 0.1, 'square'],
  record: [880, 0.25, 'triangle'],
  gameover: [140, 0.4, 'sine'],
};

export function createSfx(): {
  play(name: SfxName): void;
  setMuted(b: boolean): void;
  unlock(): void;
} {
  let ctx: AudioContext | null = null;
  let muted = false;

  function ensure(): AudioContext | null {
    if (muted) return null;
    try {
      ctx ??= new AudioContext();
      if (ctx.state === 'suspended') void ctx.resume();
      return ctx;
    } catch {
      return null;
    }
  }

  return {
    /** Create/resume the context inside a user gesture (iOS requirement).
     *  Created even while muted so a later unmute can produce sound. */
    unlock() {
      try {
        ctx ??= new AudioContext();
        if (ctx.state === 'suspended') void ctx.resume();
      } catch {
        /* audio unavailable — play silently */
      }
    },
    play(name) {
      const ac = ensure();
      if (!ac) return;
      const [freq, dur, type] = FX[name];
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      osc.frequency.exponentialRampToValueAtTime(Math.max(60, freq * (name === 'gameover' ? 0.4 : 1.4)), ac.currentTime + dur);
      gain.gain.setValueAtTime(0.12, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
      osc.connect(gain).connect(ac.destination);
      osc.start();
      osc.stop(ac.currentTime + dur);
    },
    setMuted(b) {
      muted = b;
    },
  };
}
