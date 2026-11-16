-- Hi Lo Jack league tables. Safe to run more than once.
-- The app also creates these on its own the first time it connects.
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
  adjust    int,  -- this player's own +/- (no-show or early-leave penalty)
  primary key (match_id, side, seat)
);

-- Nights with no league (holidays). Later weeks were pushed back a week when one was added.
create table if not exists off_dates (
  off_date  date primary key,
  reason    text not null default ''
);

-- Lock the tables away from Supabase's public API (anon/authenticated keys).
-- The app connects as the table owner, which RLS does not restrict.
alter table settings    enable row level security;
alter table players     enable row level security;
alter table weeks       enable row level security;
alter table matches     enable row level security;
alter table match_slots enable row level security;
alter table off_dates   enable row level security;
