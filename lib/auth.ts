// Shared-password auth. Works in both the Edge middleware and Node server code.
// A login cookie holds an HMAC of the role and its current password, so
// changing a password in Vercel logs everyone out of that role.

export type Role = "viewer" | "admin";

export const COOKIE: Record<Role, string> = {
  viewer: "hlj_view",
  admin: "hlj_admin",
};

export const COOKIE_MAX_AGE = 60 * 60 * 24 * 180; // ~6 months

function passwordFor(role: Role): string | undefined {
  return role === "admin" ? process.env.ADMIN_PASSWORD : process.env.SITE_PASSWORD;
}

function secret(): string {
  return process.env.AUTH_SECRET || "dev-only-secret-set-AUTH_SECRET-in-production";
}

async function hmac(message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Whether a role needs no password. The viewer side is open when
 * SITE_PASSWORD is unset. The admin side is only open without
 * ADMIN_PASSWORD in local development; in production it stays locked.
 */
export function roleIsOpen(role: Role): boolean {
  if (passwordFor(role)) return false;
  return role === "viewer" || process.env.NODE_ENV !== "production";
}

export async function tokenFor(role: Role): Promise<string> {
  return hmac(`${role}:${passwordFor(role) ?? ""}`);
}

export async function checkPassword(role: Role, attempt: string): Promise<boolean> {
  const pw = passwordFor(role);
  if (!pw) return roleIsOpen(role);
  // Compare HMACs so the comparison takes the same time for any input length.
  return safeEqual(await hmac(`pw:${attempt}`), await hmac(`pw:${pw}`));
}

export async function tokenValid(role: Role, token: string | undefined): Promise<boolean> {
  if (roleIsOpen(role)) return true;
  if (!token) return false;
  return safeEqual(token, await tokenFor(role));
}
