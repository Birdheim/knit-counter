import { Link } from "react-router-dom";
import { AccountChip } from "../components/AccountChip";
import { PageHeader } from "../components/PageHeader";
import { MAX_PROJECTS } from "../lib/clean";
import { deler, summary } from "../lib/pattern";
import { removeFromBank } from "../lib/store";
import { useAppState } from "../lib/useStore";
import { useTitle } from "../lib/useTitle";
import { yarnHex } from "../lib/yarns";

/** «Mine prosjekter»: åpne et prosjekt eller lag et nytt. */
export default function Projects() {
  const state = useAppState();
  useTitle("Mine prosjekter");
  const n = state.projects.length;
  const full = n >= MAX_PROJECTS;

  return (
    <main className="page">
      <PageHeader back="/" backLabel="Til forsiden" title="Mine prosjekter" sub={n === 1 ? "1 prosjekt" : `${n} prosjekter`}>
        <AccountChip />
      </PageHeader>

      <section className="sec">
        {full ? (
          <p>Du har {MAX_PROJECTS} prosjekter. Slett ett for å lage et nytt.</p>
        ) : (
          <Link className="primary-btn" to="/nytt"><span aria-hidden="true">+</span> Nytt prosjekt</Link>
        )}
        <ul className="rows">
          {state.projects.map((p) => (
            <li key={p.id}>
              <Link className={p.id === state.activeId ? "rowbtn on" : "rowbtn"} to={`/prosjekt/${p.id}`}>
                <span className="dot" style={{ background: yarnHex(p.yarn) }} />
                <span className="txt">
                  <b>{p.name.trim() || "Uten navn"}</b>
                  <small>{summary(p)}{p.id === state.activeId ? " · sist åpnet" : ""}</small>
                </span>
                <svg className="go" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {state.bank.length > 0 && (
        <section className="sec">
          <h2>Oppskriftsbanken</h2>
          <p>Oppskrifter du har lagret. Du velger dem når du lager et nytt prosjekt.</p>
          <ul className="rows">
            {state.bank.map((b) => (
              <li key={b.id}>
                <span className="rowbtn flat">
                  <span className="txt">
                    <b>{b.name}</b>
                    <small>{deler(b.parts.length)}</small>
                  </span>
                </span>
                <button className="x" type="button" aria-label={`Slett ${b.name} fra banken`} onClick={() => removeFromBank(b.id)}>×</button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="brand"><b>Rett &amp; Vrang</b>Du strikker, jeg teller.</p>
    </main>
  );
}
