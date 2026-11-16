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
