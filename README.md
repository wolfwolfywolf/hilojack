# Hi Lo Jack League

Scoreboard and schedule for the club's Hi Lo Jack league.

**Players** (one shared password) see the standings, a "who am I playing this week" card (pick your name once per phone),
the full schedule with a "show my matches" filter, each player's season, the rules, and a playoff preview.

**League managers** (separate admin password, at `/admin`) add players and subs, make the 18-week schedule, set dates,
move people between tables, assign subs, and enter each pair's points for the night.

## How scoring works in the app

- Managers enter one number per pair per night: the pair's total points. Both partners are credited with it.
- When a sub plays, the regular player they replace gets the points (changeable in Settings).
- The +/− box adjusts a single player, for no-shows (−2, partner +3) or leaving early.
- Standings rank by season total. Ties share a rank. The top pair each week is marked "Week high".
- League players can't be picked as subs during the regular season; subs come from the sub list.

## Schedule generator

Partners rotate round-robin, so with 36 players nobody partners anyone twice in 18 weeks. Pairs are then grouped into
tables to spread opponents out; nobody faces the same player more than twice. The active player count must be a
multiple of 4. Any week can be hand-edited after it is made.

## Setting it up (Supabase + Vercel, both free tiers)

1. **Supabase:** create a project at supabase.com (pick a US East region and save the database password).
   The tables get created automatically the first time the app connects. If you'd rather create them yourself,
   open **SQL Editor → New query**, paste in [`db/schema.sql`](db/schema.sql), and click **Run**. It's safe to run more than once.
2. **Connect it to Vercel**, using either method:
   - **Integration (easiest):** go to Vercel → your project → **Storage** (or **Integrations → Supabase**),
     connect the Supabase project, and pick all environments. That sets `POSTGRES_URL` for you, and the app uses it.
   - **By hand:** in Supabase click **Connect**, copy the **Transaction pooler** URI (port 6543), swap in your
     database password, and save it in Vercel as `DATABASE_URL`.

   Also add these in Vercel → Settings → Environment Variables:

   | Name | Value |
   | --- | --- |
   | `SITE_PASSWORD` | the password you give to players |
   | `ADMIN_PASSWORD` | the managers' password |
   | `AUTH_SECRET` | any long random string (`openssl rand -hex 32`) |

   Then **Deployments → ⋯ → Redeploy** so the new variables take effect.
3. **Domain:** in Vercel → Project → Settings → Domains, add e.g. `league.wolfyspub.com`, then add the CNAME record
   Vercel shows you at your domain registrar.
4. Open `/admin`, sign in, add players (paste a list), then **Schedule & scores → Make schedule** and set the week 1 date.

Changing a password in Vercel (and redeploying) signs everyone out of that side.

## Local development

```bash
cp .env.example .env.local   # point DATABASE_URL at any Postgres
npm install
npm run dev                  # http://localhost:3000
npm test                     # schedule + standings tests
```
