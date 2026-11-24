import { useEffect, useState, type CSSProperties } from "react";
import { Link, Navigate, useLocation, useNavigate, useParams } from "react-router-dom";
import { KnitDrawing } from "../components/KnitDrawing";
import { NowCard } from "../components/NowCard";
import { SetupSheet } from "../components/SetupSheet";
import { buzz } from "../lib/buzz";
import { locate, plan } from "../lib/pattern";
import { rowInfo } from "../lib/rowInfo";
import { deleteProject, findProject, setActive, store, updateProject } from "../lib/store";
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
  const navigate = useNavigate();
  const location = useLocation();
  const project = findProject(state, id);

  const [setupOpen, setSetupOpen] = useState(() => !!(location.state as { setup?: boolean } | null)?.setup);
  const [last, setLast] = useState<Last>(null);
  const [beforeReset, setBeforeReset] = useState<{ count: number; closed: Record<string, number> } | null>(null);
  const [taps, setTaps] = useState(0);

  useTitle(project ? project.name.trim() || "Uten navn" : undefined);
  /* «åpne oppsettet» gjelder bare første gang, ikke når siden lastes på nytt */
  const cameForSetup = !!(location.state as { setup?: boolean } | null)?.setup;
  useEffect(() => {
    if (cameForSetup) navigate(location.pathname, { replace: true, state: null });
  }, [cameForSetup, location.pathname, navigate]);

  /* husk hvilket prosjekt som sist var åpent, til «Fortsett å strikke» på forsiden */
  const projectId = project?.id;
  useEffect(() => {
    if (projectId) setActive(projectId);
  }, [projectId]);

  if (!project) return <Navigate to="/prosjekter" replace />;

  const segs = plan(project);
  const loc = locate(project, segs);
  const info = rowInfo(project, segs, loc);
  const digits = String(project.count + 1);
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
    setBeforeReset(null);
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
        /* går du tilbake inn i en «til mål»-del, åpnes den igjen */
        const at = locate(p, plan(p)).seg?.i ?? p.parts.length;
        for (const k of Object.keys(p.closed)) if (Number(k) >= at) delete p.closed[k];
      });
    }
    setLast(null);
  };
  const nextPart = () => {
    if (!loc.seg?.open) return;
    const index = loc.seg.i;
    const rows = loc.r;
    updateProject(id, (p) => void (p.closed[index] = rows));
    setLast({ kind: "close", index });
    setTaps((t) => t + 1);
    buzzForNewRow();
  };
  const reset = () => {
    if (project.count > 0) setBeforeReset({ count: project.count, closed: { ...project.closed } });
    updateProject(id, (p) => {
      p.count = 0;
      p.closed = {};
    });
    setLast(null);
  };
  const restore = () => {
    if (beforeReset) {
      const saved = beforeReset;
      updateProject(id, (p) => {
        p.count = saved.count;
        p.closed = saved.closed;
      });
    }
    setBeforeReset(null);
  };
  const remove = () => {
    deleteProject(id);
    navigate("/prosjekter", { replace: true });
  };

  return (
    <div className="counter" style={{ "--yarn": yarnHex(project.yarn) } as CSSProperties}>
      <div className="app">
        <header className="top">
          <Link className="icon-btn" to="/prosjekter" aria-label="Til mine prosjekter">
            <svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
          </Link>
          <div className="id">
            <h1 className="proj">{project.name.trim() || "Uten navn"}</h1>
            <p className="status">{info.status}</p>
          </div>
          <button className="icon-btn" type="button" aria-haspopup="dialog" aria-label="Oppsett for dette prosjektet" onClick={() => setSetupOpen(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 8h8M20 8h-1M4 16h1M12 16h8" fill="none" />
              <circle cx="15.5" cy="8" r="3" />
              <circle cx="8.5" cy="16" r="3" />
            </svg>
          </button>
        </header>

        <NowCard key={arrived ? taps : "still"} info={info} shape={loc.shape} nudge={arrived} />

        <div className="stage">
          <button className="work" type="button" aria-label="Raden er ferdig" onClick={rowDone}>
            <span className="work-head">
              <span className="ball-lab">Rad</span>
              <span key={taps} className={taps ? "num pop" : "num"} data-len={Math.max(3, digits.length)} aria-live="polite">{digits}</span>
            </span>
            <KnitDrawing project={project} segs={segs} />
            <span className="ball-hint">Trykk når raden er ferdig</span>
          </button>
        </div>

        <div className="foot">
          <button className="ghost" type="button" disabled={project.count === 0 && !last} onClick={undo}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5 4 9l4 4" /><path d="M4 9h10a5 5 0 0 1 0 10H9" /></svg>
            Angre
          </button>
          {loc.seg?.open && <button className="next" type="button" onClick={nextPart}>Neste del</button>}
        </div>
      </div>

      {setupOpen && (
        <SetupSheet
          state={state}
          project={project}
          canRestore={beforeReset ? beforeReset.count : null}
          onReset={reset}
          onRestore={restore}
          onDelete={remove}
          onClose={() => setSetupOpen(false)}
        />
      )}
    </div>
  );
}
