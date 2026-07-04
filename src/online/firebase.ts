import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, type Auth } from 'firebase/auth';
import {
  initializeFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit as fbLimit,
  getDocs,
  where,
  getCountFromServer,
  type Firestore,
} from 'firebase/firestore';
import type { BoardId, CloudSave, OnlineBackend, RankInfo, ScoreRow } from './types';

export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  appId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

export function createFirebaseBackend(config: FirebaseConfig): OnlineBackend {
  const app: FirebaseApp = initializeApp(config as Record<string, string>);
  const auth: Auth = getAuth(app);
  // ignoreUndefinedProperties: a player with no daily run yet has dailyBest === undefined;
  // default Firestore rejects explicit-undefined fields, which would throw before the rules run.
  const db: Firestore = initializeFirestore(app, { ignoreUndefinedProperties: true });
  let currentUid: string | null = null;

  return {
    async ready(): Promise<void> {
      await new Promise<void>((resolve, reject) => {
        const unsub = onAuthStateChanged(auth, (user) => {
          if (user) {
            currentUid = user.uid;
            unsub();
            resolve();
          }
        });
        // unsub on reject too, so a retried ready() (reconnect) doesn't leak listeners.
        signInAnonymously(auth).catch((e) => {
          unsub();
          reject(e);
        });
      });
    },

    uid: () => currentUid,

    async submitScore(board, name, score): Promise<void> {
      if (!currentUid) throw new Error('not signed in');
      const ref = doc(db, 'scores', board, 'entries', currentUid);
      const existing = await getDoc(ref);
      // Rules reject a non-increasing update; skip the write to avoid a guaranteed rejection.
      if (existing.exists() && (existing.data().score as number) >= score) return;
      await setDoc(ref, { name, score, at: Date.now() });
    },

    async topScores(board, lim): Promise<ScoreRow[]> {
      const q = query(collection(db, 'scores', board, 'entries'), orderBy('score', 'desc'), fbLimit(lim));
      const snap = await getDocs(q);
      return snap.docs.map((d) => ({
        uid: d.id,
        name: d.data().name as string,
        score: d.data().score as number,
        at: d.data().at as number,
      }));
    },

    async myRank(board, score): Promise<RankInfo> {
      const entries = collection(db, 'scores', board, 'entries');
      const above = await getCountFromServer(query(entries, where('score', '>', score)));
      const total = await getCountFromServer(entries);
      return { rank: above.data().count + 1, total: total.data().count };
    },

    async loadCloudSave(): Promise<CloudSave | null> {
      if (!currentUid) return null;
      const snap = await getDoc(doc(db, 'users', currentUid));
      if (!snap.exists()) return null;
      const d = snap.data();
      return {
        name: d.name as string,
        best: d.best as number,
        dailyBest: d.dailyBest as CloudSave['dailyBest'],
        updatedAt: (d.updatedAt as number) ?? 0,
      };
    },

    async saveCloudSave(patch): Promise<void> {
      if (!currentUid) throw new Error('not signed in');
      await setDoc(doc(db, 'users', currentUid), { ...patch, updatedAt: Date.now() }, { merge: true });
    },
  };
}
