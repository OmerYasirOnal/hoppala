import type { BoardId, RankInfo } from './types';

/** Leaderboard id for a run. Daily runs post to their day's board; free runs to global. */
export function boardForRun(mode: 'free' | 'daily', dailyKey?: string): BoardId {
  return mode === 'daily' && dailyKey ? `d_${dailyKey}` : 'global';
}

/** "#123 / 4,532" with locale digit grouping (no ambiguous k/b abbreviations). */
export function formatRank(info: RankInfo, lang: 'tr' | 'en'): string {
  const nf = new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-US');
  return `#${nf.format(info.rank)} / ${nf.format(info.total)}`;
}
