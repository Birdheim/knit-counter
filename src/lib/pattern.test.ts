import { describe, expect, it } from "vitest";
import { cleanProject } from "./clean";
import { locate, partLabel, plan, profile, summary } from "./pattern";
import type { Project } from "./types";

/** Legg opp 4, øk hver 8. rad til 26 masker, strikk til mål, fell hver 8. rad til 4 masker. */
function scarf(count: number, closed: Record<string, number> = {}): Project {
  return cleanProject({
    id: "a", name: "Skjerf", count, yarn: "bringebaer", castOn: 4, closed, example: false,
    parts: [
      { type: "inc", by: 1, every: 8, target: 26 },
      { type: "measure", name: "Midten", cm: 30 },
      { type: "dec", by: 1, every: 8, target: 4 },
    ],
  });
}
const at = (p: Project) => locate(p, plan(p));

describe("plan", () => {
  it("regner ut økninger, rader og masker for hver del", () => {
    const segs = plan(scarf(0));
    expect(segs[0]).toMatchObject({ times: 22, len: 176, start: 4, end: 26 });
    expect(segs[1]).toMatchObject({ open: true, len: Infinity, start: 26, end: 26 });
    expect(segs[2]).toMatchObject({ times: 22, len: 176, start: 26, end: 4 });
  });

  it("gir en del uten rader når målet allerede er nådd", () => {
    const p = cleanProject({ castOn: 20, parts: [{ type: "inc", by: 1, every: 4, target: 10 }], count: 0 });
    expect(plan(p)[0]).toMatchObject({ times: 0, len: 0 });
    expect(at(p).finished).toBe(true);
  });
});

describe("locate", () => {
  it("starter på en vanlig rad med økning om sju rader", () => {
    expect(at(scarf(0))).toMatchObject({ shape: false, st: 4, toNext: 7, k: 0 });
  });

  it("øker på den siste raden i hvert intervall", () => {
    expect(at(scarf(7))).toMatchObject({ shape: true, st: 4, toNext: 0 });
    expect(at(scarf(8))).toMatchObject({ shape: false, st: 5, k: 1 });
    expect(at(scarf(15)).shape).toBe(true);
  });

  it("blir i «til mål»-delen til den avsluttes", () => {
    const open = at(scarf(176 + 500));
    expect(open.seg?.i).toBe(1);
    expect(open.r).toBe(500);
    const closed = at(scarf(176 + 40, { "1": 40 }));
    expect(closed.seg?.i).toBe(2);
    expect(closed).toMatchObject({ st: 26, r: 0 });
  });

  it("feller ned igjen og blir ferdig", () => {
    const closed = { "1": 40 };
    expect(at(scarf(176 + 40 + 7, closed))).toMatchObject({ shape: true, st: 26 });
    expect(at(scarf(176 + 40 + 175, closed))).toMatchObject({ shape: true, st: 5 });
    expect(at(scarf(176 + 40 + 176, closed))).toMatchObject({ finished: true, st: 4 });
  });
});

describe("profile og summary", () => {
  it("følger maskeantallet oppover og nedover", () => {
    expect(profile(scarf(0), plan(scarf(0)))).toEqual([[0, 4]]);
    const p = scarf(176 + 40 + 16, { "1": 40 });
    expect(profile(p, plan(p))).toEqual([[0, 4], [176, 26], [216, 26], [232, 24]]);
  });

  it("gir en kort status", () => {
    expect(summary(scarf(27))).toBe("Del 1 av 3 · Økning");
    expect(summary(scarf(200))).toBe("Del 2 av 3 · Midten");
    expect(summary(cleanProject({ parts: [], count: 12 }))).toBe("12 rader strikket");
    expect(summary(cleanProject({ parts: [], count: 0 }))).toBe("Ikke startet");
  });
});

describe("deler som måles", () => {
  it("leser gamle «til mål»-deler som måledeler", () => {
    const p = cleanProject({ parts: [{ type: "plain", rows: 0, note: "til 30 cm" }, { type: "plain", rows: 12 }], count: 0 });
    expect(p.parts.map((x) => x.type)).toEqual(["measure", "plain"]);
    expect(plan(p)[0]).toMatchObject({ open: true, len: Infinity });
    expect(plan(p)[1]).toMatchObject({ open: false, len: 12 });
  });

  it("teller radene i en måledel og går videre når den avsluttes", () => {
    const parts = [{ type: "measure", name: "Legg", cm: 15 }, { type: "measure", name: "Fot", cm: 18 }];
    const knitting = cleanProject({ parts, count: 48 });
    expect(at(knitting)).toMatchObject({ r: 48 });
    expect(partLabel(at(knitting).seg!)).toBe("Legg");
    const done = cleanProject({ parts, count: 50, closed: { "0": 48 } });
    expect(at(done)).toMatchObject({ r: 2 });
    expect(partLabel(at(done).seg!)).toBe("Fot");
  });

  it("bruker typen som navn når delen ikke har et", () => {
    expect(partLabel({ type: "measure", name: " " })).toBe("Mål");
    expect(partLabel({ type: "inc", name: "" })).toBe("Økning");
  });
});

describe("eksemplene", () => {
  it("går opp, og det første er det et nytt prosjekt starter med", async () => {
    const { BUILTIN, clean, cleanPart } = await import("./clean");
    for (const b of BUILTIN) {
      const p = { ...clean({}).projects[0], castOn: b.castOn, parts: b.parts };
      const segs = plan(p);
      expect(segs).toHaveLength(b.parts.length);
      for (const s of segs) expect(s.open || s.len > 0).toBe(true);
    }
    const first = clean({}).projects[0];
    expect(first.castOn).toBe(BUILTIN[0].castOn);
    expect(first.parts).toEqual(BUILTIN[0].parts);
    expect(first.example).toBe(true);
    /* merknaden fra et eksempel som er tatt ut, skrives om der den ligger lagret */
    expect(cleanPart({ type: "measure", note: "til skjerfet er langt nok" }).note).toBe("til det er langt nok");
    expect(JSON.stringify(BUILTIN).toLowerCase()).not.toContain("skjerf");
  });
});
