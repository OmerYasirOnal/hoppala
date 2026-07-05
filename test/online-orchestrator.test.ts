import { describe, expect, it, vi } from 'vitest';
import { createOnline, type OnlineDeps } from '../src/online/index';
import type { BoardId, CloudSave, OnlineBackend, ScoreRow } from '../src/online/types';
import type { Pending } from '../src/online/queue';

function fakeBackend(over: Partial<OnlineBackend> = {}): OnlineBackend {
  return {
    ready: vi.fn(async () => {}),
    uid: () => 'u1',
    submitScore: vi.fn(async () => {}),
    topScores: vi.fn(async () => [] as ScoreRow[]),
    myRank: vi.fn(async () => ({ rank: 7, total: 42 })),
    loadCloudSave: vi.fn(async () => null),
    saveCloudSave: vi.fn(async () => {}),
    ...over,
  };
}

function fakeDeps(over: Partial<OnlineDeps> = {}): { deps: OnlineDeps; q: Pending[]; save: { v: CloudSave } } {
  const q: Pending[] = [];
  const save = { v: { name: 'Neo', best: 5, updatedAt: 10 } as CloudSave };
  const deps: OnlineDeps = {
    enabled: true,
    makeBackend: async () => fakeBackend(),
    getLocalSave: () => save.v,
    setLocalSave: (s) => { save.v = s; },
    enqueue: (board, score) => {
      const e = q.find((p) => p.board === board);
      if (e) { if (score > e.score) e.score = score; } else q.push({ board, score });
    },
    drain: () => q.splice(0, q.length),
    now: () => 1000,
    suggest: () => 'Kanguru#4821',
    ...over,
  };
  return { deps, q, save };
}

