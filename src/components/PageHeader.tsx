import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  /** hvor tilbakepilen går, og hva den heter for skjermlesere */
  back: string;
  backLabel: string;
  title: string;
  sub?: string;
  /** det som står til høyre, f.eks. en knapp */
  children?: ReactNode;
}

/** Toppen av en side: tilbakepil, tittel og eventuelt noe til høyre. */
export function PageHeader({ back, backLabel, title, sub, children }: Props) {
  return (
    <header className="top">
      <Link className="icon-btn" to={back} aria-label={backLabel}>
        <svg className="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </Link>
      <div className="id">
        <h1 className="proj">{title}</h1>
        {sub && <p className="status">{sub}</p>}
      </div>
      {children}
    </header>
  );
}
