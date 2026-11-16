import { test } from "node:test";
import assert from "node:assert/strict";

// Import the pure helper without pulling in the postgres client.
const { cleanUrl } = await import("./db.ts");

test("strips Supabase extras and keeps SSL", () => {
  const r = cleanUrl("postgres://postgres.abc:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x");
  assert.equal(r.url, "postgres://postgres.abc:pw@aws-0-us-east-1.pooler.supabase.com:6543/postgres");
  assert.equal(r.ssl, "require");
});

test("remote without sslmode requires SSL; localhost does not", () => {
  assert.equal(cleanUrl("postgres://u:p@db.example.com/x").ssl, "require");
  assert.equal(cleanUrl("postgres://u@localhost:5433/x").ssl, false);
});
