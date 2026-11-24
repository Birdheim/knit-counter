import { Link } from "react-router-dom";
import { useAccount } from "../lib/useStore";

/** Lite merke som viser om du er logget inn. Fører til kontosiden. */
export function AccountChip() {
  const a = useAccount();
  if (!a.available) return null;
  if (!a.signedIn) {
    return <Link className="chip" to="/konto">Logg inn</Link>;
  }
  const name = a.name.split(" ")[0] || a.email.split("@")[0] || "Konto";
  const state = a.sync === "error" ? "får ikke lagret" : a.sync === "pending" ? "lagrer" : "lagret";
  return (
    <Link className="chip on" to="/konto" aria-label={`Logget inn som ${name}, ${state}. Åpne konto`}>
      <span className={`sync-dot ${a.sync}`} aria-hidden="true" />
      {name}
    </Link>
  );
}
