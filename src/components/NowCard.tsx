import type { RowInfo } from "../lib/rowInfo";

/** Kortet øverst på tellesiden: hva du gjør på denne raden. */
export function NowCard({ info, shape, nudge }: { info: RowInfo; shape: boolean; nudge: boolean }) {
  return (
    <section className={["now", shape ? "shape" : "", nudge ? "nudge" : ""].filter(Boolean).join(" ")} aria-live="polite">
      <h2 className="now-title">{info.title}</h2>
      <p className="now-sub">{info.sub}</p>
      <div className="now-foot">{info.foot}</div>
    </section>
  );
}
