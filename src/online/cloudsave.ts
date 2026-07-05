import type { CloudSave } from './types';

/** Merge a local snapshot with the remote cloud save. Scores take the max; name/dailyBest by recency. */
export function mergeCloudSave(local: CloudSave, remote: CloudSave | null): CloudSave {
  if (!remote) return local;
  const newer = remote.updatedAt > local.updatedAt ? remote : local;
  const older = newer === remote ? local : remote;
  const name = newer.name || older.name;

  let dailyBest: CloudSave['dailyBest'];
  if (local.dailyBest && remote.dailyBest) {
    dailyBest =
      local.dailyBest.key === remote.dailyBest.key
        ? { key: local.dailyBest.key, score: Math.max(local.dailyBest.score, remote.dailyBest.score) }
        : newer.dailyBest;
  } else {
    dailyBest = local.dailyBest ?? remote.dailyBest;
  }

  return {
    name,
    best: Math.max(local.best, remote.best),
    dailyBest,
    maxZone: Math.max(local.maxZone ?? 0, remote.maxZone ?? 0),
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
  };
}
