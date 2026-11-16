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
