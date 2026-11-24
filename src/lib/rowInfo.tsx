import type { ReactNode } from "react";
import { deler, hasShaping, masker, partLabel, rader, type Location, type Segment } from "./pattern";
import type { Project } from "./types";

export interface RowInfo {
  /** navnet på delen, over tittelen */
  eyebrow: string;
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

/** Hva som skal stå om det du strikker akkurat nå. */
export function rowInfo(project: Project, segs: Segment[], loc: Location): RowInfo {
  if (!segs.length) {
    return {
      eyebrow: "",
      title: "Tell rader",
      sub: "Trykk på knappen hver gang en rad er ferdig. Vil du følge en oppskrift, legger du den inn under Rediger.",
      foot: null,
      status: "Uten oppskrift",
    };
  }
  const prefix = project.example ? "Eksempel · " : "";
  /* maskeantallet er bare interessant når oppskriften øker eller feller */
  const stitches = hasShaping(segs);
  if (loc.finished || !loc.seg) {
    return {
      eyebrow: "",
      title: "Ferdig strikket",
      sub: stitches ? `${masker(loc.st)} på pinnen. Alle delene er gjort.` : "Alle delene er gjort.",
      foot: null,
      status: `${prefix}Alle ${deler(segs.length)} er ferdige`,
    };
  }
  const s = loc.seg;
  const status = `${prefix}Del ${s.i + 1} av ${segs.length}`;
  const eyebrow = partLabel(s);
  const join = (...bits: string[]) => bits.filter(Boolean).join(" · ");

  if (s.type === "measure") {
    const before = project.last[s.i];
    return {
      eyebrow,
      title: s.cm > 0 ? `Strikk til delen måler ${s.cm} cm` : s.note || "Strikk til delen er lang nok",
      sub: join(s.cm > 0 ? s.note : "", stitches ? masker(loc.st) : "", before != null ? `forrige gang ble det ${rader(before)}` : ""),
      foot: null,
      status,
    };
  }
  if (s.type === "plain") {
    return {
      eyebrow,
      title: `Strikk ${rader(s.len)}`,
      sub: join(`${rader(s.len - loc.r)} igjen`, stitches ? masker(loc.st) : "", s.note),
      foot: bar(loc.r / s.len),
      status,
    };
  }
  const inc = s.type === "inc";
  const word = inc ? "økning" : "felling";
  const after = Math.max(0, loc.st + (inc ? s.by : -s.by));
  return {
    eyebrow,
    title: loc.shape ? `${inc ? "Øk" : "Fell"} ${masker(s.by)} på denne raden` : "Vanlig rad",
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
    status: `${status} · ${loc.k} av ${s.times} ${inc ? "økninger" : "fellinger"}`,
  };
}
