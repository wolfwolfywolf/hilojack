import postgres from "postgres";
import { SCHEMA_SQL } from "./schema";

type Sql = ReturnType<typeof postgres>;

const g = globalThis as unknown as { __hljSql?: Sql; __hljSchema?: Promise<void> };

function client(): Sql {
  if (!g.__hljSql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set. See .env.example.");
    g.__hljSql = postgres(url, {
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
