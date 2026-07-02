type SfxName = 'bounce' | 'spring' | 'break' | 'record' | 'gameover';

/** [frequency Hz, duration s, type] per effect — synthesized, no audio files. */
const FX: Record<SfxName, [number, number, OscillatorType]> = {
  bounce: [420, 0.07, 'square'],
  spring: [660, 0.16, 'square'],
  break: [180, 0.12, 'sawtooth'],
  record: [880, 0.25, 'triangle'],
  gameover: [140, 0.4, 'sine'],
};

export function createSfx(): { play(name: SfxName): void; setMuted(b: boolean): void } {
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
