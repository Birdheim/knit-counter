import { describe, expect, it } from "vitest";
import { MAX_PARTS, cleanProject } from "./clean";
import { locate, plan } from "./pattern";
import { MAX_PDF_BYTES, ReadError, buildPrompt, checkFile, checkList, parseReading } from "./readPattern";

/** Et svar slik modellen gir det. Tallene er funnet på til testen. */
const scarf = {
  isPattern: true,
  name: "Trekantskjerf",
  sizes: [],
  size: "",
  castOn: 4,
  parts: [
    { name: "Øk", type: "inc", by: 1, every: 4, target: 20 },
    { name: "Midten", type: "measure", cm: 30 },
    { name: "Fell", type: "dec", by: 1, every: 4, target: 4 },
  ],
  warnings: [],
};
const code = (fn: () => unknown) => {
  try {
    fn();
  } catch (e) {
    return e instanceof ReadError ? e.code : "annet";
  }
  return "ingen feil";
};

describe("parseReading", () => {
  it("gjør svaret om til deler som telleren kan bruke", () => {
    const r = parseReading(JSON.stringify(scarf));
    expect(r.name).toBe("Trekantskjerf");
    expect(r.castOn).toBe(4);
    expect(r.parts.map((p) => p.type)).toEqual(["inc", "measure", "dec"]);
    expect(r.parts[1].cm).toBe(30);
    expect(r.warnings).toEqual([]);

    const project = cleanProject({ id: "a", name: r.name, castOn: r.castOn, parts: r.parts, closed: {}, last: {} });
    const segs = plan(project);
    expect(segs[0].times).toBe(16);
    expect(segs[0].end).toBe(20);
    expect(segs[2].end).toBe(4);
    expect(locate({ ...project, count: 3 }, segs).shape).toBe(true);
  });

  it("sier fra når PDF-en ikke er en oppskrift", () => {
    expect(code(() => parseReading({ isPattern: false, parts: [] }))).toBe("not-pattern");
    expect(code(() => parseReading({ isPattern: true, parts: [] }))).toBe("not-pattern");
    expect(code(() => parseReading("dette er ikke json"))).toBe("failed");
    expect(code(() => parseReading(null))).toBe("not-pattern");
  });

  it("lager en måledel og et varsel når tallene ikke går opp", () => {
    const r = parseReading({
      castOn: 60,
      parts: [
        { name: "Øk", type: "inc", by: 2, every: 4, target: 60 },
        { name: "Tå", type: "dec", by: 4, every: 2 },
        { name: "Bol", type: "plain" },
        { name: "Noe", type: "flette" },
      ],
    });
    expect(r.parts.map((p) => p.type)).toEqual(["measure", "measure", "measure", "measure"]);
    expect(r.parts[0].note).toBe("øk etter oppskriften");
    expect(r.parts[1].note).toBe("fell etter oppskriften");
    expect(r.warnings).toEqual(["Sjekk «Øk»: fant ikke et masketall å øke til.", "Sjekk «Tå»: fant ikke et masketall å felle til."]);
  });

  it("følger masketallet gjennom delene", () => {
    const r = parseReading({
      castOn: 10,
      parts: [
        { type: "inc", by: 2, every: 2, target: 30 },
        { type: "dec", by: 2, every: 2, target: 20 },
        { type: "inc", by: 1, every: 2, target: 25 },
      ],
    });
    expect(r.parts.map((p) => [p.type, p.target])).toEqual([["inc", 30], ["dec", 20], ["inc", 25]]);
    expect(r.warnings).toEqual([]);
  });

  it("ber deg sette opplegget selv når det mangler", () => {
    const r = parseReading({ castOn: 0, parts: [{ type: "measure", name: "Vrangbord", cm: 5 }] });
    expect(r.castOn).toBe(5);
    expect(r.warnings[0]).toMatch(/legger opp/);
  });

  it("klipper til det appen har plass til", () => {
    const many = Array.from({ length: MAX_PARTS + 3 }, (_, i) => ({ type: "plain", rows: 2, name: `Del nummer ${i} med et altfor langt navn` }));
    const r = parseReading({
      castOn: 5000, name: "x".repeat(80), parts: many,
      sizes: ["S", "M", 7, "", "L"], size: "M", warnings: ["a".repeat(300), 4, "b"],
    });
    expect(r.parts).toHaveLength(MAX_PARTS);
    expect(r.parts[0].name).toHaveLength(24);
    expect(r.castOn).toBe(999);
    expect(r.name).toHaveLength(40);
    expect(r.sizes).toEqual(["S", "M", "L"]);
    expect(r.warnings[0]).toHaveLength(160);
    expect(r.warnings.at(-1)).toMatch(/flere deler/);
  });

  it("tåler tekst som prøver seg", () => {
    const r = parseReading({ castOn: "12", parts: [{ type: "measure", name: "<img src=x onerror=alert(1)>\n\nLegg", cm: "15" }] });
    expect(r.castOn).toBe(12);
    expect(r.parts[0].cm).toBe(15);
    expect(r.parts[0].name).toBe("<img src=x onerror=alert");
  });
});

describe("checkList", () => {
  it("forteller hvilken størrelse tallene gjelder", () => {
    const r = parseReading({ ...scarf, sizes: ["S", "M", "L"], size: "M", warnings: ["Lengden er omtrentlig."] });
    expect(checkList(r)).toEqual(["Tallene gjelder størrelse M. Oppskriften har også S, L.", "Lengden er omtrentlig."]);
    expect(checkList(parseReading(scarf))).toEqual([]);
  });
});

describe("checkFile", () => {
  it("slipper bare gjennom PDF-er som er små nok", () => {
    expect(code(() => checkFile({ type: "application/pdf", name: "a.pdf", size: 1000 }))).toBe("ingen feil");
    expect(code(() => checkFile({ type: "", name: "Oppskrift.PDF", size: 1000 }))).toBe("ingen feil");
    expect(code(() => checkFile({ type: "image/png", name: "a.png", size: 1000 }))).toBe("not-pdf");
    expect(code(() => checkFile({ type: "application/pdf", name: "a.pdf", size: MAX_PDF_BYTES + 1 }))).toBe("too-big");
  });
});

describe("buildPrompt", () => {
  it("tar med størrelsen du har skrevet", () => {
    expect(buildPrompt(" M ")).toContain('size "M"');
    expect(buildPrompt("")).toContain("has not said which size");
  });
});
