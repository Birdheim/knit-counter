import type { RowInfo } from "../lib/rowInfo";

/** Kortet øverst på tellesiden: hva du gjør akkurat nå. */
export function NowCard({ info, shape, nudge }: { info: RowInfo; shape: boolean; nudge: boolean }) {
  return (
    <section className={["now", shape ? "shape" : "", nudge ? "nudge" : ""].filter(Boolean).join(" ")} aria-live="polite">
      {info.eyebrow && <p className="now-eyebrow">{info.eyebrow}</p>}
      <h2 className="now-title">{info.title}</h2>
      {info.sub && <p className="now-sub">{info.sub}</p>}
      {info.foot && <div className="now-foot">{info.foot}</div>}
    </section>
  );
}
