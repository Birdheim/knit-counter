/* Standardverdier og opprydding. Alt som leses fra lagring går gjennom `clean`,
   så resten av koden kan stole på at dataene har riktig form. */
import type { AppState, BuiltinPattern, Part, PartType, Pattern, Project } from "./types";
import { YARNS } from "./yarns";

export const MAX_PARTS = 12;
export const MAX_PROJECTS = 20;
export const MAX_BANK = 20;

type Loose = Record<string, unknown>;
const obj = (o: unknown): Loose => (o && typeof o === "object" ? (o as Loose) : {});

function int(v: unknown, min: number, max: number, fallback: number): number {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

export function newId(): string {
  return (Math.random().toString(36).slice(2, 10) || "x") + (Date.now() % 1000);
}
const okId = (v: unknown) => (typeof v === "string" && /^[a-z0-9-]{1,24}$/.test(v) ? v : newId());

export function cleanPart(input: unknown): Part {
  const p = obj(input);
  let type: PartType = p.type === "dec" || p.type === "plain" || p.type === "measure" ? p.type : "inc";
  const rows = int(p.rows, 0, 9999, 0);
  /* eldre lagringer brukte «plain» med 0 rader for en del som strikkes til mål */
  if (type === "plain" && rows === 0) type = "measure";
  return {
    type,
    name: typeof p.name === "string" ? p.name.slice(0, 24) : "",
    by: int(p.by, 1, 9, 1),
    every: int(p.every, 1, 99, 2),
    target: int(p.target, 0, 999, 10),
    rows: type === "plain" ? Math.max(1, rows) : rows,
    cm: int(p.cm, 0, 999, 0),
    note: typeof p.note === "string" ? p.note.slice(0, 60) : "",
  };
}

/** Tallene i de ferdige oppskriftene er eksempler, ikke hentet fra en utgitt oppskrift. */
export const BUILTIN: BuiltinPattern[] = [
  {
    id: "b-skjerf", name: "Skjerf fra spiss til spiss", desc: "Øk, strikk til mål, fell. Tallene er eksempler.",
    castOn: 5, example: true, projectName: "Nytt skjerf",
    parts: [
      { type: "inc", name: "Øk", by: 1, every: 6, target: 15 },
      { type: "measure", name: "Midten", note: "til skjerfet er langt nok" },
      { type: "dec", name: "Fell", by: 1, every: 6, target: 5 },
    ].map(cleanPart),
  },
  {
    id: "b-sokker", name: "Sokker", desc: "Vrangbord, legg, hæl, fot og tå, målt i cm. Tallene er eksempler.",
    castOn: 60, example: true, projectName: "Nye sokker",
    parts: [
      { type: "measure", name: "Vrangbord", cm: 5 },
      { type: "measure", name: "Legg", cm: 15 },
      { type: "measure", name: "Hæl", note: "strikk hælen etter oppskriften" },
      { type: "measure", name: "Fot", cm: 18 },
      { type: "measure", name: "Tå", note: "fell til tå etter oppskriften" },
    ].map(cleanPart),
  },
];

/** Tall-map med delindeks som nøkkel (closed og last). */
function rowMap(input: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(obj(input))) {
    if (/^\d+$/.test(k)) out[k] = int(v, 0, 99999, 0);
  }
  return out;
}

export function cleanProject(input: unknown): Project {
  const o = obj(input);
  const has = Array.isArray(o.parts);
  return {
    id: okId(o.id),
    name: typeof o.name === "string" ? o.name.slice(0, 40) : "Mitt strikketøy",
    count: int(o.count, 0, 99999, 0),
    yarn: YARNS.some((y) => y.id === o.yarn) ? (o.yarn as string) : YARNS[0].id,
    castOn: int(o.castOn, 1, 999, 5),
    parts: has ? (o.parts as unknown[]).slice(0, MAX_PARTS).map(cleanPart) : BUILTIN[0].parts.map(cleanPart),
    closed: has ? rowMap(o.closed) : {},
    last: has ? rowMap(o.last) : {},
    example: has ? o.example === true : true,
  };
}

function cleanPattern(input: unknown): Pattern {
  const o = obj(input);
  return {
    id: okId(o.id),
    name: typeof o.name === "string" && o.name.trim() ? o.name.slice(0, 40) : "Uten navn",
    castOn: int(o.castOn, 1, 999, 5),
    parts: Array.isArray(o.parts) ? o.parts.slice(0, MAX_PARTS).map(cleanPart) : [],
  };
}

function unique<T extends { id: string }>(list: T[]): T[] {
  const seen = new Set<string>();
  for (const x of list) {
    while (seen.has(x.id)) x.id = newId();
    seen.add(x.id);
  }
  return list;
}

export function clean(input: unknown): AppState {
  const o = obj(input);
  /* en eldre lagring hadde ett prosjekt på toppnivå */
  let projects = Array.isArray(o.projects) ? o.projects.slice(0, MAX_PROJECTS).map(cleanProject) : [cleanProject(o)];
  if (!projects.length) projects = [cleanProject({})];
  unique(projects);
  const bank = unique(Array.isArray(o.bank) ? o.bank.slice(0, MAX_BANK).map(cleanPattern) : []);
  const activeId = projects.some((p) => p.id === o.activeId) ? (o.activeId as string) : projects[0].id;
  return { activeId, projects, bank, updatedAt: int(o.updatedAt, 0, 8.64e15, 0) };
}

/** Bare måledeler kan være avsluttet for hånd. Rydder bort lengder som hører til deler som er endret. */
export function fixClosed(p: Project): void {
  for (const map of [p.closed, p.last]) {
    for (const k of Object.keys(map)) {
      if (p.parts[Number(k)]?.type !== "measure") delete map[k];
    }
  }
}
