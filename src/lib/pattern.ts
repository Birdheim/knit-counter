/* Regnestykkene for oppskriften: hvor er jeg, og hva gjør jeg på denne raden?
   Alt her er rene funksjoner uten sideeffekter, så de er lette å teste. */
import type { PartType, Project } from "./types";

/** En del av oppskriften, regnet ut for ett bestemt prosjekt. */
export interface Segment {
  i: number;
  type: PartType;
  /** masker når delen starter og slutter */
  start: number;
  end: number;
  by: number;
  every: number;
  name: string;
  cm: number;
  note: string;
  /** måledel uten fast lengde: varer til du trykker «Ferdig med delen» */
  open: boolean;
  /** antall økninger/fellinger i delen */
  times: number;
  /** antall rader (Infinity for en åpen del som ikke er avsluttet) */
  len: number;
}

export interface Location {
  /** oppskriften er strikket ferdig */
  finished: boolean;
  /** delen du er i (mangler når oppskriften er ferdig) */
  seg?: Segment;
  /** rader ferdig i denne delen */
  r: number;
  /** masker på pinnen før denne raden */
  st: number;
  /** denne raden er en økning/felling */
  shape: boolean;
  /** rader igjen før neste økning/felling (0 = denne raden) */
  toNext: number;
  /** økninger/fellinger gjort i delen */
  k: number;
  /** plassen i intervallet, 0-basert */
  pos: number;
}

export function plan(p: Project): Segment[] {
  let st = p.castOn;
  return p.parts.map((part, i) => {
    const s: Segment = {
      i, type: part.type, start: st, end: st, by: part.by, every: part.every,
      name: part.name, cm: part.cm, note: part.note, open: false, times: 0, len: 0,
    };
    if (part.type === "measure") {
      s.open = true;
      s.len = p.closed[i] != null ? p.closed[i] : Infinity;
    } else if (part.type === "plain") {
      s.len = part.rows;
    } else {
      const diff = part.type === "inc" ? part.target - st : st - part.target;
      s.times = Math.max(0, Math.ceil(diff / part.by));
      s.len = s.times * part.every;
      s.end = part.type === "inc" ? st + part.by * s.times : Math.max(0, st - part.by * s.times);
    }
    st = s.end;
    return s;
  });
}

export function locate(p: Project, segs: Segment[]): Location {
  let rem = p.count;
  let st = p.castOn;
  for (const s of segs) {
    if (rem < s.len) {
      const loc: Location = { finished: false, seg: s, r: rem, st: s.start, shape: false, toNext: 0, k: 0, pos: 0 };
      if (s.type === "inc" || s.type === "dec") {
        loc.k = Math.floor(rem / s.every);
        loc.pos = rem % s.every;
        /* økningen kommer på den siste raden i hvert intervall: rad 8, 16, 24 ved «hver 8. rad» */
        loc.shape = loc.pos === s.every - 1;
        loc.toNext = s.every - 1 - loc.pos;
        loc.st = s.type === "inc" ? s.start + s.by * loc.k : Math.max(0, s.start - s.by * loc.k);
      }
      return loc;
    }
    rem -= s.len;
    st = s.end;
  }
  return { finished: true, r: rem, st, shape: false, toNext: 0, k: 0, pos: 0 };
}

/** [rader strikket, masker] i hvert punkt der kanten på arbeidet skifter retning. Brukes av tegningen. */
export function profile(p: Project, segs: Segment[]): [number, number][] {
  const pts: [number, number][] = [[0, p.castOn]];
  let rem = p.count;
  let done = 0;
  let st = p.castOn;
  const add = (r: number, s: number) => {
    const last = pts[pts.length - 1];
    if (last[0] !== r || last[1] !== s) pts.push([r, s]);
  };
  for (const s of segs) {
    if (rem <= 0) break;
    const take = Math.min(rem, s.len);
    if (s.type === "inc" || s.type === "dec") {
      const k = Math.floor(take / s.every);
      if (k > 0) {
        st = s.type === "inc" ? s.start + s.by * k : Math.max(0, s.start - s.by * k);
        add(done + k * s.every, st);
      }
    }
    done += take;
    rem -= take;
    add(done, st);
  }
  if (rem > 0) add(done + rem, st);
  return pts;
}

export const masker = (n: number) => `${n} ${n === 1 ? "maske" : "masker"}`;
export const rader = (n: number) => `${n} ${n === 1 ? "rad" : "rader"}`;
export const deler = (n: number) => `${n} ${n === 1 ? "del" : "deler"}`;

const TYPE_LABEL: Record<PartType, string> = { inc: "Økning", dec: "Felling", plain: "Rader", measure: "Mål" };

/** Navnet på en del: det du har kalt den, ellers typen. */
export const partLabel = (part: { type: PartType; name: string }) => part.name.trim() || TYPE_LABEL[part.type];

/** Har oppskriften økninger eller fellinger? Da er maskeantallet verdt å vise. */
export const hasShaping = (segs: Segment[]) => segs.some((s) => s.type === "inc" || s.type === "dec");

/** Kort status til prosjektlista: «Del 2 av 5 · Legg». */
export function summary(p: Project): string {
  const segs = plan(p);
  const loc = locate(p, segs);
  if (!segs.length) return p.count ? `${rader(p.count)} strikket` : "Ikke startet";
  if (loc.finished || !loc.seg) return "Ferdig strikket";
  return `Del ${loc.seg.i + 1} av ${segs.length} · ${partLabel(loc.seg)}`;
}
