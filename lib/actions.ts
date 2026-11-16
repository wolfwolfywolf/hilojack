"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { COOKIE, COOKIE_MAX_AGE, checkPassword, tokenFor, tokenValid, type Role } from "./auth";
import { db } from "./db";
import { generateSchedule, scheduleStats } from "./schedule";

// ---------- helpers ----------

function str(fd: FormData, k: string): string {
  const v = fd.get(k);
  return typeof v === "string" ? v.trim() : "";
}
function intOrNull(fd: FormData, k: string): number | null {
  const v = str(fd, k);
  if (v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}
function back(path: string, kind: "msg" | "err", text: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(text)}`);
}
function safeNext(next: string, fallback: string): string {
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}
async function requireAdmin() {
  const jar = await cookies();
  if (!(await tokenValid("admin", jar.get(COOKIE.admin)?.value))) redirect("/admin/login");
}
function refreshAll() {
  revalidatePath("/", "layout");
}

// ---------- login ----------

export async function login(fd: FormData) {
  const role: Role = str(fd, "role") === "admin" ? "admin" : "viewer";
  const loginPage = role === "admin" ? "/admin/login" : "/login";
  const next = safeNext(str(fd, "next"), role === "admin" ? "/admin" : "/");
  if (!(await checkPassword(role, str(fd, "password")))) {
    back(`${loginPage}?next=${encodeURIComponent(next)}`, "err", "Wrong password.");
  }
  const jar = await cookies();
  jar.set(COOKIE[role], await tokenFor(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
  redirect(next);
}

export async function logout(fd: FormData) {
  const jar = await cookies();
  const role = str(fd, "role");
  if (role === "admin") {
    jar.delete(COOKIE.admin);
    redirect("/");
  }
  jar.delete(COOKIE.admin);
  jar.delete(COOKIE.viewer);
  redirect("/login");
}

// ---------- players ----------

function parseName(raw: string): { last: string; initial: string } | null {
  // Accepts "Smith, J", "Smith, John", "John Smith", "J. Smith" or just "Smith".
  const s = raw.replace(/\s+/g, " ").trim();
  if (!s) return null;
  if (s.includes(",")) {
    const [last, first] = s.split(",", 2).map((x) => x.trim());
    return last ? { last, initial: (first ?? "").replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase() } : null;
  }
  const parts = s.split(" ");
  if (parts.length === 1) return { last: parts[0], initial: "" };
  const last = parts.pop()!;
  return { last, initial: parts[0].replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase() };
}

export async function addPlayers(fd: FormData) {
  await requireAdmin();
  const isSub = str(fd, "is_sub") === "on";
  const names = str(fd, "names")
    .split(/\r?\n/)
    .map(parseName)
    .filter((n): n is { last: string; initial: string } => n !== null);
  if (!names.length) back("/admin/players", "err", "Enter at least one name.");
  const sql = await db();
  await sql`
    insert into players ${sql(
      names.map((n) => ({ last_name: n.last, first_initial: n.initial, is_sub: isSub })),
    )}`;
  refreshAll();
  back("/admin/players", "msg", `Added ${names.length} ${isSub ? "sub" : "player"}${names.length === 1 ? "" : "s"}.`);
}

export async function updatePlayer(fd: FormData) {
  await requireAdmin();
  const id = intOrNull(fd, "id");
  const last = str(fd, "last_name");
  if (id == null || !last) back("/admin/players", "err", "Last name is required.");
  const initial = str(fd, "first_initial").replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase();
  const sql = await db();
  await sql`
    update players set
      last_name = ${last},
      first_initial = ${initial},
      is_sub = ${str(fd, "is_sub") === "on"},
      active = ${str(fd, "active") === "on"}
    where id = ${id}`;
  refreshAll();
  back("/admin/players", "msg", "Player saved.");
}

export async function deletePlayer(fd: FormData) {
  await requireAdmin();
  const id = intOrNull(fd, "id");
  const sql = await db();
  const [{ n }] = await sql<{ n: number }[]>`
    select count(*)::int as n from match_slots where player_id = ${id} or sub_id = ${id}`;
  if (n > 0) {
    back("/admin/players", "err", "That player is on the schedule. Mark them inactive instead, or replace them on the schedule first.");
  }
  await sql`delete from players where id = ${id}`;
  refreshAll();
  back("/admin/players", "msg", "Player deleted.");
}

// ---------- schedule ----------

export async function generateSeason(fd: FormData) {
  await requireAdmin();
  const sql = await db();
  const [{ num_weeks }] = await sql<{ num_weeks: number }[]>`select num_weeks from settings where id = 1`;
  const [{ scored }] = await sql<{ scored: number }[]>`
    select count(*)::int as scored from match_slots where score is not null`;
  if (scored > 0 && str(fd, "confirm") !== "REPLACE") {
    back("/admin/schedule", "err", 'Scores have already been entered. Type REPLACE in the box to throw them away and make a new schedule.');
  }
  const players = await sql<{ id: number }[]>`
    select id from players where active and not is_sub order by id`;
  let schedule;
  try {
    schedule = generateSchedule(players.map((p) => p.id), num_weeks);
  } catch (e) {
    back("/admin/schedule", "err", (e as Error).message + " Add or deactivate players, or use subs to fill seats.");
  }
  await sql.begin(async (tx) => {
    await tx`delete from matches`;
    await tx`delete from weeks where week_no > ${num_weeks}`;
    for (let w = 1; w <= num_weeks; w++) {
      await tx`insert into weeks (week_no) values (${w}) on conflict do nothing`;
      const week = schedule[w - 1];
      for (let t = 0; t < week.length; t++) {
        const [[a1, a2], [b1, b2]] = week[t];
        const [{ id }] = await tx<{ id: number }[]>`
          insert into matches (week_no, table_no) values (${w}, ${t + 1}) returning id`;
        await tx`
          insert into match_slots ${tx([
            { match_id: id, side: "A", seat: 1, player_id: a1 },
            { match_id: id, side: "A", seat: 2, player_id: a2 },
            { match_id: id, side: "B", seat: 1, player_id: b1 },
            { match_id: id, side: "B", seat: 2, player_id: b2 },
          ])}`;
      }
    }
  });
  const st = scheduleStats(schedule);
  refreshAll();
  back(
    "/admin/schedule",
    "msg",
    `Made a ${num_weeks}-week schedule for ${players.length} players. Nobody has the same partner twice; ` +
      `the most times any two players face each other is ${st.maxOpponentRepeats}.`,
  );
}

export async function setWeekDates(fd: FormData) {
  await requireAdmin();
  const start = str(fd, "start_date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) back("/admin/schedule", "err", "Pick a start date.");
  const sql = await db();
  await sql`
    update weeks set play_date = ${start}::date + ((week_no - 1) * 7)`;
  refreshAll();
  back("/admin/schedule", "msg", "Week dates set, one week apart. You can change any single date on its week page.");
}

export async function saveWeek(fd: FormData) {
  await requireAdmin();
  const week = intOrNull(fd, "week_no");
  if (week == null) back("/admin/schedule", "err", "Missing week.");
  const path = `/admin/week/${week}`;
  const date = str(fd, "play_date");
  const sql = await db();
  const matchIds = fd.getAll("match_id").map(Number).filter(Number.isInteger);
  await sql.begin(async (tx) => {
    await tx`
      update weeks set
        play_date = ${/^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null},
        notes = ${str(fd, "notes")}
      where week_no = ${week}`;
    for (const id of matchIds) {
      for (const pos of ["A1", "A2", "B1", "B2"]) {
        const f = (k: string) => `${k}_${id}_${pos}`;
        const player = intOrNull(fd, f("player"));
        let sub = intOrNull(fd, f("sub"));
        if (sub === player) sub = null;
        // Partners score together, so one pair score is credited to both seats.
        const score = intOrNull(fd, `score_${id}_${pos[0]}`);
        await tx`
          insert into match_slots (match_id, side, seat, player_id, sub_id, score, adjust)
          values (${id}, ${pos[0]}, ${Number(pos[1])}, ${player}, ${sub}, ${score}, ${intOrNull(fd, f("adjust"))})
          on conflict (match_id, side, seat) do update set
            player_id = excluded.player_id, sub_id = excluded.sub_id,
            score = excluded.score, adjust = excluded.adjust`;
      }
    }
  });
  refreshAll();
  back(path, "msg", "Week saved.");
}

export async function addMatch(fd: FormData) {
  await requireAdmin();
  const week = intOrNull(fd, "week_no");
  const sql = await db();
  await sql`
    insert into matches (week_no, table_no)
    select ${week}, coalesce(max(table_no), 0) + 1 from matches where week_no = ${week}`;
  refreshAll();
  back(`/admin/week/${week}`, "msg", "Added a table.");
}

export async function deleteMatch(fd: FormData) {
  await requireAdmin();
  const id = intOrNull(fd, "delete_match_id");
  const week = intOrNull(fd, "week_no");
  const sql = await db();
  await sql`delete from matches where id = ${id}`;
  refreshAll();
  back(`/admin/week/${week}`, "msg", "Removed the table.");
}

// ---------- settings ----------

export async function saveSettings(fd: FormData) {
  await requireAdmin();
  const weeks = intOrNull(fd, "num_weeks");
  const playoff = intOrNull(fd, "playoff_size");
  if (weeks == null || weeks < 1 || weeks > 52) back("/admin/settings", "err", "Weeks must be between 1 and 52.");
  if (playoff == null || playoff < 2 || playoff > 64) back("/admin/settings", "err", "Playoff size must be between 2 and 64.");
  const subCredit = str(fd, "sub_credit") === "none" ? "none" : "scheduled";
  const sql = await db();
  await sql`
    update settings set
      league_name = ${str(fd, "league_name") || "High Low Jack League"},
      season_name = ${str(fd, "season_name")},
      num_weeks = ${weeks},
      sub_credit = ${subCredit},
      playoff_size = ${playoff},
      announcement = ${str(fd, "announcement")},
      rules = ${str(fd, "rules")}
    where id = 1`;
  refreshAll();
  back("/admin/settings", "msg", "Settings saved.");
}

export async function resetSeason(fd: FormData) {
  await requireAdmin();
  if (str(fd, "confirm") !== "RESET") back("/admin/settings", "err", "Type RESET to clear the season.");
  const sql = await db();
  await sql`delete from weeks`;
  refreshAll();
  back("/admin/settings", "msg", "Schedule and scores cleared. Players were kept.");
}

// ---------- "this is me" (per device, no login) ----------

export async function pickMe(fd: FormData) {
  const jar = await cookies();
  const id = intOrNull(fd, "player");
  if (id == null) jar.delete("hlj_me");
  else jar.set("hlj_me", String(id), { path: "/", maxAge: COOKIE_MAX_AGE, sameSite: "lax", httpOnly: true });
  redirect("/");
}
