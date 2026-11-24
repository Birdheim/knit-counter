/* Synk mot kontoen. Enheten har alltid sin egen kopi, og den nyeste kopien vinner.
   Selve skytjenesten ligger bak `CloudAdapter`, så logikken her kan testes uten Firebase. */
import { clean, MAX_BANK, MAX_PROJECTS } from "./clean";
import type { AppState } from "./types";

export interface CloudUser {
  uid: string;
  name: string;
  email: string;
}

export interface CloudAdapter {
  /** kalles hver gang innloggingen endrer seg, også første gang */
  onUser(cb: (user: CloudUser | null) => void): void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** gir undefined hvis kontoen ikke har lagret noe ennå */
  load(uid: string): Promise<unknown | undefined>;
  save(uid: string, data: AppState): Promise<void>;
}

export interface AccountStatus {
  /** innlogging er satt opp for siden */
  available: boolean;
  signedIn: boolean;
  canSignIn: boolean;
  name: string;
  email: string;
  /** local = bare på enheten, synced = alt er på kontoen, pending = lagrer, error = får ikke lagret */
  sync: "local" | "synced" | "pending" | "error";
  text: string;
}

interface Deps {
  getState(): AppState;
  /** bytt ut hele tilstanden (uten å endre updatedAt) */
  replaceState(next: AppState): void;
  /** stemple tilstanden som endret nå */
  touch(): void;
  /** null betyr at innlogging ikke er satt opp */
  loadAdapter: (() => Promise<CloudAdapter>) | null;
  /** ventetider, kortes ned i tester */
  delays?: { save: number; retry: number; settle: number };
}

/** Første innlogging på en enhet som allerede har prosjekter: behold begge settene. */
export function mergeStates(remote: AppState, local: AppState): AppState {
  const ids = new Set(remote.projects.map((p) => p.id));
  const names = new Set(remote.bank.map((b) => b.name.trim().toLowerCase()));
  const projects = [...remote.projects];
  const bank = [...remote.bank];
  for (const p of local.projects) if (!ids.has(p.id) && projects.length < MAX_PROJECTS) projects.push(p);
  for (const b of local.bank) if (!names.has(b.name.trim().toLowerCase()) && bank.length < MAX_BANK) bank.push(b);
  return clean({ ...remote, projects, bank, activeId: local.activeId });
}

