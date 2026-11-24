import { useEffect, useRef, useState } from "react";
import { MAX_PARTS, cleanPart } from "../lib/clean";
import { masker, plan, rader, type Segment } from "../lib/pattern";
import { bankEntries, editPattern, saveToBank, updateProject } from "../lib/store";
import type { AppState, Part, PartType, Project } from "../lib/types";
import { YARNS, yarnName } from "../lib/yarns";
import { HoldButton } from "./HoldButton";
import { NumberField } from "./NumberField";

const TYPES: [PartType, string][] = [["inc", "Øk"], ["dec", "Fell"], ["plain", "Rett frem"]];

/** Linjen under hver del: hva tallene betyr i rader og masker. */
function partSummary(s: Segment): { text: string; warn: boolean } {
  if (s.type === "plain") {
    return { text: s.open ? `${masker(s.start)} · til du trykker Neste del` : `${masker(s.start)} hele veien`, warn: false };
  }
  const inc = s.type === "inc";
  if (!s.times) {
    return { text: `Du har allerede ${masker(s.start)} her. Sett et ${inc ? "høyere" : "lavere"} tall.`, warn: true };
  }
  const word = inc ? (s.times === 1 ? "økning" : "økninger") : s.times === 1 ? "felling" : "fellinger";
  return { text: `${s.times} ${word} · ${rader(s.len)} · ${s.start} → ${masker(s.end)}`, warn: false };
}

function PartCard({ project, part, index, seg }: { project: Project; part: Part; index: number; seg: Segment }) {
  const edit = (change: (p: Part) => void) => editPattern(project.id, (p) => change(p.parts[index]));
  const remove = () =>
    editPattern(project.id, (p) => {
      /* delene etter denne får ny indeks, så «til mål»-lengdene må flyttes med */
      const closed: Record<string, number> = {};
      for (const [k, v] of Object.entries(p.closed)) {
        const i = Number(k);
        if (i < index) closed[i] = v;
        else if (i > index) closed[i - 1] = v;
      }
      p.closed = closed;
      p.parts.splice(index, 1);
    });
  const id = `p${index}-`;
  const sum = partSummary(seg);

  return (
    <li className="part">
      <div className="part-head">
        <span className="part-no">Del {index + 1}</span>
        <button className="x" type="button" aria-label={`Slett del ${index + 1}`} onClick={remove}>×</button>
      </div>
      <div className="seg" role="group" aria-label="Type del">
        {TYPES.map(([type, label]) => (
          <button key={type} type="button" aria-pressed={part.type === type} onClick={() => part.type !== type && edit((p) => void (p.type = type))}>
            {label}
          </button>
        ))}
      </div>
      {part.type === "plain" ? (
        <>
          <p className="line">
            <label htmlFor={`${id}rows`}>Antall rader</label>
            <NumberField id={`${id}rows`} label="Antall rader" value={part.rows} min={0} max={9999} emptyValue={0} placeholder="til mål" wide onCommit={(v) => edit((p) => void (p.rows = v))} />
          </p>
          <input
            className="text" id={`${id}note`} type="text" maxLength={60} autoComplete="off"
            placeholder="Notat, f.eks. til arbeidet måler 30 cm" aria-label="Notat til delen"
            value={part.note} onChange={(e) => edit((p) => void (p.note = e.target.value.slice(0, 60)))}
          />
        </>
      ) : (
        <>
          <p className="line">
            {part.type === "inc" ? "Øk" : "Fell"}
            <NumberField id={`${id}by`} label="Antall masker per gang" value={part.by} min={1} max={9} onCommit={(v) => edit((p) => void (p.by = v))} />
            m hver
            <NumberField id={`${id}every`} label="Hvor mange rader mellom" value={part.every} min={1} max={99} onCommit={(v) => edit((p) => void (p.every = v))} />
            . rad
          </p>
          <p className="line">
            til du har
            <NumberField id={`${id}target`} label="Masker når delen er ferdig" value={part.target} min={0} max={999} onCommit={(v) => edit((p) => void (p.target = v))} />
            masker
          </p>
        </>
      )}
      <p className={sum.warn ? "part-sum warn" : "part-sum"}>{sum.text}</p>
    </li>
  );
}

interface Props {
  state: AppState;
  project: Project;
  /** tellingen før siste nullstilling, hvis den kan angres */
  canRestore: number | null;
  onReset(): void;
  onRestore(): void;
  onDelete(): void;
  onClose(): void;
}

