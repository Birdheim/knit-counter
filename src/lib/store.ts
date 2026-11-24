/* Appens tilstand. Komponentene leser den med useAppState() og endrer den med
   funksjonene nederst. Alt lagres i localStorage med én gang, og sendes til kontoen
   hvis du er logget inn. */
import { BUILTIN, clean, cleanPart, cleanProject, fixClosed, MAX_BANK, MAX_PROJECTS, newId } from "./clean";
import { cloudConfigured, loadFirebase } from "./firebase";
import { createSync } from "./sync";
import type { AppState, Pattern, Project } from "./types";
import { YARNS } from "./yarns";

const KEY = "knitcounter-v1";

function load(): AppState {
  try {
    return clean(JSON.parse(localStorage.getItem(KEY) ?? "null"));
  } catch {
    return clean({});
  }
}

let state = load();
const listeners = new Set<() => void>();

function set(next: AppState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* privat modus eller full lagring: appen virker videre uten */
  }
  listeners.forEach((fn) => fn());
}

export const sync = createSync({
  getState: () => state,
  replaceState: set,
  touch: () => set({ ...state, updatedAt: Date.now() }),
  loadAdapter: cloudConfigured ? loadFirebase : null,
});

export const store = {
  get: () => state,
  subscribe(fn: () => void) {
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  },
  /** Endre tilstanden: du får en kopi du kan skrive rett i. */
  update(change: (draft: AppState) => void) {
    const draft: AppState = JSON.parse(JSON.stringify(state));
    change(draft);
    if (!draft.projects.some((p) => p.id === draft.activeId)) draft.activeId = draft.projects[0].id;
    draft.updatedAt = Date.now();
    set(draft);
    sync.changed();
  },
};

/** Kalles én gang når appen starter. */
export function startSync() {
  sync.start();
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") sync.flushIfDirty();
    else void sync.pull();
  });
}

/* ---------- endringer ---------- */

export const findProject = (s: AppState, id: string | undefined) => s.projects.find((p) => p.id === id);

/** Endre ett prosjekt. */
export function updateProject(id: string, change: (p: Project) => void) {
  store.update((d) => {
    const p = findProject(d, id);
    if (p) change(p);
  });
}

/** Endre oppskriften i et prosjekt. Da er den ikke lenger eksempelet. */
export function editPattern(id: string, change: (p: Project) => void) {
  updateProject(id, (p) => {
    change(p);
    p.example = false;
    fixClosed(p);
  });
}

export function setActive(id: string) {
  if (state.activeId !== id && findProject(state, id)) store.update((d) => void (d.activeId = id));
}

/** Start et nytt prosjekt fra en oppskrift. Gir id-en tilbake, eller null hvis det er fullt. */
export function addProject(pattern: Pattern & { example?: boolean }, name: string): string | null {
  if (state.projects.length >= MAX_PROJECTS) return null;
  const used = new Set(state.projects.map((p) => p.yarn));
  const yarn = (YARNS.find((y) => !used.has(y.id)) ?? YARNS[state.projects.length % YARNS.length]).id;
  const project = cleanProject({
    id: newId(), name, count: 0, yarn, castOn: pattern.castOn, parts: pattern.parts, closed: {}, example: !!pattern.example,
  });
  store.update((d) => {
    d.projects.push(project);
    d.activeId = project.id;
  });
  return project.id;
}

export function deleteProject(id: string) {
  store.update((d) => {
    d.projects = d.projects.filter((p) => p.id !== id);
    if (!d.projects.length) d.projects = [cleanProject({ name: "Nytt prosjekt", parts: [], count: 0 })];
  });
}

/** Lagre oppskriften i et prosjekt i banken, under prosjektets navn. */
export function saveToBank(id: string): boolean {
  const p = findProject(state, id);
  if (!p || !p.parts.length) return false;
  const name = p.name.trim() || "Uten navn";
  const at = state.bank.findIndex((b) => b.name.trim().toLowerCase() === name.toLowerCase());
  if (at < 0 && state.bank.length >= MAX_BANK) return false;
  store.update((d) => {
    const entry: Pattern = { id: at >= 0 ? d.bank[at].id : newId(), name, castOn: p.castOn, parts: p.parts.map(cleanPart) };
    if (at >= 0) d.bank[at] = entry;
    else d.bank.push(entry);
  });
  return true;
}

export function removeFromBank(id: string) {
  store.update((d) => void (d.bank = d.bank.filter((b) => b.id !== id)));
}

/** Banken: dine egne oppskrifter først, så de ferdige. */
export function bankEntries(s: AppState): (Pattern & { desc?: string; example?: boolean; projectName?: string })[] {
  return [...s.bank, ...BUILTIN];
}
