/** inc = øk, dec = fell, plain = et fast antall rader, measure = strikk til et mål (uten å måtte telle) */
export type PartType = "inc" | "dec" | "plain" | "measure";

/** Én del av en oppskrift. */
export interface Part {
  type: PartType;
  /** valgfritt navn, f.eks. «Legg» eller «Vrangbord» */
  name: string;
  /** masker per økning/felling */
  by: number;
  /** hvor mange rader mellom hver økning/felling */
  every: number;
  /** antall masker når delen er ferdig */
  target: number;
  /** antall rader i en «plain»-del */
  rows: number;
  /** målet i en «measure»-del, i cm. 0 betyr at det ikke er satt */
  cm: number;
  note: string;
}

export interface Project {
  id: string;
  name: string;
  /** antall rader som er ferdige */
  count: number;
  yarn: string;
  castOn: number;
  parts: Part[];
  /** hvor mange rader hver måledel ble, etter at du trykket «Ferdig med delen» (nøkkel = delens indeks) */
  closed: Record<string, number>;
  /** det samme fra forrige gang du strikket prosjektet, så sokk nummer to kan bli lik den første */
  last: Record<string, number>;
  /** sant så lenge oppskriften er eksempeltallene */
  example: boolean;
  /** oppskriften er lest fra PDF av en AI-modell og ikke sett over ennå.
      Listen er det du bør sjekke (kan være tom). null = ingenting å sjekke. */
  check: string[] | null;
}

/** En oppskrift i banken. */
export interface Pattern {
  id: string;
  name: string;
  castOn: number;
  parts: Part[];
}

export interface BuiltinPattern extends Pattern {
  desc: string;
  example: boolean;
  projectName: string;
}

/** Alt som lagres, både på enheten og på kontoen. */
export interface AppState {
  activeId: string;
  projects: Project[];
  bank: Pattern[];
  updatedAt: number;
}
