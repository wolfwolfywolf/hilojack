export interface Settings {
  league_name: string;
  season_name: string;
  num_weeks: number;
  sub_credit: "scheduled" | "none";
  playoff_size: number;
  announcement: string;
  rules: string;
}

export interface Player {
  id: number;
  last_name: string;
  first_initial: string;
  is_sub: boolean;
  active: boolean;
}

export interface WeekInfo {
  week_no: number;
  play_date: string | null; // YYYY-MM-DD
  notes: string;
}

export interface Slot {
  side: "A" | "B";
  seat: 1 | 2;
  player_id: number | null;
  sub_id: number | null;
  score: number | null;
  adjust: number | null;
}

export interface MatchRow {
  id: number;
  week_no: number;
  table_no: number;
  slots: Slot[]; // always 4, ordered A1, A2, B1, B2
}

export interface StandingRow {
  player: Player;
  rank: number;
  weeksPlayed: number; // weeks with a credited score
  total: number;
  average: number;
  high: number | null;
  subbedOut: number; // weeks a sub played in their place
}

export interface SubAppearance {
  week_no: number;
  sub: Player;
  forPlayer: Player | null;
  score: number | null;
}
