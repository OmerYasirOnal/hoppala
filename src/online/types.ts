export type BoardId = 'global' | `d_${string}`;

export interface ScoreRow {
  uid: string;
  name: string;
  score: number;
  at: number;
}

export interface RankInfo {
  rank: number;
  total: number;
}

export interface CloudSave {
  name: string;
  best: number;
  dailyBest?: { key: string; score: number };
  maxZone?: number;
  updatedAt: number;
}

/** The Firebase-agnostic backend contract. Tests inject a fake implementing this. */
export interface OnlineBackend {
  ready(): Promise<void>;
  uid(): string | null;
  submitScore(board: BoardId, name: string, score: number): Promise<void>;
  topScores(board: BoardId, limit: number): Promise<ScoreRow[]>;
  myRank(board: BoardId, score: number): Promise<RankInfo>;
  loadCloudSave(): Promise<CloudSave | null>;
  saveCloudSave(patch: Partial<CloudSave>): Promise<void>;
}
