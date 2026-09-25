// Explicit grouping keeps integer prices identical in Node and browsers with
// different ICU/CLDR versions (notably Uzbek grouping support).
export function formatInteger(value: number, locale: string): string {
  const rounded = Math.round(value);
  const separator = locale.startsWith('en') ? ',' : '\u00a0';
  return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}
