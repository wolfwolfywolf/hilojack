export interface Settings {
  league_name: string;
  season_name: string;
  num_weeks: number;
  sub_credit: "scheduled" | "none";
  playoff_size: number;
  announcement: string;
  rules: string;
  show_photos: boolean;
  /** Players can see the tournament (otherwise the Playoffs page says "To be determined"). */
  tourney_live: boolean;
  /** Dates of tournament nights 1-3 (YYYY-MM-DD), null = not set yet. */
  tourney_dates: (string | null)[];
}

export interface Player {
  id: number;
  last_name: string;
  first_initial: string;
  is_sub: boolean;
  active: boolean;
  /** Changes when the photo changes (used to bust the browser cache); null = no photo. */
  photo_v?: number | null;
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
  no_show: boolean;
}

export interface OffDate {
  off_date: string; // YYYY-MM-DD
  reason: string;
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
