import { describe, expect, it } from 'vitest';
import { validateName, suggestName } from '../src/online/nickname';

describe('validateName', () => {
  it('accepts 3-16 char names and trims', () => {
    expect(validateName('  Ali ')).toBe('Ali');
    expect(validateName('Zıpzıp#4821')).toBe('Zıpzıp#4821');
  });
  it('rejects too short / too long / bad chars / blocklisted', () => {
    expect(validateName('ab')).toBeNull();
    expect(validateName('x'.repeat(17))).toBeNull();
    expect(validateName('<script>')).toBeNull();
    expect(validateName('admin')).toBeNull();
  });
});

describe('suggestName', () => {
  it('is deterministic given the same generator and always valid', () => {
    const seq = [0.1, 0.9, 0.5, 0.3];
    let i = 0;
    const rnd = () => seq[i++ % seq.length]!;
    const a = suggestName(rnd);
    i = 0;
    expect(suggestName(rnd)).toBe(a);
    for (let s = 0; s < 100; s++) {
      const r = () => ((s * 7 + 3) % 97) / 97;
      expect(validateName(suggestName(r))).not.toBeNull();
    }
  });
});
