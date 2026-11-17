import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { db } from "./db";
import type { MatchRow, OffDate, Player, Settings, Slot, WeekInfo } from "./types";

const SLOT_ORDER: [Slot["side"], Slot["seat"]][] = [
  ["A", 1],
  ["A", 2],
  ["B", 1],
  ["B", 2],
];

async function getSettingsRaw(): Promise<Settings> {
  const sql = await db();
  const [s] = await sql<Settings[]>`
    select league_name, season_name, num_weeks, sub_credit, playoff_size, announcement, rules
    from settings where id = 1`;
  return s;
}

async function getPlayersRaw(): Promise<Player[]> {
  const sql = await db();
  return sql<Player[]>`
    select p.id, p.last_name, p.first_initial, p.is_sub, p.active,
           floor(extract(epoch from ph.updated_at))::int as photo_v
    from players p left join player_photos ph on ph.player_id = p.id
    order by lower(p.last_name), lower(p.first_initial), p.id`;
}

async function getWeeksRaw(): Promise<WeekInfo[]> {
  const sql = await db();
  return sql<WeekInfo[]>`
    select week_no, to_char(play_date, 'YYYY-MM-DD') as play_date, notes
    from weeks order by week_no`;
}

async function getMatchesRaw(weekNo?: number): Promise<MatchRow[]> {
  const sql = await db();
  const rows = await sql<
    { id: number; week_no: number; table_no: number; side: Slot["side"] | null; seat: number | null;
      player_id: number | null; sub_id: number | null; score: number | null; adjust: number | null; no_show: boolean | null }[]
  >`
    select m.id, m.week_no, m.table_no, s.side, s.seat, s.player_id, s.sub_id, s.score, s.adjust, s.no_show
    from matches m left join match_slots s on s.match_id = m.id
    ${weekNo != null ? sql`where m.week_no = ${weekNo}` : sql``}
    order by m.week_no, m.table_no`;
  const byId = new Map<number, MatchRow>();
  for (const r of rows) {
    let m = byId.get(r.id);
    if (!m) {
      m = {
        id: r.id,
        week_no: r.week_no,
        table_no: r.table_no,
        slots: SLOT_ORDER.map(([side, seat]) => ({ side, seat, player_id: null, sub_id: null, score: null, adjust: null, no_show: false })),
      };
      byId.set(r.id, m);
    }
    if (r.side && r.seat) {
      const slot = m.slots.find((s) => s.side === r.side && s.seat === r.seat)!;
      slot.player_id = r.player_id;
      slot.sub_id = r.sub_id;
      slot.score = r.score;
      slot.adjust = r.adjust;
      slot.no_show = !!r.no_show;
    }
  }
  return [...byId.values()];
}

async function getOffDatesRaw(): Promise<OffDate[]> {
  const sql = await db();
  return sql<OffDate[]>`
    select to_char(off_date, 'YYYY-MM-DD') as off_date, reason from off_dates order by off_date`;
}

async function getLeagueRaw(weekNo?: number) {
  const [settings, players, weeks, matches, offDates] = await Promise.all([
    getSettings(),
    getPlayers(),
    getWeeks(),
    getMatches(weekNo),
    getOffDates(),
  ]);
  return { settings, players, weeks, matches, offDates };
}

/** Every write in lib/actions.ts calls revalidateTag(LEAGUE_TAG), so cached data is never stale after a save. */
export const LEAGUE_TAG = "league";
// Keep league data in Next's data cache between requests (shared by all server instances on Vercel),
// so most page loads don't touch the database at all. Re-checked hourly as a safety net.
const shared = <A extends unknown[], R>(fn: (...a: A) => Promise<R>, key: string) =>
  unstable_cache(fn, [key], { tags: [LEAGUE_TAG], revalidate: 3600 });

// And dedupe within one request: the layout and the page both ask for settings, etc.
export const getSettings = cache(shared(getSettingsRaw, "settings"));
export const getPlayers = cache(shared(getPlayersRaw, "players"));
export const getWeeks = cache(shared(getWeeksRaw, "weeks"));
export const getMatches = cache(shared(getMatchesRaw, "matches"));
export const getOffDates = cache(shared(getOffDatesRaw, "off-dates"));
export const getLeague = cache(getLeagueRaw);
