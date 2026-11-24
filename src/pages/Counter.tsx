import { useEffect, useState, type CSSProperties } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { KnitDrawing } from "../components/KnitDrawing";
import { NowCard } from "../components/NowCard";
import { Steps } from "../components/Steps";
import { buzz } from "../lib/buzz";
import { hasShaping, locate, partLabel, plan, rader } from "../lib/pattern";
import { rowInfo } from "../lib/rowInfo";
import { findProject, setActive, store, updateProject } from "../lib/store";
import { useAppState } from "../lib/useStore";
import { useTitle } from "../lib/useTitle";
import { yarnHex } from "../lib/yarns";

/** det siste du gjorde, så Angre vet hva den skal ta tilbake */
type Last = { kind: "row" } | { kind: "close"; index: number } | null;
const SHAPE_BUZZ = [25, 70, 25, 70, 25];

/** Tellesiden for ett prosjekt. */
export default function Counter() {
  const { id = "" } = useParams();
  const state = useAppState();
  const project = findProject(state, id);
  const [last, setLast] = useState<Last>(null);
  const [taps, setTaps] = useState(0);

  useTitle(project ? project.name.trim() || "Uten navn" : undefined);
  /* husk hvilket prosjekt som sist var åpent, til «Fortsett å strikke» på forsiden */
  const projectId = project?.id;
  useEffect(() => {
    if (projectId) setActive(projectId);
  }, [projectId]);

  if (!project) return <Navigate to="/prosjekter" replace />;

  const segs = plan(project);
  const loc = locate(project, segs);
  const info = rowInfo(project, segs, loc);
  const finished = segs.length > 0 && loc.finished;
  /** en del som måles: du bestemmer selv når den er ferdig */
  const measuring = !!loc.seg?.open;
  /* tallet er raden du strikker nå i denne delen. Uten oppskrift er det raden i hele arbeidet. */
  const shown = finished ? project.count : (segs.length ? loc.r : project.count) + 1;
  const digits = String(shown);
  /** rist litt i kortet når du nettopp kom til en økning eller felling */
  const arrived = taps > 0 && last !== null && loc.shape;

  const buzzForNewRow = () => {
    const now = findProject(store.get(), id);
    if (now) buzz(locate(now, plan(now)).shape ? SHAPE_BUZZ : 12);
  };
  const rowDone = () => {
    if (project.count >= 99999) return;
    updateProject(id, (p) => void p.count++);
    setLast({ kind: "row" });
    setTaps((t) => t + 1);
    buzzForNewRow();
  };
  const undo = () => {
    if (last?.kind === "close") {
      const index = last.index;
      updateProject(id, (p) => void delete p.closed[index]);
    } else if (project.count > 0) {
      updateProject(id, (p) => {
        p.count--;
        /* går du tilbake inn i en måledel, åpnes den igjen */
        const at = locate(p, plan(p)).seg?.i ?? p.parts.length;
        for (const k of Object.keys(p.closed)) if (Number(k) >= at) delete p.closed[k];
      });
    }
    setLast(null);
  };
  const partDone = () => {
    if (!loc.seg?.open) return;
    const index = loc.seg.i;
    const rows = loc.r;
    updateProject(id, (p) => void (p.closed[index] = rows));
    setLast({ kind: "close", index });
    setTaps((t) => t + 1);
    buzzForNewRow();
  };

  return (
    <div className="app" style={{ "--yarn": yarnHex(project.yarn) } as CSSProperties}>
      <header className="top">
        <Link className="icon-btn" to="/prosjekter" aria-label="Til mine prosjekter">
          <svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </Link>
        <div className="id">
          <h1 className="proj">{project.name.trim() || "Uten navn"}</h1>
          <p className="status">{info.status}</p>
        </div>
        <Link className="pill" to={`/prosjekt/${project.id}/rediger`}>Rediger</Link>
      </header>

      {project.check && (
        <Link className="ai-flag" to={`/prosjekt/${project.id}/rediger`}>Oppskriften er lest av AI. Sjekk tallene <span aria-hidden="true">→</span></Link>
      )}

      <Steps segs={segs} current={finished ? segs.length : loc.seg?.i ?? 0} />

      <NowCard key={arrived ? taps : "still"} info={info} shape={loc.shape} nudge={arrived} />

      <div className={hasShaping(segs) ? "stage drawn" : "stage"}>
        <div className="tally">
          <span className="tally-lab">{finished ? "Rader i alt" : "Rad"}</span>
          <span key={taps} className={taps ? "num pop" : "num"} data-len={Math.max(3, digits.length)} aria-live="polite">{digits}</span>
          {/* totalen er bare interessant når du er forbi første del */}
          {!finished && loc.seg && loc.seg.i > 0 && project.count > 0 && <span className="tally-sub">{rader(project.count)} strikket i alt</span>}
        </div>
        {hasShaping(segs) && <KnitDrawing project={project} segs={segs} />}
      </div>

      <div className="actions">
        <div className="act-row">
          <button className="act quiet" type="button" disabled={project.count === 0 && !last} onClick={undo}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5 4 9l4 4" /><path d="M4 9h10a5 5 0 0 1 0 10H9" /></svg>
            Angre
          </button>
          {!finished && (
            <button className={measuring ? "act" : "act primary"} type="button" onClick={rowDone}>
              <span className="plus" aria-hidden="true">+</span> Rad ferdig
            </button>
          )}
          {finished && <Link className="act" to="/prosjekter">Til mine prosjekter</Link>}
        </div>
        {measuring && loc.seg && (
          <button className="act primary" type="button" onClick={partDone}>
            Ferdig med {partLabel(loc.seg).toLowerCase()} <span aria-hidden="true">→</span>
          </button>
        )}
        {measuring && <p className="act-hint">Du trenger ikke telle her. Radene er bare til hjelp.</p>}
      </div>
    </div>
  );
}
