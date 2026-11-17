// Match a full name (from a file name or the club roster) to one of our players, who are stored as "Last, F."
// Pure, so it can run in the browser and in tests.

export interface NamedPlayer {
  id: number;
  last_name: string;
  first_initial: string;
}

const SUFFIXES = new Set(["jr", "sr", "ii", "iii", "iv", "md", "dds", "phd"]);
const letters = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

/** "Smith, John", "John Smith", "Smith, J", "smith_john.jpg" style inputs → last name + first initial. */
export function splitName(raw: string): { last: string; initial: string; altLast?: string } | null {
  let s = raw.replace(/\.(jpe?g|png|gif|webp|heic)$/i, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (s.includes(",")) {
    const [last, first] = s.split(",", 2).map((x) => x.trim());
    const lastWords = last.split(" ").filter((w) => !SUFFIXES.has(letters(w)));
    const firstWords = (first ?? "").split(" ").filter((w) => w && !SUFFIXES.has(letters(w)));
    return { last: letters(lastWords.join("")), initial: letters(firstWords[0] ?? "").charAt(0) };
  }
  const parts = s.split(" ").filter((w) => !SUFFIXES.has(letters(w)) && !/^\(.*\)$/.test(w) && !/^".*"$/.test(w));
  if (!parts.length) return null;
  if (parts.length === 1) return { last: letters(parts[0]), initial: "" };
  const last = letters(parts[parts.length - 1]);
  const initial = letters(parts[0]).charAt(0);
  // "Rich Van Dyke": also try the last two words as the last name.
  return parts.length >= 3 ? { last, initial, altLast: letters(parts.slice(-2).join("")) } : { last, initial };
}

/**
 * The one player this name belongs to, or null if none or more than one could fit.
 * Last name must match exactly (ignoring case and punctuation); the first initial must match when both have one.
 */
export function matchPlayer<P extends NamedPlayer>(raw: string, players: P[]): P | null {
  const n = splitName(raw);
  if (!n || !n.last) return null;
  const sameLast = players.filter((p) => letters(p.last_name) === n.last || (!!n.altLast && letters(p.last_name) === n.altLast));
  const fits = sameLast.filter((p) => {
    const pi = letters(p.first_initial).charAt(0);
    return !n.initial || !pi || pi === n.initial;
  });
  return fits.length === 1 ? fits[0] : null;
}
