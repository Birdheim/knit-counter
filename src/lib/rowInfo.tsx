import type { ReactNode } from "react";
import { deler, masker, rader, type Location, type Segment } from "./pattern";
import type { Project } from "./types";

export interface RowInfo {
  title: string;
  sub: string;
  foot: ReactNode;
  /** kort status til toppen av siden */
  status: string;
}

const bar = (part: number) => (
  <span className="bar">
    <i style={{ width: `${Math.round(part * 100)}%` }} />
  </span>
);

/** Hva som skal stå om raden du strikker nå. */
export function rowInfo(project: Project, segs: Segment[], loc: Location): RowInfo {
  if (!segs.length) {
    return {
      title: "Tell rader",
      sub: "Legg inn oppskriften i Oppsett, så sier telleren fra når du skal øke eller felle.",
      foot: null,
      status: "Ingen oppskrift",
    };
  }
  const prefix = project.example ? "Eksempel · " : "";
  if (loc.finished || !loc.seg) {
    return {
      title: "Oppskriften er ferdig",
      sub: `${masker(loc.st)} på pinnen`,
      foot: "Ingen flere deler.",
      status: `${prefix}Alle ${deler(segs.length)} er strikket`,
    };
  }
  const s = loc.seg;
  const part = `${prefix}Del ${s.i + 1} av ${segs.length}`;
  if (s.type === "plain") {
    if (s.open) {
      return {
        title: "Vanlig rad",
        sub: masker(loc.st) + (s.note ? ` · ${s.note}` : ""),
        foot: `Rad ${loc.r + 1} i denne delen. Trykk Neste del når du er ferdig.`,
        status: part,
      };
    }
    return {
      title: "Vanlig rad",
      sub: `${masker(loc.st)} · ${rader(s.len - loc.r)} igjen`,
      foot: bar(loc.r / s.len),
      status: part,
    };
  }
  const inc = s.type === "inc";
  const word = inc ? "økning" : "felling";
  const after = Math.max(0, loc.st + (inc ? s.by : -s.by));
  return {
    title: loc.shape ? `${inc ? "Øk" : "Fell"} ${masker(s.by)}` : "Vanlig rad",
    sub: loc.shape
      ? `${loc.st} → ${masker(after)}`
      : `${masker(loc.st)} · ${loc.toNext === 1 ? `${word} på neste rad` : `${word} om ${rader(loc.toNext)}`}`,
    foot:
      s.every <= 12 ? (
        <span className="dots" aria-hidden="true">
          {Array.from({ length: s.every }, (_, d) => {
            const last = d === s.every - 1;
            const cls = [d < loc.pos ? "past" : "", d === loc.pos ? "cur" : "", last ? "mark" : ""].filter(Boolean).join(" ");
            return (
              <i key={d} className={cls}>
                {last ? (inc ? "+" : "−") : null}
              </i>
            );
          })}
        </span>
      ) : (
        bar(loc.pos / s.every)
      ),
    status: `${part} · ${loc.k} av ${s.times} ${inc ? "økninger" : "fellinger"}`,
  };
}
