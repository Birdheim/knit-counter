import { YARNS } from "../lib/yarns";

/** Velg garnfarge. */
export function YarnPicker({ value, onChange, labelledBy }: { value: string; onChange(id: string): void; labelledBy: string }) {
  return (
    <div className="yarns" role="radiogroup" aria-labelledby={labelledBy}>
      {YARNS.map((y) => (
        <label key={y.id}>
          <input type="radio" name="yarn" id={`yarn-${y.id}`} aria-label={y.name} value={y.id} checked={value === y.id} onChange={() => onChange(y.id)} />
          <span style={{ background: y.hex }} />
        </label>
      ))}
    </div>
  );
}