/** Oppsettet for ett prosjekt: navn, oppskrift, garnfarge, start på nytt og slett. */
export function SetupSheet({ state, project, canRestore, onReset, onRestore, onDelete, onClose }: Props) {
  const segs = plan(project);
  const doneRef = useRef<HTMLButtonElement>(null);
  const [saved, setSaved] = useState("");
  const total = segs.reduce((sum, s) => (s.open ? sum : sum + s.len), 0);
  const hasOpen = segs.some((s) => s.open);

  useEffect(() => {
    doneRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const save = () => {
    setSaved(saveToBank(project.id) ? `Lagret i banken som ${project.name.trim() || "Uten navn"}` : "Banken er full. Slett en oppskrift først.");
    window.setTimeout(() => setSaved(""), 1600);
  };
  const addPart = () =>
    editPattern(project.id, (p) => {
      const last = plan(p).at(-1);
      p.parts.push(cleanPart({ type: "inc", by: 1, every: 2, target: (last ? last.end : p.castOn) + 10 }));
    });

  return (
    <div className="sheet">
      <button className="shade" type="button" aria-label="Lukk oppsett" onClick={onClose} />
      <div className="card" role="dialog" aria-modal="true" aria-labelledby="sheet-title">
        <div className="card-head">
          <h2 id="sheet-title">Oppsett</h2>
          <button className="done" type="button" ref={doneRef} onClick={onClose}>Ferdig</button>
        </div>
        <div className="card-body">
          <section className="sec">
            <h3><label htmlFor="name">Navn på prosjektet</label></h3>
            <input
              className="text" id="name" type="text" maxLength={40} autoComplete="off" spellCheck={false}
              value={project.name} onChange={(e) => updateProject(project.id, (p) => void (p.name = e.target.value.slice(0, 40)))}
            />
          </section>

          <section className="sec">
            <h3>Oppskrift</h3>
            {project.example && project.parts.length > 0 && (
              <p className="note">Dette er et eksempel. Bytt ut tallene med dem som står i oppskriften din.</p>
            )}
            <p className="line">
              <label htmlFor="cast-on">Legg opp</label>
              <NumberField id="cast-on" label="Masker du legger opp" value={project.castOn} min={1} max={999} onCommit={(v) => editPattern(project.id, (p) => void (p.castOn = v))} />
              masker
            </p>
            <ol className="parts">
              {project.parts.map((part, i) => (
                <PartCard key={i} project={project} part={part} index={i} seg={segs[i]} />
              ))}
            </ol>
            {project.parts.length < MAX_PARTS && (
              <button className="btn" type="button" onClick={addPart}>Legg til del</button>
            )}
            <p>
              {segs.length
                ? `I alt ${rader(total)}${hasOpen ? ", pluss delene du strikker til mål." : "."}`
                : "Uten deler teller den bare rader."}
            </p>
            {project.parts.length === 0 ? (
              <div className="picks">
                <p>Eller hent en oppskrift fra banken:</p>
                {bankEntries(state).filter((b) => b.parts.length).map((b) => (
                  <button
                    key={b.id} className="rowbtn" type="button"
                    onClick={() => updateProject(project.id, (p) => {
                      p.castOn = b.castOn;
                      p.parts = b.parts.map(cleanPart);
                      p.closed = {};
                      p.example = !!b.example;
                    })}
                  >
                    <span className="txt">
                      <b>{b.name}</b>
                      <small>{b.desc ?? `Legg opp ${b.castOn} · ${b.parts.length} deler`}</small>
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <button className="btn" type="button" onClick={save}>{saved || "Lagre oppskriften i banken"}</button>
            )}
          </section>

          <section className="sec">
            <h3 id="yarn-h">Garnfarge <span>{yarnName(project.yarn)}</span></h3>
            <div className="yarns" role="radiogroup" aria-labelledby="yarn-h">
              {YARNS.map((y) => (
                <label key={y.id}>
                  <input
                    type="radio" name="yarn" id={`yarn-${y.id}`} aria-label={y.name} value={y.id}
                    checked={project.yarn === y.id} onChange={() => updateProject(project.id, (p) => void (p.yarn = y.id))}
                  />
                  <span style={{ background: y.hex }} />
                </label>
              ))}
            </div>
          </section>

          <section className="sec">
            <h3>Start på nytt</h3>
            <p>Hold knappen inne i to sekunder. Oppskriften blir stående.</p>
            <HoldButton label="Hold inne for å gå tilbake til rad 1" doneLabel="Tilbake på rad 1" onHold={onReset} />
            {canRestore !== null && (
              <button className="btn" type="button" onClick={onRestore}>Angre, gå tilbake til rad {canRestore + 1}</button>
            )}
          </section>

          <section className="sec">
            <h3>Slett prosjektet</h3>
            <p>Hold knappen inne i to sekunder. Oppskrifter du har lagret i banken, blir liggende.</p>
            <HoldButton label="Hold inne for å slette prosjektet" onHold={onDelete} />
          </section>

          <p className="brand"><b>Rett &amp; Vrang</b>Du strikker, jeg teller.</p>
        </div>
      </div>
    </div>
  );
}
