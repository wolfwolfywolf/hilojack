export function Flash({ msg, err }: { msg?: string; err?: string }) {
  if (err) return <div className="flash err" role="alert">{err}</div>;
  if (msg) return <div className="flash msg" role="status">{msg}</div>;
  return null;
}

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}
