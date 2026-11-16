export function fmtDate(d: string | null | undefined, opts?: { short?: boolean }): string {
  if (!d) return "";
  const [y, m, day] = d.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, day));
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: opts?.short ? undefined : "short",
    month: "short",
    day: "numeric",
  });
}

export function fmtAvg(n: number): string {
  return n ? n.toFixed(1) : "–";
}

/** Holidays strictly between two league nights (YYYY-MM-DD strings compare correctly as text). */
export function offBetween<T extends { off_date: string }>(offDates: T[], after: string | null | undefined, before: string | null | undefined): T[] {
  if (!before) return [];
  return offDates.filter((o) => o.off_date < before && (after == null || o.off_date > after));
}

/** Today's date at the club, as YYYY-MM-DD. */
export function todayLocal(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
}

export function addDays(d: string, n: number): string {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10);
}

/**
 * Every night off: the ones an admin marked, plus gaps in the schedule itself
 * (a league night 7 days after a week with no week on it, before the next one).
 */
export function allOffDates<T extends { off_date: string; reason: string }>(
  weeks: { play_date: string | null }[],
  marked: T[],
): { off_date: string; reason: string }[] {
  const out = new Map<string, string>(marked.map((o) => [o.off_date, o.reason]));
  const dates = weeks.map((w) => w.play_date).filter((d): d is string => !!d).sort();
  const have = new Set(dates);
  for (let i = 0; i + 1 < dates.length; i++) {
    for (let d = addDays(dates[i], 7); d < dates[i + 1]; d = addDays(d, 7)) {
      if (!have.has(d) && !out.has(d)) out.set(d, "");
    }
  }
  return [...out].map(([off_date, reason]) => ({ off_date, reason })).sort((a, b) => a.off_date.localeCompare(b.off_date));
}
