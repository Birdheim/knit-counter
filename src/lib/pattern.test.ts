import { describe, expect, it } from "vitest";
import { cleanProject } from "./clean";
import { locate, plan, profile, summary } from "./pattern";
import type { Project } from "./types";

/** Legg opp 4, øk hver 8. rad til 26 masker, strikk til mål, fell hver 8. rad til 4 masker. */
function scarf(count: number, closed: Record<string, number> = {}): Project {
  return cleanProject({
    id: "a", name: "Skjerf", count, yarn: "bringebaer", castOn: 4, closed, example: false,
    parts: [
      { type: "inc", by: 1, every: 8, target: 26 },
      { type: "plain", rows: 0, note: "til 30 cm" },
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
    expect(summary(scarf(27))).toBe("Rad 28 · del 1 av 3");
    expect(summary(cleanProject({ parts: [], count: 12 }))).toBe("Rad 13");
  });
});
