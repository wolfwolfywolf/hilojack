// Parse a pasted schedule ("tee sheet") into weeks of 2-vs-2 matches.
//
// Accepts text copied from the league's PDF or a spreadsheet:
//   Round 1 (Wed, November 5)
//   Khoury, John   Nolan, Ed   Lavornia, Anthony   Foley, Chris
//   ...
// Each week starts with a "Round N" or "Week N" header, with an optional date
// in brackets. After it, names in "Last, First" form are read in order and
// grouped in fours: the first two are one pair, the next two their opponents.
// Line breaks between names don't matter, so a PDF copy that puts each name on
// its own line works too.

export interface ImportedName {
  last: string;
  initial: string;
}

export interface ImportedWeek {
  week: number;
  date: string | null; // YYYY-MM-DD
  matches: [ImportedName, ImportedName, ImportedName, ImportedName][];
}

export interface ImportResult {
  weeks: ImportedWeek[];
  players: ImportedName[]; // distinct, in first-seen order
  problems: string[];
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const HEADER = /\b(?:round|week)\s+(\d{1,2})\b\s*(?:\(([^)]*)\))?/gi;
// Last names are one word (hyphens and apostrophes allowed). Allowing two
// words would swallow a middle name: "Petrarca, John Max Cardono, Gary".
const NAME = /([A-Z][A-Za-z'’\-]+),\s*([A-Za-z])[A-Za-z.]*/g;

export const nameKey = (n: ImportedName) => `${n.last.toLowerCase()}|${n.initial.toLowerCase()}`;

function parseMonthDay(s: string): { m: number; d: number; y: number | null } | null {
  const md = s.match(/([A-Za-z]{3,})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?/);
  if (md) {
    const m = MONTHS.indexOf(md[1].slice(0, 3).toLowerCase());
    if (m >= 0) return { m: m + 1, d: Number(md[2]), y: md[3] ? Number(md[3]) : null };
  }
  const num = s.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (num) {
    const y = num[3] ? Number(num[3].length === 2 ? `20${num[3]}` : num[3]) : null;
    return { m: Number(num[1]), d: Number(num[2]), y };
  }
  return null;
}

export function parseSchedule(text: string): ImportResult {
  const problems: string[] = [];
  const headers = [...text.matchAll(HEADER)];
  if (!headers.length) {
    return { weeks: [], players: [], problems: ['No "Round 1" or "Week 1" headings found.'] };
  }

  const raw = headers.map((h, i) => {
    const body = text.slice(h.index! + h[0].length, i + 1 < headers.length ? headers[i + 1].index : text.length);
    const names = [...body.matchAll(NAME)].map((m) => ({
      last: m[1].replace(/\s+/g, " ").trim(),
      initial: m[2].toUpperCase(),
    }));
    return { week: Number(h[1]), date: h[2] ? parseMonthDay(h[2]) : null, names };
  });

  // Fill in missing years from the next dated week (Nov/Dec before a January date).
  let nextYear: number | null = null;
  let nextMonth = 13;
  for (let i = raw.length - 1; i >= 0; i--) {
    const d = raw[i].date;
    if (!d) continue;
    if (d.y == null && nextYear != null) d.y = d.m > nextMonth ? nextYear - 1 : nextYear;
    if (d.y != null) {
      nextYear = d.y;
      nextMonth = d.m;
    }
  }

  const seen = new Map<string, ImportedName>();
  const weeks: ImportedWeek[] = [];
  const weekNos = new Set<number>();
  for (const r of raw) {
    if (weekNos.has(r.week)) problems.push(`Week ${r.week} appears twice.`);
    weekNos.add(r.week);
    if (r.names.length % 4 !== 0) {
      problems.push(`Week ${r.week} has ${r.names.length} names, which doesn't split into tables of 4.`);
    }
    const inWeek = new Set<string>();
    const matches: ImportedWeek["matches"] = [];
    for (let i = 0; i + 3 < r.names.length; i += 4) {
      matches.push([r.names[i], r.names[i + 1], r.names[i + 2], r.names[i + 3]]);
    }
    for (const n of r.names) {
      const k = nameKey(n);
      if (inWeek.has(k)) problems.push(`Week ${r.week}: ${n.last}, ${n.initial}. is listed twice.`);
      inWeek.add(k);
      if (!seen.has(k)) seen.set(k, n);
    }
    const d = r.date;
    const date =
      d && d.y != null
        ? `${d.y}-${String(d.m).padStart(2, "0")}-${String(d.d).padStart(2, "0")}`
        : null;
    weeks.push({ week: r.week, date, matches });
  }
  return { weeks: weeks.sort((a, b) => a.week - b.week), players: [...seen.values()], problems };
}
