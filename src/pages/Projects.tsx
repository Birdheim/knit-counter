import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BUILTIN, MAX_PROJECTS } from "../lib/clean";
import { deler, summary } from "../lib/pattern";
import { addProject, removeFromBank, sync } from "../lib/store";
import type { Pattern } from "../lib/types";
import { useAccount, useAppState } from "../lib/useStore";
import { useTitle } from "../lib/useTitle";
import { yarnHex } from "../lib/yarns";

/** «Mine prosjekter»: åpne et prosjekt, start et nytt fra banken, og logg inn. */
export default function Projects() {
  const state = useAppState();
  const account = useAccount();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  useTitle("Mine prosjekter");

  const full = state.projects.length >= MAX_PROJECTS;
  const start = (pattern: Pattern & { example?: boolean }, name: string) => {
    const id = addProject(pattern, name);
    /* et nytt prosjekt åpnes rett i oppsettet, så du kan gi det navn og sjekke tallene */
    if (id) navigate(`/prosjekt/${id}`, { state: { setup: true } });
  };

  return (
    <main className="page">
      <header className="top">
        <Link className="icon-btn" to="/" aria-label="Til forsiden">
          <svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </Link>
        <div className="id">
          <h1 className="proj">Mine prosjekter</h1>
          <p className="status">{state.projects.length === 1 ? "1 prosjekt" : `${state.projects.length} prosjekter`}</p>
        </div>
      </header>

      <section className="sec">
        <h2>Det du holder på med</h2>
        <ul className="rows">
          {state.projects.map((p) => (
            <li key={p.id}>
              <Link className={p.id === state.activeId ? "rowbtn on" : "rowbtn"} to={`/prosjekt/${p.id}`}>
                <span className="dot" style={{ background: yarnHex(p.yarn) }} />
                <span className="txt">
                  <b>{p.name.trim() || "Uten navn"}</b>
                  <small>{summary(p)}</small>
                </span>
                {p.id === state.activeId && <span className="tag">Sist åpnet</span>}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="sec">
        <h2>Start et nytt prosjekt</h2>
        <p>
          {full
            ? `Du har ${MAX_PROJECTS} prosjekter. Slett ett for å starte et nytt.`
            : "Velg en oppskrift fra banken. Tellingen starter på rad 1."}
        </p>
        {!full && (
          <ul className="rows">
            {state.bank.map((b) => (
              <li key={b.id}>
                <button className="rowbtn" type="button" onClick={() => start(b, b.name)}>
                  <span className="txt">
                    <b>{b.name}</b>
                    <small>Legg opp {b.castOn} · {deler(b.parts.length)}</small>
                  </span>
                </button>
                <button className="x" type="button" aria-label={`Slett ${b.name} fra banken`} onClick={() => removeFromBank(b.id)}>×</button>
              </li>
            ))}
            {BUILTIN.map((b) => (
              <li key={b.id}>
                <button className="rowbtn" type="button" onClick={() => start(b, b.projectName)}>
                  <span className="txt">
                    <b>{b.name}</b>
                    <small>{b.desc}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="sec">
        <h2>Konto</h2>
        <p>{account.text}</p>
        {account.canSignIn && (
          <button className="btn" type="button" onClick={() => { setError(""); void sync.signIn().then(setError); }}>Logg inn med Google</button>
        )}
        {account.signedIn && (
          <button className="btn" type="button" onClick={() => { setError(""); void sync.signOut().then(setError); }}>Logg ut</button>
        )}
        {error && <p className="note" role="alert">{error}</p>}
      </section>

      <p className="brand"><b>Rett &amp; Vrang</b>Du strikker, jeg teller.</p>
    </main>
  );
}
