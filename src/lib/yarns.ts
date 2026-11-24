export interface Yarn {
  id: string;
  name: string;
  hex: string;
}

export const YARNS: Yarn[] = [
  { id: "bringebaer", name: "Bringebær", hex: "#CE3E69" },
  { id: "blabaer", name: "Blåbær", hex: "#4263C4" },
  { id: "mose", name: "Mose", hex: "#5F9A5A" },
  { id: "smor", name: "Smør", hex: "#EDB13A" },
  { id: "lyng", name: "Lyng", hex: "#A163C8" },
  { id: "hav", name: "Hav", hex: "#2F9CAB" },
];

export function yarnHex(id: string): string {
  return (YARNS.find((y) => y.id === id) ?? YARNS[0]).hex;
}

export function yarnName(id: string): string {
  return YARNS.find((y) => y.id === id)?.name ?? "";
}
