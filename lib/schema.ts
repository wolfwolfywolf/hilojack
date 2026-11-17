// Database schema. Safe to run repeatedly. The app applies it once per schema version (see lib/db.ts),
// so edit this file and deploy; the change is picked up automatically.
export const SCHEMA_SQL = `

create table if not exists settings (
  id            int primary key default 1 check (id = 1),
  league_name   text not null default 'Kirkbrae Hi Lo Jack League',
  season_name   text not null default '2026-27 Season',
  num_weeks     int  not null default 18 check (num_weeks between 1 and 52),
  -- How a sub's score is credited when a sub plays for a scheduled player:
  --   'scheduled' = the absent player is credited with the sub's score
  --   'none'      = the absent player gets nothing for that week
  sub_credit    text not null default 'scheduled' check (sub_credit in ('scheduled', 'none')),
  playoff_size  int  not null default 16 check (playoff_size between 2 and 64),
  announcement  text not null default '',
  rules         text not null default ''  -- empty = show the built-in rules
);
insert into settings (id) values (1) on conflict do nothing;

create table if not exists players (
  id            serial primary key,
  last_name     text not null,
  first_initial text not null,
  is_sub        boolean not null default false,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);

create table if not exists weeks (
  week_no   int primary key,
  play_date date,
  notes     text not null default ''
);

create table if not exists matches (
  id        serial primary key,
  week_no   int not null references weeks(week_no) on delete cascade,
  table_no  int not null,
  unique (week_no, table_no)
);

-- One row per seat: side A or B, seat 1 or 2.
create table if not exists match_slots (
  match_id  int not null references matches(id) on delete cascade,
  side      char(1) not null check (side in ('A', 'B')),
  seat      int not null check (seat in (1, 2)),
  player_id int references players(id) on delete set null,
  sub_id    int references players(id) on delete set null,
  score     int,  -- the pair's points for the night, same for both partners
  adjust    int,  -- old manual +/- (replaced by no_show; kept so earlier entries still count)
  primary key (match_id, side, seat)
);
-- No-show or left early: player gets -2, partner +3, opponents +6 (worked out in lib/standings.ts).
alter table match_slots add column if not exists no_show boolean not null default false;

-- Nights with no league (holidays). Later weeks were pushed back a week when one was added.
create table if not exists off_dates (
  off_date  date primary key,
  reason    text not null default ''
);

-- One small square photo per player (resized in the browser before upload), served at /photo/<id>
-- behind the league password. Kept in the database, not the repo, because the repo is public.
create table if not exists player_photos (
  player_id  int primary key references players(id) on delete cascade,
  image      bytea not null,
  mime       text not null default 'image/jpeg',
  updated_at timestamptz not null default now()
);

-- Managers' switch: show player photos to league members (off = only managers see them).
alter table settings add column if not exists show_photos boolean not null default false;

-- Year-end tournament (lib/tourney.ts). Tables and seats mirror matches/match_slots, by round 1-7.
create table if not exists tourney_tables (
  id        serial primary key,
  round_no  int not null check (round_no between 1 and 7),
  table_no  int not null,
  unique (round_no, table_no)
);
create table if not exists tourney_seats (
  table_id  int not null references tourney_tables(id) on delete cascade,
  side      char(1) not null check (side in ('A', 'B')),
  seat      int not null check (seat in (1, 2)),
  player_id int references players(id) on delete set null,
  sub_id    int references players(id) on delete set null,
  score     int,  -- the pair's points for the round, same for both partners
  primary key (table_id, side, seat)
);
-- Winners of the head-to-head playoff game when players tie at a cut line (after Round 3, 4 or 5).
create table if not exists tourney_tie_winners (
  cut_after int not null check (cut_after in (3, 4, 5)),
  player_id int not null references players(id) on delete cascade,
  primary key (cut_after, player_id)
);
-- Players see "To be determined" until a manager turns this on. One date per tournament night.
alter table settings add column if not exists tourney_live boolean not null default false;
alter table settings add column if not exists tourney_date1 date;
alter table settings add column if not exists tourney_date2 date;
alter table settings add column if not exists tourney_date3 date;

-- Lock the tables away from Supabase's public API (anon/authenticated keys).
-- The app connects as the table owner, which RLS does not restrict.
alter table settings    enable row level security;
alter table players     enable row level security;
alter table weeks       enable row level security;
alter table matches     enable row level security;
alter table match_slots enable row level security;
alter table off_dates   enable row level security;
alter table player_photos enable row level security;
alter table tourney_tables enable row level security;
alter table tourney_seats enable row level security;
alter table tourney_tie_winners enable row level security;
`;
