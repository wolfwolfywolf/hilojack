import postgres from "postgres";
import { SCHEMA_SQL } from "./schema.ts";

type Sql = ReturnType<typeof postgres>;

const g = globalThis as unknown as { __hljSql?: Sql; __hljSchema?: Promise<void> };

/**
 * postgres.js sends unknown URL parameters to the server as settings, and
 * Supabase's URLs carry extras like `supa=base-pooler.x` that the server
 * rejects. Keep only sslmode, and require SSL for anything but localhost.
 */
export function cleanUrl(raw: string): { url: string; ssl: false | "require" | "prefer" } {
  const u = new URL(raw);
  const mode = u.searchParams.get("sslmode");
  u.search = "";
  const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(u.hostname);
  const ssl = mode === "disable" ? false : mode === "prefer" || mode === "allow" ? "prefer" : local && !mode ? false : "require";
  return { url: u.toString(), ssl };
}

function client(): Sql {
  if (!g.__hljSql) {
    // POSTGRES_URL is what the Supabase integration in the Vercel Marketplace sets.
    const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!raw) throw new Error("DATABASE_URL is not set. See .env.example.");
    const { url, ssl } = cleanUrl(raw);
    g.__hljSql = postgres(url, {
      ssl,
      // Supabase's transaction pooler does not support prepared statements.
      prepare: false,
      max: 5,
      idle_timeout: 20,
      onnotice: () => {},
    });
  }
  return g.__hljSql;
}

/** Returns a ready-to-use sql client, creating tables on first use. */
export async function db(): Promise<Sql> {
  const sql = client();
  if (!g.__hljSchema) {
    g.__hljSchema = sql.unsafe(SCHEMA_SQL).then(() => undefined);
    g.__hljSchema.catch(() => {
      g.__hljSchema = undefined;
    });
  }
  await g.__hljSchema;
  return sql;
}
