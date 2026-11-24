/** En liten vibrasjon der telefonen støtter det (ikke iPhone). */
export function buzz(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* ikke støttet */
  }
}
