import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { YarnPicker } from "../components/YarnPicker";
import { BUILTIN, MAX_PROJECTS } from "../lib/clean";
import { canReadPdf } from "../lib/firebase";
import { deler } from "../lib/pattern";
import { ReadError, checkList, type Reading } from "../lib/readPattern";
import { addProject, freeYarn } from "../lib/store";
import type { Part } from "../lib/types";
import { useAppState } from "../lib/useStore";
import { useTitle } from "../lib/useTitle";
import { yarnName } from "../lib/yarns";

const PDF = "pdf";

interface Choice {
  id: string;
  title: string;
  desc: string;
  castOn: number;
  parts: Part[];
  example: boolean;
  group: "own" | "bank" | "example";
  /** navnet prosjektet får hvis du ikke skriver noe */
  fallbackName: string;
  /** åpne redigeringen etterpå, så du kan legge inn eller rette tallene */
  thenEdit: boolean;
}

const summaryOf = (parts: Part[]) => (parts.length ? `${deler(parts.length)}: ${parts.map((p) => p.name.trim()).filter(Boolean).slice(0, 4).join(", ") || "uten navn"}` : "Ingen deler");

/** Lag et nytt prosjekt: navn, hva du strikker etter, og garnfarge. */
export default function NewProject() {
  const state = useAppState();
  const navigate = useNavigate();
  useTitle("Nytt prosjekt");

  const choices: Choice[] = [
    { id: "own", group: "own", title: "Lag oppskriften selv", desc: "Du legger inn delene i neste steg.", castOn: 5, parts: [], example: false, fallbackName: "Nytt prosjekt", thenEdit: true },
    { id: "count", group: "own", title: "Bare tell rader", desc: "Ingen oppskrift. Du kan legge til en senere.", castOn: 5, parts: [], example: false, fallbackName: "Nytt prosjekt", thenEdit: false },
    ...(canReadPdf
      ? [{ id: PDF, group: "own" as const, title: "Les en oppskrift fra PDF", desc: "En AI-modell leser PDF-en og foreslår delene. Du ser over etterpå.", castOn: 5, parts: [], example: false, fallbackName: "Nytt prosjekt", thenEdit: true }]
      : []),
    ...state.bank.map((b) => ({
      id: b.id, group: "bank" as const, title: b.name, desc: summaryOf(b.parts),
      castOn: b.castOn, parts: b.parts, example: false, fallbackName: b.name, thenEdit: false,
    })),
    ...BUILTIN.map((b) => ({
      id: b.id, group: "example" as const, title: b.name, desc: b.desc,
      castOn: b.castOn, parts: b.parts, example: true, fallbackName: b.projectName, thenEdit: true,
    })),
  ];
  const groups: { id: Choice["group"]; title: string; hint: string }[] = [
    { id: "own", title: "Start selv", hint: "" },
    { id: "bank", title: "Fra banken din", hint: state.bank.length ? "Oppskrifter du har lagret fra tidligere prosjekter." : "Tom foreløpig. Lagre oppskriften fra et prosjekt, så kan du bruke den igjen her." },
    { id: "example", title: "Eksempler", hint: "Til å prøve seg fram med. Tallene er funnet på, så bytt dem med dine egne." },
  ];

  const [name, setName] = useState("");
  const [choiceId, setChoiceId] = useState(choices[0].id);
  const [yarn, setYarn] = useState(() => freeYarn(state));

  /* lesing av PDF */
  const [file, setFile] = useState<File | null>(null);
  const [size, setSize] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  /** lest, men oppskriften har flere størrelser og du har ikke sagt hvilken */
  const [pending, setPending] = useState<Reading | null>(null);
  /** siden er fortsatt åpen (lesingen kan bli ferdig etter at du har gått videre) */
  const open = useRef(true);
  useEffect(() => {
    open.current = true;
    return () => void (open.current = false);
  }, []);

  if (state.projects.length >= MAX_PROJECTS) return <Navigate to="/prosjekter" replace />;
  const choice = choices.find((c) => c.id === choiceId) ?? choices[0];

  const pdf = choice.id === PDF;

  const createFrom = (r: Reading) => {
    const id = addProject({ castOn: r.castOn, parts: r.parts, check: checkList(r) }, name.trim() || r.name || choice.fallbackName, yarn);
    if (id) navigate(`/prosjekt/${id}/rediger`, { replace: true });
  };
  const read = async (wanted: string) => {
    if (busy) return;
    if (!file) {
      setError("Velg PDF-en først.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { readPatternPdf } = await import("../lib/gemini");
      const r = await readPatternPdf(file, wanted);
      if (!open.current) return;
      if (!wanted.trim() && r.sizes.length > 1) setPending(r);
      else createFrom(r);
    } catch (e) {
      if (open.current) setError(e instanceof ReadError ? e.message : new ReadError("failed").message);
    } finally {
      if (open.current) setBusy(false);
    }
  };
  const pickSize = (s: string) => {
    if (!pending) return;
    if (s === pending.size) createFrom(pending);
    else {
      setSize(s);
      setPending(null);
      void read(s);
    }
  };

  const create = () => {
    if (pdf) return void read(size);
    const id = addProject(choice, name.trim() || choice.fallbackName, yarn);
    if (!id) return;
    navigate(choice.thenEdit ? `/prosjekt/${id}/rediger` : `/prosjekt/${id}`, { replace: true });
  };

  const pdfPanel = (
            <div className="pdf">
              <label className={file ? "btn file has" : "btn file"}>
                <input
                  type="file" accept="application/pdf,.pdf" disabled={busy}
                  onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(""); setPending(null); }}
                />
                <span>{file ? file.name : "Velg PDF"}</span>
              </label>
              <label className="pdf-size" htmlFor="pdf-size">Størrelse du strikker <span>hvis oppskriften har flere</span></label>
              <input
                className="text" id="pdf-size" type="text" maxLength={16} autoComplete="off" spellCheck={false} disabled={busy}
                placeholder="F.eks. M eller 38–40" value={size} onChange={(e) => setSize(e.target.value.slice(0, 16))}
              />
              <p>PDF-en sendes til Googles AI-modell Gemini for å bli lest. Selve PDF-en lagres ikke i appen. En AI kan lese feil, så du ser over tallene etterpå.</p>
            </div>
  );

  return (
    <main className="page">
      <PageHeader back="/prosjekter" backLabel="Tilbake til mine prosjekter" title="Nytt prosjekt" />
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        <section className="sec">
          <h2><label htmlFor="new-name">Hva skal det hete?</label></h2>
          <input
            className="text" id="new-name" type="text" maxLength={40} autoComplete="off" spellCheck={false} autoFocus
            placeholder="F.eks. Grå ullsokker"
            value={name} onChange={(e) => setName(e.target.value.slice(0, 40))}
          />
        </section>

        <section className="sec">
          <h2>Hva strikker du etter?</h2>
          {groups.map((g) => (
            <div key={g.id} className={`choices ${g.id}`} role="group" aria-labelledby={`group-${g.id}`}>
              <h3 id={`group-${g.id}`}>{g.title}</h3>
              {g.hint && <p>{g.hint}</p>}
              {choices.filter((c) => c.group === g.id).map((c) => (
                <label key={c.id} className={c.id === choiceId ? "choice on" : "choice"}>
                  <input type="radio" name="choice" value={c.id} checked={c.id === choiceId} disabled={busy} onChange={() => { setChoiceId(c.id); setError(""); setPending(null); }} />
                  <span className="txt">
                    <b>{c.title}</b>
                    <small>{c.desc}</small>
                  </span>
                  {g.id !== "own" && <span className="tag">{g.id === "bank" ? "Banken" : "Eksempel"}</span>}
                </label>
              ))}
              {g.id === "own" && pdf && pdfPanel}
            </div>
          ))}
        </section>

        <section className="sec">
          <h2 id="new-yarn-h">Garnfarge <span>{yarnName(yarn)}</span></h2>
          <YarnPicker value={yarn} labelledBy="new-yarn-h" onChange={setYarn} />
        </section>

        {pdf && pending && (
          <div className="ai-check" role="group" aria-labelledby="size-h">
            <b id="size-h">Oppskriften har flere størrelser. Hvilken strikker du?</b>
            <div className="sizes">
              {pending.sizes.map((s) => (
                <button key={s} className="btn" type="button" onClick={() => pickSize(s)}>{s}</button>
              ))}
            </div>
          </div>
        )}
        <p className="form-msg" role="status" aria-live="polite">
          {busy ? "Leser oppskriften. Det tar gjerne et halvt minutt." : error}
        </p>
        {!(pdf && pending) && (
          <button className="primary-btn" type="submit" disabled={busy}>
            {pdf ? (busy ? "Leser …" : "Les oppskriften") : choice.thenEdit ? "Opprett og legg inn oppskriften" : "Opprett prosjektet"}
          </button>
        )}
      </form>
    </main>
  );
}
