import "server-only";
import { db } from "./db";
import type { MatchRow, Player, Settings, Slot, WeekInfo } from "./types";

const SLOT_ORDER: [Slot["side"], Slot["seat"]][] = [
  ["A", 1],
  ["A", 2],
  ["B", 1],
  ["B", 2],
];

export async function getSettings(): Promise<Settings> {
  const sql = await db();
  const [s] = await sql<Settings[]>`
    select league_name, season_name, num_weeks, sub_credit, playoff_size, announcement, rules
    from settings where id = 1`;
  return s;
}

export async function getPlayers(): Promise<Player[]> {
  const sql = await db();
  return sql<Player[]>`
    select id, last_name, first_initial, is_sub, active
    from players order by lower(last_name), lower(first_initial), id`;
}

export async function getWeeks(): Promise<WeekInfo[]> {
  const sql = await db();
  return sql<WeekInfo[]>`
    select week_no, to_char(play_date, 'YYYY-MM-DD') as play_date, notes
    from weeks order by week_no`;
}

export async function getMatches(weekNo?: number): Promise<MatchRow[]> {
  const sql = await db();
  const rows = await sql<
    { id: number; week_no: number; table_no: number; side: Slot["side"] | null; seat: number | null;
      player_id: number | null; sub_id: number | null; score: number | null; adjust: number | null }[]
  >`
    select m.id, m.week_no, m.table_no, s.side, s.seat, s.player_id, s.sub_id, s.score, s.adjust
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
        slots: SLOT_ORDER.map(([side, seat]) => ({ side, seat, player_id: null, sub_id: null, score: null, adjust: null })),
      };
      byId.set(r.id, m);
    }
    if (r.side && r.seat) {
      const slot = m.slots.find((s) => s.side === r.side && s.seat === r.seat)!;
      slot.player_id = r.player_id;
      slot.sub_id = r.sub_id;
      slot.score = r.score;
      slot.adjust = r.adjust;
    }
  }
  return [...byId.values()];
}

export async function getLeague(weekNo?: number) {
  const [settings, players, weeks, matches] = await Promise.all([
    getSettings(),
    getPlayers(),
    getWeeks(),
    getMatches(weekNo),
  ]);
  return { settings, players, weeks, matches };
}
