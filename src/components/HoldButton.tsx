import { useEffect, useRef, useState } from "react";
import { buzz } from "../lib/buzz";

interface Props {
  label: string;
  /** vises en liten stund etterpå */
  doneLabel?: string;
  /** rød knapp med søppelbøtte, for sletting */
  danger?: boolean;
  onHold(): void;
}

/** Knapp som må holdes inne i to sekunder, for ting det er dumt å gjøre ved et uhell. */
export function HoldButton({ label, doneLabel, danger, onHold }: Props) {
  const [holding, setHolding] = useState(false);
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const stop = () => {
    window.clearTimeout(timer.current);
    timer.current = undefined;
    setHolding(false);
  };
  const start = () => {
    if (timer.current) return;
    setHolding(true);
    timer.current = window.setTimeout(() => {
      stop();
      onHold();
      buzz(40);
      if (doneLabel) {
        setDone(true);
        window.setTimeout(() => setDone(false), 1600);
      }
    }, 2000);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className={`btn hold${danger ? " danger" : ""}${holding ? " holding" : ""}`}
      onPointerDown={(e) => {
        if (!e.button) start();
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onBlur={stop}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          if (!e.repeat) start();
        }
      }}
      onKeyUp={stop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {danger && (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 7h16M10 3.5h4M6.5 7l.8 12a1.6 1.6 0 0 0 1.6 1.5h6.2a1.6 1.6 0 0 0 1.6-1.5l.8-12M10 11v6M14 11v6" />
        </svg>
      )}
      <span>{done && doneLabel ? doneLabel : label}</span>
    </button>
  );
}
