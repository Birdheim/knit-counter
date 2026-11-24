export type PartType = "inc" | "dec" | "plain";

/** Én del av en oppskrift: øk, fell eller strikk rett frem. */
export interface Part {
  type: PartType;
  /** masker per økning/felling */
  by: number;
  /** hvor mange rader mellom hver økning/felling */
  every: number;
  /** antall masker når delen er ferdig */
  target: number;
  /** antall rader i en «rett frem»-del. 0 betyr «til mål»: delen varer til du trykker Neste del */
  rows: number;
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
  /** hvor mange rader hver «til mål»-del ble, etter at du trykket Neste del (nøkkel = delens indeks) */
  closed: Record<string, number>;
  /** sant så lenge oppskriften er eksempeltallene */
  example: boolean;
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
