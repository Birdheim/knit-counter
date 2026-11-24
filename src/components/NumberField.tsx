import { useState } from "react";

interface Props {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  /** verdien et tomt felt står for (f.eks. 0 = «til mål»). Uten den beholdes forrige verdi mens feltet er tomt. */
  emptyValue?: number;
  placeholder?: string;
  wide?: boolean;
  onCommit(value: number): void;
}

/** Tallfelt som tåler at du visker ut alt mens du skriver. */
export function NumberField({ id, label, value, min, max, emptyValue, placeholder, wide, onCommit }: Props) {
  const shown = emptyValue !== undefined && value === emptyValue ? "" : String(value);
  const [text, setText] = useState(shown);
  const [focused, setFocused] = useState(false);

  return (
    <input
      className={wide ? "n wide" : "n"}
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      aria-label={label}
      placeholder={placeholder}
      value={focused ? text : shown}
      onFocus={() => {
        setText(shown);
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        if (raw.trim() === "") {
          if (emptyValue !== undefined) onCommit(emptyValue);
          return;
        }
        const n = Math.floor(Number(raw));
        if (Number.isFinite(n)) onCommit(Math.min(max, Math.max(min, n)));
      }}
    />
  );
}
