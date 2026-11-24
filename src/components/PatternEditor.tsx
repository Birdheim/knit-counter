import { useState } from "react";
import { MAX_PARTS, cleanPart } from "../lib/clean";
import { hasShaping, masker, plan, rader, type Segment } from "../lib/pattern";
import { bankEntries, editPattern, movePart, removePart, saveToBank, updateProject } from "../lib/store";
import type { AppState, Part, PartType, Project } from "../lib/types";
import { NumberField } from "./NumberField";

const TYPES: [PartType, string][] = [["measure", "Mål"], ["plain", "Rader"], ["inc", "Øk"], ["dec", "Fell"]];

/** Linjen under hver del: hva tallene betyr i rader og masker. */
function partSummary(s: Segment, stitches: boolean): { text: string; warn: boolean } {
  if (s.type === "measure") return { text: "Ingen telling. Du trykker Ferdig med delen når du er der.", warn: false };
  if (s.type === "plain") return { text: stitches ? `${masker(s.start)} hele veien` : "", warn: false };
  const inc = s.type === "inc";
  if (!s.times) {
    return { text: `Du har allerede ${masker(s.start)} her. Sett et ${inc ? "høyere" : "lavere"} tall.`, warn: true };
  }
  const word = inc ? (s.times === 1 ? "økning" : "økninger") : s.times === 1 ? "felling" : "fellinger";
  return { text: `${s.times} ${word} · ${rader(s.len)} · ${s.start} → ${masker(s.end)}`, warn: false };
}

function PartCard({ project, part, index, seg, stitches }: { project: Project; part: Part; index: number; seg: Segment; stitches: boolean }) {
  const edit = (change: (p: Part) => void) => editPattern(project.id, (p) => change(p.parts[index]));
  const id = `p${index}-`;
  const sum = partSummary(seg, stitches);
  const last = index === project.parts.length - 1;

  return (
    <li className="part">
      <div className="part-head">
        <span className="part-no">Del {index + 1}</span>
        <span className="part-tools">
          <button className="x" type="button" aria-label={`Flytt del ${index + 1} opp`} disabled={index === 0} onClick={() => movePart(project.id, index, -1)}>↑</button>
          <button className="x" type="button" aria-label={`Flytt del ${index + 1} ned`} disabled={last} onClick={() => movePart(project.id, index, 1)}>↓</button>
          <button className="x" type="button" aria-label={`Slett del ${index + 1}`} onClick={() => removePart(project.id, index)}>×</button>
        </span>
      </div>
      <input
        className="text" id={`${id}name`} type="text" maxLength={24} autoComplete="off"
        placeholder="Navn på delen, f.eks. Legg" aria-label="Navn på delen"
        value={part.name} onChange={(e) => edit((p) => void (p.name = e.target.value.slice(0, 24)))}
      />
      <div className="seg" role="group" aria-label="Hva slags del">
        {TYPES.map(([type, label]) => (
          <button
            key={type} type="button" aria-pressed={part.type === type}
            onClick={() => part.type !== type && edit((p) => {
              p.type = type;
              if (type === "plain" && p.rows < 1) p.rows = 10;
            })}
          >
            {label}
          </button>
        ))}
      </div>

      {part.type === "measure" && (
        <>
          <p className="line">
            <label htmlFor={`${id}cm`}>Strikk til delen måler</label>
            <NumberField id={`${id}cm`} label="Mål i centimeter" value={part.cm} min={0} max={999} emptyValue={0} onCommit={(v) => edit((p) => void (p.cm = v))} />
            cm
          </p>
          <input
            className="text" id={`${id}note`} type="text" maxLength={60} autoComplete="off"
            placeholder="Notat, f.eks. strikk hælen etter oppskriften" aria-label="Notat til delen"
            value={part.note} onChange={(e) => edit((p) => void (p.note = e.target.value.slice(0, 60)))}
          />
        </>
      )}
      {part.type === "plain" && (
        <p className="line">
          <label htmlFor={`${id}rows`}>Strikk</label>
          <NumberField id={`${id}rows`} label="Antall rader" value={part.rows} min={1} max={9999} wide onCommit={(v) => edit((p) => void (p.rows = v))} />
          rader
        </p>
      )}
      {(part.type === "inc" || part.type === "dec") && (
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
      {sum.text && <p className={sum.warn ? "part-sum warn" : "part-sum"}>{sum.text}</p>}
    </li>
  );
}

/** Oppskriften til et prosjekt: delene, i rekkefølge. */
export function PatternEditor({ state, project }: { state: AppState; project: Project }) {
  const segs = plan(project);
  const stitches = hasShaping(segs);
  const [saved, setSaved] = useState("");
  const counted = segs.reduce((sum, s) => (s.open ? sum : sum + s.len), 0);
  const measured = segs.filter((s) => s.open).length;

  const save = () => {
    setSaved(saveToBank(project.id) ? `Lagret i banken som ${project.name.trim() || "Uten navn"}` : "Banken er full. Slett en oppskrift først.");
    window.setTimeout(() => setSaved(""), 2000);
  };
  const addPart = () =>
    editPattern(project.id, (p) => void p.parts.push(cleanPart({ type: "measure" })));

  return (
    <>
      {project.example && project.parts.length > 0 && (
        <p className="note">Dette er et eksempel. Bytt ut tallene med dem som står i oppskriften din.</p>
      )}
      {project.parts.length === 0 && (
        <p>Uten deler teller den bare rader. Legg til deler for å følge en oppskrift, steg for steg.</p>
      )}
      <ol className="parts">
        {project.parts.map((part, i) => (
          <PartCard key={i} project={project} part={part} index={i} seg={segs[i]} stitches={stitches} />
        ))}
      </ol>
      {project.parts.length < MAX_PARTS && (
        <button className="btn" type="button" onClick={addPart}>+ Legg til del</button>
      )}
      {stitches && (
        <p className="line">
          <label htmlFor="cast-on">Du legger opp</label>
          <NumberField id="cast-on" label="Masker du legger opp" value={project.castOn} min={1} max={999} onCommit={(v) => editPattern(project.id, (p) => void (p.castOn = v))} />
          masker
        </p>
      )}
      {segs.length > 0 && (counted > 0 || measured > 0) && (
        <p>
          {[counted > 0 ? `${rader(counted)} som telles` : "", measured > 0 ? `${measured} ${measured === 1 ? "del" : "deler"} som måles` : ""].filter(Boolean).join(" og ")}.
        </p>
      )}
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
                p.last = {};
                p.example = !!b.example;
              })}
            >
              <span className="txt">
                <b>{b.name}</b>
                <small>{b.desc ?? `${b.parts.length} deler`}</small>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <button className="btn" type="button" onClick={save}>{saved || "Lagre oppskriften i banken"}</button>
      )}
    </>
  );
}
