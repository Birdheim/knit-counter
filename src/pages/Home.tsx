import { Link } from "react-router-dom";
import { Scene } from "../components/Scene";
import { summary } from "../lib/pattern";
import { findProject } from "../lib/store";
import { useAppState } from "../lib/useStore";
import { useTitle } from "../lib/useTitle";

/** Forsiden: tegningen, navnet og veien videre. */
export default function Home() {
  const state = useAppState();
  useTitle();
  const started = state.projects.some((p) => p.count > 0);
  const current = findProject(state, state.activeId) ?? state.projects[0];
  const n = state.projects.length;

  return (
    <main className="home">
      <div className="home-scene">
        <Scene />
      </div>
      <div className="home-text">
        <h1 className="wordmark">Rett <span>&amp;</span> Vrang</h1>
        <p className="tagline">Du strikker, jeg teller.</p>
        <nav className="ctas" aria-label="Hovedmeny">
          {started && (
            <Link className="cta" to={`/prosjekt/${current.id}`}>
              <b>Fortsett å strikke</b>
              <small>{current.name.trim() || "Uten navn"} · {summary(current).toLowerCase()}</small>
            </Link>
          )}
          <Link className={started ? "cta plain" : "cta"} to="/prosjekter">
            <b>Mine prosjekter</b>
            <small>{started ? (n === 1 ? "1 prosjekt" : `${n} prosjekter`) : "Start et prosjekt og legg inn oppskriften"}</small>
          </Link>
        </nav>
      </div>
    </main>
  );
}
