import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { YarnPicker } from "../components/YarnPicker";
import { BUILTIN, MAX_PROJECTS } from "../lib/clean";
import { deler } from "../lib/pattern";
import { addProject, freeYarn } from "../lib/store";
import type { Part } from "../lib/types";
import { useAppState } from "../lib/useStore";
import { useTitle } from "../lib/useTitle";
import { yarnName } from "../lib/yarns";

interface Choice {
  id: string;
  title: string;
  desc: string;
  castOn: number;
  parts: Part[];
  example: boolean;
  /** navnet prosjektet får hvis du ikke skriver noe */
  fallbackName: string;
  /** åpne redigeringen etterpå, så du kan legge inn eller rette tallene */
  thenEdit: boolean;
}

/** Lag et nytt prosjekt: navn, hva du strikker etter, og garnfarge. */
export default function NewProject() {
  const state = useAppState();
  const navigate = useNavigate();
  useTitle("Nytt prosjekt");

  const choices: Choice[] = [
    ...state.bank.map((b) => ({
      id: b.id, title: b.name, desc: `Fra banken din · ${deler(b.parts.length)}`,
      castOn: b.castOn, parts: b.parts, example: false, fallbackName: b.name, thenEdit: false,
    })),
    { id: "own", title: "Lag oppskriften selv", desc: "Du legger inn delene i neste steg.", castOn: 5, parts: [], example: false, fallbackName: "Nytt prosjekt", thenEdit: true },
    { id: "count", title: "Bare tell rader", desc: "Ingen oppskrift. Du kan legge til en senere.", castOn: 5, parts: [], example: false, fallbackName: "Nytt prosjekt", thenEdit: false },
    ...BUILTIN.map((b) => ({
      id: b.id, title: `Eksempel: ${b.name}`, desc: b.desc,
      castOn: b.castOn, parts: b.parts, example: true, fallbackName: b.projectName, thenEdit: true,
    })),
  ];

  const [name, setName] = useState("");
  const [choiceId, setChoiceId] = useState(choices[0].id);
  const [yarn, setYarn] = useState(() => freeYarn(state));

  if (state.projects.length >= MAX_PROJECTS) return <Navigate to="/prosjekter" replace />;
  const choice = choices.find((c) => c.id === choiceId) ?? choices[0];

  const create = () => {
    const id = addProject(choice, name.trim() || choice.fallbackName, yarn);
    if (!id) return;
    navigate(choice.thenEdit ? `/prosjekt/${id}/rediger` : `/prosjekt/${id}`, { replace: true });
  };

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
            placeholder={`F.eks. ${choice.fallbackName === "Nye sokker" ? "Sokker til pappa" : "Vinterskjerf"}`}
            value={name} onChange={(e) => setName(e.target.value.slice(0, 40))}
          />
        </section>

        <section className="sec">
          <h2 id="choice-h">Hva strikker du etter?</h2>
          <div className="choices" role="radiogroup" aria-labelledby="choice-h">
            {choices.map((c) => (
              <label key={c.id} className={c.id === choiceId ? "choice on" : "choice"}>
                <input type="radio" name="choice" value={c.id} checked={c.id === choiceId} onChange={() => setChoiceId(c.id)} />
                <span className="txt">
                  <b>{c.title}</b>
                  <small>{c.desc}</small>
                </span>
              </label>
            ))}
          </div>
        </section>

        <section className="sec">
          <h2 id="new-yarn-h">Garnfarge <span>{yarnName(yarn)}</span></h2>
          <YarnPicker value={yarn} labelledBy="new-yarn-h" onChange={setYarn} />
        </section>

        <button className="primary-btn" type="submit">
          {choice.thenEdit ? "Opprett og legg inn oppskriften" : "Opprett prosjektet"}
        </button>
      </form>
    </main>
  );
}