const errorCode = (e: unknown) => (e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "");
const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function createSync(deps: Deps) {
  const delays = deps.delays ?? { save: 700, retry: 1200, settle: 3000 };
  let cloud: "off" | "loading" | "ready" | "failed" = deps.loadAdapter ? "loading" : "off";
  let adapter: CloudAdapter | null = null;
  let user: CloudUser | null = null;
  let writing: Promise<void> | null = null;
  let dirty = false;
  let retried = false;
  let synced = true;
  let syncError = false;
  let mergeNext = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const listeners = new Set<() => void>();
  let status = buildStatus();

  function buildStatus(): AccountStatus {
    const who = user ? user.name || user.email || "Google-kontoen din" : "";
    const text = user
      ? syncError
        ? `Logget inn som ${who}, men får ikke lagret på kontoen akkurat nå.`
        : `Logget inn som ${who}. Prosjektene følger kontoen din.`
      : cloud === "off"
        ? "Lagres på denne enheten. Innlogging er ikke satt opp ennå."
        : cloud === "loading"
          ? "Lagres på denne enheten. Kobler til …"
          : cloud === "failed"
            ? "Lagres på denne enheten. Fikk ikke kontakt med innloggingen."
            : "Lagres på denne enheten. Logg inn for å ha de samme prosjektene på alle enhetene dine.";
    return {
      available: cloud !== "off",
      signedIn: !!user,
      canSignIn: cloud === "ready" && !user,
      name: user?.name ?? "",
      email: user?.email ?? "",
      sync: !user ? "local" : syncError ? "error" : synced ? "synced" : "pending",
      text,
    };
  }
  function tell() {
    status = buildStatus();
    listeners.forEach((fn) => fn());
  }

  function flush(): Promise<void> {
    clearTimeout(timer);
    if (!adapter || !user) return Promise.resolve();
    if (writing) {
      dirty = true;
      return writing;
    }
    const snapshot = deps.getState();
    writing = adapter.save(user.uid, snapshot).then(
      () => {
        retried = false;
        syncError = false;
        if (deps.getState().updatedAt === snapshot.updatedAt) synced = true;
      },
      (e) => {
        if (errorCode(e) === "unavailable" && !retried) {
          retried = true;
          dirty = true;
        } else syncError = true;
      },
    ).then(() => {
      writing = null;
      tell();
      if (dirty && user) {
        dirty = false;
        timer = setTimeout(flush, delays.retry);
      }
    });
    return writing;
  }

  function pull(): Promise<void> {
    if (!adapter || !user) return Promise.resolve();
    const merge = mergeNext;
    mergeNext = false;
    return adapter.load(user.uid).then(
      (data) => {
        const local = deps.getState();
        if (data !== undefined) {
          const remote = clean(data);
          if (merge && local.updatedAt > 0) {
            deps.replaceState(mergeStates(remote, local));
            deps.touch();
            synced = false;
            void flush();
          } else if (remote.updatedAt > local.updatedAt) deps.replaceState(remote);
          else if (local.updatedAt > remote.updatedAt) {
            synced = false;
            void flush();
          }
        } else if (local.updatedAt > 0) {
          synced = false;
          void flush();
        }
        syncError = false;
        tell();
      },
      (e) => {
        if (errorCode(e) === "permission-denied") {
          syncError = true;
          tell();
        }
      },
    );
  }

  function start() {
    if (!deps.loadAdapter) return;
    deps.loadAdapter().then(
      (a) => {
        adapter = a;
        a.onUser((u) => {
          user = u;
          cloud = "ready";
          tell();
          if (u) void pull();
        });
      },
      () => {
        cloud = "failed";
        tell();
      },
    );
  }

  return {
    start,
    pull,
    status: () => status,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    /** kalles etter hver endring på enheten */
    changed() {
      if (!user) return;
      if (synced) {
        synced = false;
        tell();
      }
      clearTimeout(timer);
      timer = setTimeout(flush, delays.save);
    },
    /** når siden forlates: send bare det som ikke er lagret, så en gammel fane aldri overskriver en nyere kopi */
    flushIfDirty() {
      if (!synced) void flush();
    },
    /** gir en feiltekst tilbake hvis noe gikk galt, ellers en tom streng */
    signIn(): Promise<string> {
      if (!adapter) return Promise.resolve("");
      mergeNext = true;
      return adapter.signIn().then(
        () => "",
        (e) => {
          mergeNext = false;
          const code = errorCode(e);
          if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return "";
          if (code === "auth/popup-blocked") return "Nettleseren blokkerte innloggingsvinduet. Tillat popup-vinduer for siden og prøv igjen.";
          if (code === "auth/unauthorized-domain") return "Dette domenet er ikke godkjent i Firebase ennå. Legg det til under Authentication, Settings, Authorized domains.";
          if (code === "auth/operation-not-allowed") return "Google-innlogging er ikke slått på i Firebase-prosjektet.";
          return `Innloggingen gikk ikke (${code || "ukjent feil"}). Prøv igjen.`;
        },
      );
    },
    /** utlogging tømmer enheten, så kontoen må ha den nyeste kopien først */
    async signOut(): Promise<string> {
      if (!adapter || !user) return "";
      for (let i = 0; i < 3 && !synced; i++) {
        await Promise.race([flush(), wait(delays.settle)]);
        if (!synced) await wait(delays.retry + 100);
      }
      if (!synced) return "De siste endringene er ikke lagret på kontoen ennå. Sjekk nettet og prøv igjen.";
      try {
        await adapter.signOut();
      } catch {
        return "Fikk ikke logget ut. Prøv igjen.";
      }
      user = null;
      synced = true;
      deps.replaceState(clean({}));
      tell();
      return "";
    },
  };
}
