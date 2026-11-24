import { useState } from "react";
import { PageHeader } from "../components/PageHeader";
import { sync } from "../lib/store";
import { useAccount } from "../lib/useStore";
import { useTitle } from "../lib/useTitle";

const SYNC_TEXT = {
  local: "",
  synced: "Alt er lagret på kontoen.",
  pending: "Lagrer på kontoen …",
  error: "Får ikke lagret på kontoen akkurat nå. Endringene ligger trygt på denne enheten og sendes når det virker igjen.",
};

/** Kontosiden: er jeg logget inn, og er alt lagret? */
export default function Account() {
  const a = useAccount();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useTitle("Konto");

  const run = (action: () => Promise<string>) => {
    setError("");
    setBusy(true);
    void action().then((message) => {
      setError(message);
      setBusy(false);
    });
  };

  return (
    <main className="page">
      <PageHeader back="/prosjekter" backLabel="Tilbake til mine prosjekter" title="Konto" />

      {a.signedIn ? (
        <>
          <section className={`account ${a.sync}`}>
            <span className="account-mark" aria-hidden="true">{a.sync === "error" ? "!" : "✓"}</span>
            <div>
              <h2>Du er logget inn</h2>
              <p className="who">{a.name || a.email}</p>
              {a.name && a.email && <p>{a.email}</p>}
              <p className="sync-line">{SYNC_TEXT[a.sync]}</p>
            </div>
          </section>
          <section className="sec">
            <p>Prosjektene og oppskriftsbanken følger Google-kontoen din, så du finner dem igjen på telefonen, nettbrettet og PC-en.</p>
            <button className="btn" type="button" disabled={busy} onClick={() => run(sync.signOut)}>Logg ut</button>
            <p>Når du logger ut, tømmes denne enheten. Prosjektene ligger fortsatt på kontoen.</p>
          </section>
        </>
      ) : (
        <>
          <section className="account off">
            <span className="account-mark" aria-hidden="true">–</span>
            <div>
              <h2>Du er ikke logget inn</h2>
              <p>Prosjektene lagres bare på denne enheten.</p>
            </div>
          </section>
          <section className="sec">
            {a.canSignIn ? (
              <>
                <p>Logg inn for å ha de samme prosjektene på alle enhetene dine. Det du har her fra før, blir med inn på kontoen.</p>
                <button className="primary-btn" type="button" disabled={busy} onClick={() => run(sync.signIn)}>Logg inn med Google</button>
              </>
            ) : (
              <p>{a.text}</p>
            )}
          </section>
        </>
      )}
      {error && <p className="note" role="alert">{error}</p>}
    </main>
  );
}
