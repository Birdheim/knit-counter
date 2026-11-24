import { useEffect, useRef, useState } from "react";
import { buzz } from "../lib/buzz";

interface Props {
  label: string;
  /** vises en liten stund etterpå */
  doneLabel?: string;
  onHold(): void;
}

/** Knapp som må holdes inne i to sekunder, for ting det er dumt å gjøre ved et uhell. */
export function HoldButton({ label, doneLabel, onHold }: Props) {
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
      className={holding ? "btn hold holding" : "btn hold"}
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
      <span>{done && doneLabel ? doneLabel : label}</span>
    </button>
  );
}
