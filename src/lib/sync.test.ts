import { beforeEach, describe, expect, it } from "vitest";
import { clean } from "./clean";
import { createSync, type CloudAdapter, type CloudUser } from "./sync";
import type { AppState } from "./types";

const project = (id: string, name: string, count: number) => ({ id, name, count, yarn: "bringebaer", castOn: 5, parts: [], closed: {}, example: false });
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));
const names = (s: AppState | undefined) => s?.projects.map((p) => `${p.name}:${p.count}`);

/** En liksom-konto i minnet, så synken kan testes uten Firebase. */
function fakeCloud(initial?: AppState) {
  let remote: AppState | undefined = initial;
  let emit: (u: CloudUser | null) => void = () => {};
  const cloud = {
    offline: false,
    get remote() {
      return remote;
    },
    set remote(v: AppState | undefined) {
      remote = v;
    },
    adapter: {
      onUser(cb) {
        emit = cb;
        cb(null);
      },
      async signIn() {
        emit({ uid: "u1", label: "herman@example.com" });
      },
      async signOut() {
        emit(null);
      },
      async load() {
        return remote;
      },
      save(_uid, data) {
        if (cloud.offline) return new Promise<void>(() => {});
        remote = JSON.parse(JSON.stringify(data));
        return Promise.resolve();
      },
    } satisfies CloudAdapter,
  };
  return cloud;
}

function device(local: AppState, cloud: ReturnType<typeof fakeCloud>) {
  let state = local;
  const sync = createSync({
    getState: () => state,
    replaceState: (next) => void (state = next),
    touch: () => void (state = { ...state, updatedAt: Date.now() }),
    loadAdapter: async () => cloud.adapter,
    delays: { save: 5, retry: 10, settle: 40 },
  });
  return {
    sync,
    get state() {
      return state;
    },
    /** en endring på enheten, slik store.update gjør det */
    change(fn: (s: AppState) => void) {
      const draft: AppState = JSON.parse(JSON.stringify(state));
      fn(draft);
      draft.updatedAt = Date.now();
      state = draft;
      sync.changed();
    },
  };
}

describe("synk mot kontoen", () => {
  let cloud: ReturnType<typeof fakeCloud>;
  beforeEach(() => {
    cloud = fakeCloud(clean({ activeId: "r", projects: [project("r", "Fra laptopen", 40)], bank: [], updatedAt: 5000 }));
  });

  it("slår sammen prosjektene første gang du logger inn", async () => {
    const d = device(clean({ activeId: "l", projects: [project("l", "Lokalt", 3)], bank: [], updatedAt: 1000 }), cloud);
    d.sync.start();
    await tick();
    expect(d.sync.status().canSignIn).toBe(true);
    expect(await d.sync.signIn()).toBe("");
    await tick();
    expect(names(d.state)).toEqual(["Fra laptopen:40", "Lokalt:3"]);
    expect(names(cloud.remote)).toEqual(["Fra laptopen:40", "Lokalt:3"]);
    expect(d.sync.status().signedIn).toBe(true);
  });

  it("tar ikke med det urørte eksempelprosjektet inn på kontoen", async () => {
    const d = device(clean({}), cloud);
    d.sync.start();
    await tick();
    await d.sync.signIn();
    await tick();
    expect(names(d.state)).toEqual(["Fra laptopen:40"]);
  });

  it("lagrer endringer på kontoen og henter nyere endringer fra andre enheter", async () => {
    const d = device(clean({}), cloud);
    d.sync.start();
    await tick();
    await d.sync.signIn();
    await tick();
    d.change((s) => void s.projects[0].count++);
    await tick();
    expect(names(cloud.remote)).toEqual(["Fra laptopen:41"]);

    const other: AppState = JSON.parse(JSON.stringify(cloud.remote));
    other.projects[0].count = 77;
    other.updatedAt = Date.now() + 1000;
    cloud.remote = other;
    await d.sync.pull();
    expect(names(d.state)).toEqual(["Fra laptopen:77"]);
  });

  it("en fane uten endringer overskriver ikke en nyere kopi", async () => {
    const d = device(clean({}), cloud);
    d.sync.start();
    await tick();
    await d.sync.signIn();
    await tick();
    const other: AppState = JSON.parse(JSON.stringify(cloud.remote));
    other.projects[0].count = 99;
    other.updatedAt = Date.now() + 1000;
    cloud.remote = other;
    d.sync.flushIfDirty();
    await tick();
    expect(names(cloud.remote)).toEqual(["Fra laptopen:99"]);
  });

  it("nekter å logge ut før endringene er lagret, og tømmer enheten etterpå", async () => {
    const d = device(clean({}), cloud);
    d.sync.start();
    await tick();
    await d.sync.signIn();
    await tick();
    cloud.offline = true;
    d.change((s) => void s.projects[0].count++);
    expect(await d.sync.signOut()).toMatch(/ikke lagret på kontoen/);
    expect(d.sync.status().signedIn).toBe(true);
    expect(names(d.state)).toEqual(["Fra laptopen:41"]);
  });

  it("logger ut når alt er lagret", async () => {
    const d = device(clean({}), cloud);
    d.sync.start();
    await tick();
    await d.sync.signIn();
    await tick();
    d.change((s) => void s.projects[0].count++);
    await tick();
    expect(await d.sync.signOut()).toBe("");
    expect(d.sync.status().signedIn).toBe(false);
    expect(names(d.state)).toEqual(["Mitt strikketøy:0"]);
    expect(names(cloud.remote)).toEqual(["Fra laptopen:41"]);
  });

  it("sier fra når innlogging ikke er satt opp", () => {
    const sync = createSync({ getState: () => clean({}), replaceState: () => {}, touch: () => {}, loadAdapter: null });
    expect(sync.status()).toMatchObject({ signedIn: false, canSignIn: false });
    expect(sync.status().text).toMatch(/ikke satt opp/);
  });
});
