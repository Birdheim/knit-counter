import { useState, type CSSProperties } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { HoldButton } from "../components/HoldButton";
import { PageHeader } from "../components/PageHeader";
import { PatternEditor } from "../components/PatternEditor";
import { YarnPicker } from "../components/YarnPicker";
import { deleteProject, findProject, restartProject, updateProject } from "../lib/store";
import type { Project } from "../lib/types";
import { useAppState } from "../lib/useStore";
import { useTitle } from "../lib/useTitle";
import { yarnHex, yarnName } from "../lib/yarns";

/** Rediger ett prosjekt: navn, garnfarge, oppskrift, start på nytt og slett. */
export default function EditProject() {
  const { id = "" } = useParams();
  const state = useAppState();
  const navigate = useNavigate();
  const project = findProject(state, id);
  /** slik prosjektet var før siste «start på nytt», så det kan angres */
  const [before, setBefore] = useState<Pick<Project, "count" | "closed" | "last"> | null>(null);
  useTitle("Rediger prosjekt");

  if (!project) return <Navigate to="/prosjekter" replace />;
  const back = `/prosjekt/${project.id}`;

  const restart = () => {
    if (project.count > 0) setBefore({ count: project.count, closed: project.closed, last: project.last });
    restartProject(id);
  };
  const restore = () => {
    if (before) updateProject(id, (p) => void Object.assign(p, before));
    setBefore(null);
  };
  const remove = () => {
    deleteProject(id);
    navigate("/prosjekter", { replace: true });
  };

  return (
    <main className="page" style={{ "--yarn": yarnHex(project.yarn) } as CSSProperties}>
      <PageHeader back={back} backLabel="Tilbake til telleren" title="Rediger prosjekt" sub="Endringene lagres med en gang">
        <Link className="pill solid" to={back}>Ferdig</Link>
      </PageHeader>

      <section className="sec">
        <h2><label htmlFor="name">Navn</label></h2>
        <input
          className="text" id="name" type="text" maxLength={40} autoComplete="off" spellCheck={false}
          placeholder="F.eks. Sokker til pappa"
          value={project.name} onChange={(e) => updateProject(project.id, (p) => void (p.name = e.target.value.slice(0, 40)))}
        />
      </section>

      <section className="sec">
        <h2 id="yarn-h">Garnfarge <span>{yarnName(project.yarn)}</span></h2>
        <YarnPicker value={project.yarn} labelledBy="yarn-h" onChange={(yarn) => updateProject(project.id, (p) => void (p.yarn = yarn))} />
      </section>

      <section className="sec">
        <h2>Oppskrift</h2>
        <PatternEditor state={state} project={project} />
      </section>

      <section className="sec">
        <h2>Start på nytt</h2>
        <p>Går tilbake til første rad. Oppskriften blir stående, og lengdene du strikket på måledelene vises som «forrige gang». Hold knappen inne i to sekunder.</p>
        <HoldButton label="Hold inne for å starte på nytt" doneLabel="Startet på nytt" onHold={restart} />
        {before && (
          <button className="btn" type="button" onClick={restore}>Angre, jeg var på rad {before.count + 1} i alt</button>
        )}
      </section>

      <section className="sec">
        <h2>Slett prosjektet</h2>
        <p>Kan ikke angres. Oppskrifter du har lagret i banken, blir liggende. Hold knappen inne i to sekunder.</p>
        <HoldButton label="Hold inne for å slette prosjektet" onHold={remove} />
      </section>
    </main>
  );
}
