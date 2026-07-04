const BLOCKLIST = ['admin', 'moderator', 'hitler', 'nazi', 'fuck', 'shit', 'sik', 'orospu', 'piç'];
const NAME_RE = /^[\p{L}\p{N} _#-]{3,16}$/u;

/** Trim + validate. Returns the cleaned name, or null if invalid. */
export function validateName(raw: string): string | null {
  const name = raw.trim();
  if (!NAME_RE.test(name)) return null;
  const lower = name.toLowerCase();
  if (BLOCKLIST.some((w) => lower.includes(w))) return null;
  return name;
}

// All tokens <= 7 chars so `${token}#${4-digit}` is always <= 16 and valid.
const TOKENS = ['Zıpzıp', 'Hoppa', 'Kanguru', 'Kurbağa', 'Tavşan', 'Çekirge', 'Sincap', 'Yıldız', 'Bulut', 'Fıldır', 'Pıtır', 'Takla'];

/** Deterministic playful name given a [0,1) generator, e.g. "Kanguru#4821". */
export function suggestName(rnd: () => number): string {
  const token = TOKENS[Math.floor(rnd() * TOKENS.length)]!;
  const num = 1000 + Math.floor(rnd() * 9000);
  return `${token}#${num}`;
}
