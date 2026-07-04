import type { BoardId, CloudSave, OnlineBackend, RankInfo, ScoreRow } from './types';
import type { Pending } from './queue';
import { mergeCloudSave } from './cloudsave';
import { validateName } from './nickname';

export interface OnlineDeps {
  enabled: boolean;
  makeBackend: () => Promise<OnlineBackend>;
  getLocalSave: () => CloudSave;
  setLocalSave: (save: CloudSave) => void;
  enqueue: (board: BoardId, score: number) => void;
  drain: () => Pending[];
  now: () => number;
  suggest: () => string;
}

export interface Online {
  init(): Promise<void>;
  submit(board: BoardId, score: number): void;
  top(board: BoardId, limit: number): Promise<ScoreRow[]>;
  myRank(board: BoardId, score: number): Promise<RankInfo | null>;
  uid(): string | null;
  name(): string | null;
  ensureName(ask: (suggested: string) => Promise<string | null>): Promise<string | null>;
  editName(ask: (current: string) => Promise<string | null>): Promise<string | null>;
  pushBest(best: number): void;
  flush(): void;
  ready(): boolean;
  enabled(): boolean;
}

export function createOnline(deps: OnlineDeps): Online {
  let backend: OnlineBackend | null = null;
  let ready = false;
  let initing = false;
  let name: string | null = null;

  async function flushQueue(): Promise<void> {
    if (!backend || !ready || !name) return;
    for (const p of deps.drain()) {
      try {
        await backend.submitScore(p.board, name, p.score);
      } catch {
        deps.enqueue(p.board, p.score);
      }
    }
  }

  return {
    async init(): Promise<void> {
      // Reconnect-safe + idempotent: never re-create the SDK app, but DO retry auth if a prior
      // attempt failed (e.g. first load was offline). If already online, just flush the queue.
      if (!deps.enabled || initing) return;
      if (ready) { void flushQueue(); return; }
      initing = true;
      try {
        if (!backend) backend = await deps.makeBackend(); // create the app once; reuse on retry
        await backend.ready();
        ready = true;
      } catch {
        initing = false; // auth failed — stay degraded; a later init() (reconnect) retries
        return;
      }
      initing = false;
      // Cloud-save sync is best-effort and must NOT reset `ready`: the /scores leaderboard
      // path keeps working even if the /users doc read/write is momentarily unavailable.
      try {
        const local = deps.getLocalSave();
        const remote = await backend.loadCloudSave();
        const merged = mergeCloudSave(local, remote);
        deps.setLocalSave(merged);
        name = merged.name || null;
        if (name) await backend.saveCloudSave(merged);
      } catch {
        /* leave `ready` true — degrade only cloud save, not the whole online layer */
      }
      void flushQueue();
    },

    submit(board, score): void {
      try {
        if (backend && ready && name) {
          backend.submitScore(board, name, score).catch(() => deps.enqueue(board, score));
        } else {
          deps.enqueue(board, score);
        }
      } catch {
        deps.enqueue(board, score); // a synchronous throw from the backend still degrades to the queue
      }
    },

    async top(board, limit): Promise<ScoreRow[]> {
      if (!backend || !ready) return [];
      try {
        return await backend.topScores(board, limit);
      } catch {
        return [];
      }
    },

    async myRank(board, score): Promise<RankInfo | null> {
      if (!backend || !ready) return null;
      try {
        return await backend.myRank(board, score);
      } catch {
        return null;
      }
    },

    uid: () => backend?.uid() ?? null,

    name: () => name,

    async ensureName(ask): Promise<string | null> {
      if (name) return name;
      const chosen = await ask(deps.suggest());
      const valid = chosen ? validateName(chosen) : null;
      if (!valid) return null;
      name = valid;
      const updated: CloudSave = { ...deps.getLocalSave(), name: valid, updatedAt: deps.now() };
      deps.setLocalSave(updated);
      // Cloud write + queue flush run in the BACKGROUND. Offline Firestore writes HANG (they do
      // not reject), so awaiting them here would freeze the caller (e.g. opening the leaderboard).
      void (async () => {
        try {
          if (backend && ready) await backend.saveCloudSave(updated);
        } catch {
          /* best-effort */
        }
        void flushQueue();
      })();
      return valid;
    },

    async editName(ask): Promise<string | null> {
      const chosen = await ask(name ?? deps.suggest());
      const valid = chosen ? validateName(chosen) : null;
      if (!valid) return name; // cancel / invalid keeps the current name
      name = valid;
      const updated: CloudSave = { ...deps.getLocalSave(), name: valid, updatedAt: deps.now() };
      deps.setLocalSave(updated);
      void (async () => {
        try {
          if (backend && ready) await backend.saveCloudSave(updated);
        } catch {
          /* best-effort */
        }
      })();
      return valid;
    },

    pushBest(best): void {
      if (backend && ready) {
        try {
          backend.saveCloudSave({ best }).catch(() => {});
        } catch {
          /* synchronous throw — ignore; pushBest is best-effort */
        }
      }
    },

    flush(): void {
      void flushQueue();
    },

    ready: () => ready,
    enabled: () => deps.enabled,
  };
}

import { enqueue, drain } from './queue';
import { suggestName } from './nickname';
import { toCloudSave, writeCloudSave } from '../storage';
import { firebaseConfig, configured } from './config';

/** App-wide singleton wired to the real Firebase backend (lazy chunk). */
export const online: Online = createOnline({
  enabled: configured,
  makeBackend: async () => (await import('./firebase')).createFirebaseBackend(firebaseConfig),
  getLocalSave: toCloudSave,
  setLocalSave: writeCloudSave,
  enqueue,
  drain,
  now: () => Date.now(),
  suggest: () => suggestName(Math.random),
});
