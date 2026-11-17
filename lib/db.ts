import postgres from "postgres";
import { createHash } from "node:crypto";
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
      idle_timeout: 60,
      onnotice: () => {},
    });
  }
  return g.__hljSql;
}

/** Changes whenever lib/schema.ts changes, so a new deploy with a new schema applies it once. */
export const SCHEMA_VERSION = "hlj-schema-" + createHash("sha256").update(SCHEMA_SQL).digest("hex").slice(0, 12);

/**
 * Apply the schema only if the database doesn't already have this version.
 * The version is kept as a comment on the settings table, so a normal server start costs one tiny query
 * instead of re-running every CREATE/ALTER (the ALTERs lock each table and made cold starts slow).
 */
async function ensureSchema(sql: Sql): Promise<void> {
  const [row] = await sql<{ v: string | null }[]>`
    select obj_description(to_regclass('public.settings'), 'pg_class') as v`;
  if (row?.v === SCHEMA_VERSION) return;
  await sql.begin(async (tx) => {
    // One server at a time, in case several start together after a deploy.
    await tx`select pg_advisory_xact_lock(724501)`;
    const [again] = await tx<{ v: string | null }[]>`
      select obj_description(to_regclass('public.settings'), 'pg_class') as v`;
    if (again?.v === SCHEMA_VERSION) return;
    await tx.unsafe(SCHEMA_SQL);
    await tx.unsafe(`comment on table settings is '${SCHEMA_VERSION}'`);
  });
}

/** Returns a ready-to-use sql client, making sure the tables exist (checked once per server instance). */
export async function db(): Promise<Sql> {
  const sql = client();
  if (!g.__hljSchema) {
    g.__hljSchema = ensureSchema(sql);
    g.__hljSchema.catch(() => {
      g.__hljSchema = undefined;
    });
  }
  await g.__hljSchema;
  return sql;
}