describe('createOnline', () => {
  it('does nothing when disabled; submit enqueues', () => {
    const { deps, q } = fakeDeps({ enabled: false });
    const online = createOnline(deps);
    online.submit('global', 100);
    expect(online.ready()).toBe(false);
    expect(q).toEqual([{ board: 'global', score: 100 }]);
  });

  it('submits online when ready and named', async () => {
    const backend = fakeBackend();
    const { deps } = fakeDeps({ makeBackend: async () => backend });
    const online = createOnline(deps);
    await online.init();
    online.submit('global', 100);
    expect(backend.submitScore).toHaveBeenCalledWith('global', 'Neo', 100);
  });

  it('enqueues when the backend submit rejects', async () => {
    const backend = fakeBackend({ submitScore: vi.fn(async () => { throw new Error('offline'); }) });
    const { deps, q } = fakeDeps({ makeBackend: async () => backend });
    const online = createOnline(deps);
    await online.init();
    online.submit('global', 100);
    await new Promise((r) => setTimeout(r, 0)); // let the rejected submit's catch enqueue
    expect(q).toEqual([{ board: 'global', score: 100 }]);
  });

  it('flushes the queue on init', async () => {
    const backend = fakeBackend();
    const { deps, q } = fakeDeps({ makeBackend: async () => backend });
    q.push({ board: 'global', score: 200 });
    const online = createOnline(deps);
    await online.init();
    await new Promise((r) => setTimeout(r, 0)); // init kicks flush in the background
    expect(backend.submitScore).toHaveBeenCalledWith('global', 'Neo', 200);
    expect(q).toEqual([]);
  });

  it('ensureName asks, validates, persists, and flushes', async () => {
    const backend = fakeBackend();
    const { deps, q, save } = fakeDeps({ makeBackend: async () => backend, getLocalSave: () => ({ name: '', best: 0, updatedAt: 0 }) });
    let saved = { name: '', best: 0, updatedAt: 0 } as CloudSave;
    deps.getLocalSave = () => saved;
    deps.setLocalSave = (s) => { saved = s; };
    const online = createOnline(deps);
    await online.init();               // no name yet
    online.submit('global', 300);      // enqueues (no name)
    expect(q).toEqual([{ board: 'global', score: 300 }]);
    const name = await online.ensureName(async (suggested) => suggested);
    expect(name).toBe('Kanguru#4821');
    expect(online.name()).toBe('Kanguru#4821');
    expect(saved.name).toBe('Kanguru#4821');
    await new Promise((r) => setTimeout(r, 0)); // ensureName backgrounds the cloud write + flush
    expect(backend.submitScore).toHaveBeenCalledWith('global', 'Kanguru#4821', 300);
  });

  it('degrades top()/myRank() to []/null on backend error', async () => {
    const backend = fakeBackend({
      topScores: vi.fn(async () => { throw new Error('x'); }),
      myRank: vi.fn(async () => { throw new Error('x'); }),
    });
    const { deps } = fakeDeps({ makeBackend: async () => backend });
    const online = createOnline(deps);
    await online.init();
    expect(await online.top('global', 10)).toEqual([]);
    expect(await online.myRank('global', 5)).toBeNull();
  });

  it('exposes uid(); flush() drains the queue without re-init', async () => {
    const backend = fakeBackend();
    const { deps, q } = fakeDeps({ makeBackend: async () => backend });
    const online = createOnline(deps);
    await online.init();
    await new Promise((r) => setTimeout(r, 0));
    expect(online.uid()).toBe('u1');
    q.push({ board: 'global', score: 500 });
    online.flush();
    await new Promise((r) => setTimeout(r, 0));
    expect(backend.submitScore).toHaveBeenCalledWith('global', 'Neo', 500);
    expect(q).toEqual([]);
  });

  it('init is idempotent — a second call does not rebuild the backend', async () => {
    const make = vi.fn(async () => fakeBackend());
    const { deps } = fakeDeps({ makeBackend: make });
    const online = createOnline(deps);
    await online.init();
    await online.init();
    expect(make).toHaveBeenCalledTimes(1);
  });

  it('a synchronous throw from the backend still degrades to the queue', async () => {
    const backend = fakeBackend({ submitScore: () => { throw new Error('sync'); } });
    const { deps, q } = fakeDeps({ makeBackend: async () => backend });
    const online = createOnline(deps);
    await online.init();
    await new Promise((r) => setTimeout(r, 0));
    expect(() => online.submit('global', 42)).not.toThrow();
    expect(q).toEqual([{ board: 'global', score: 42 }]);
  });

  it('editName re-prompts with the current name and updates it', async () => {
    const backend = fakeBackend();
    const { deps, save } = fakeDeps({ makeBackend: async () => backend });
    // default getLocalSave returns name 'Neo'
    const online = createOnline(deps);
    await online.init();
    let shown = '';
    const result = await online.editName(async (current) => { shown = current; return 'Trinity'; });
    expect(shown).toBe('Neo');
    expect(result).toBe('Trinity');
    expect(online.name()).toBe('Trinity');
    expect(save.v.name).toBe('Trinity');
  });

  it('editName keeps the current name on cancel', async () => {
    const backend = fakeBackend();
    const { deps } = fakeDeps({ makeBackend: async () => backend });
    const online = createOnline(deps);
    await online.init();
    const result = await online.editName(async () => null);
    expect(result).toBe('Neo');
    expect(online.name()).toBe('Neo');
  });

  it('pushMaxZone writes the cloud save when ready', async () => {
    const backend = fakeBackend();
    const { deps } = fakeDeps({ makeBackend: async () => backend });
    const online = createOnline(deps);
    await online.init();
    online.pushMaxZone(4);
    expect(backend.saveCloudSave).toHaveBeenCalledWith({ maxZone: 4 });
  });

  it('init merges the backend maxZone into the local save', async () => {
    const backend = fakeBackend({ loadCloudSave: vi.fn(async () => ({ name: 'Neo', best: 0, maxZone: 5, updatedAt: 999 })) });
    const { deps, save } = fakeDeps({ makeBackend: async () => backend });
    const online = createOnline(deps);
    await online.init();
    expect(save.v.maxZone).toBe(5);
  });
});
