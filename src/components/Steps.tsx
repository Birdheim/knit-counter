import { useEffect, useRef } from "react";
import { partLabel, type Segment } from "../lib/pattern";

/** Oversikt over delene i oppskriften: hva som er gjort, hvor du er, og hva som kommer. */
export function Steps({ segs, current }: { segs: Segment[]; current: number }) {
  const now = useRef<HTMLLIElement>(null);
  /* hold delen du er på synlig når lista er lengre enn skjermen er bred */
  useEffect(() => {
    now.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [current]);

  if (segs.length < 2) return null;
  return (
    <ol className="steps" aria-label="Delene i oppskriften">
      {segs.map((s) => {
        const state = s.i < current ? "done" : s.i === current ? "now" : "todo";
        return (
          <li key={s.i} ref={state === "now" ? now : undefined} className={`is-${state}`} aria-current={state === "now" ? "step" : undefined}>
            <span className="step-no" aria-hidden="true">{state === "done" ? "✓" : s.i + 1}</span>
            {partLabel(s)}
            {state === "done" && <span className="sr-only"> (ferdig)</span>}
          </li>
        );
      })}
    </ol>
  );
}
