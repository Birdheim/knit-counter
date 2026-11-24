import { useEffect } from "react";

/** Setter tittelen i fanen for siden du er på. */
export function useTitle(title?: string) {
  useEffect(() => {
    document.title = title ? `${title} · Rett & Vrang` : "Rett & Vrang";
  }, [title]);
}
