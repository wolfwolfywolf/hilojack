import { getSettings } from "@/lib/league";

function BuiltInRules() {
  return (
    <>
      <h2>Weekly play</h2>
      <p>
        Two teams of two play <strong>5 games to 11</strong> each week. Partners are set by the schedule and change every week.
        Scoring is individual: both partners are credited with the pair&apos;s total points for the night.
      </p>
      <ul>
        <li><strong>2 points</strong> to the winning team for each game.</li>
        <li><strong>1 point</strong> to the winning team for every bump (set) inflicted on the losing team.</li>
        <li><strong>1 point</strong> to the winning team if the losing team is caught in the hole.</li>
        <li><strong>1 bonus point</strong> for winning 4 or more games in a night.</li>
      </ul>
      <p>The team(s) with the most points each week split the weekly prize.</p>

      <h2>In the hole</h2>
      <p>
        A team that finishes a game below zero is in the hole. A team that went below zero at any point must score back to at
        least +1 and finish at or above zero, or it is in the hole. A team that never went below zero, or scored and then lost
        points to a bump but finished at or above zero, is not in the hole.
      </p>

      <h2>Subs, no-shows and leaving early</h2>
      <ul>
        <li>If you can&apos;t play, it&apos;s your job to find a sub from the sub list. League players can&apos;t sub during the regular season, but eliminated players can sub in the tournament.</li>
        <li>No team and no subs by 7:30: the opposing team gets <strong>6 points</strong>, each missing player gets <strong>−2</strong>, and a partner who showed up gets <strong>3 points</strong>.</li>
        <li>A player who leaves after games start forfeits that night&apos;s points and gets <strong>−2</strong>. A partner who stays gets <strong>3 points</strong> plus the points won before the player left. Opponents get their points so far plus <strong>6</strong>.</li>
      </ul>

      <h2>Season and tournament</h2>
      <p>
        18 weeks of regular play, then a 3-week elimination tournament. Season standings set the tournament partners and seeding
        and the 1st, 2nd and 3rd place payouts.
      </p>

      <h2>Scorecards</h2>
      <p>
        Fill in both teams&apos; names and the date. For each game mark the winning team, the number of bumps, and whether the
        other team was caught in the hole. Hand the card in at the end of the night.
      </p>

      <h2>Table rules</h2>
      <ul>
        <li><strong>Renege:</strong> failing to follow suit (other than with trump) while holding the led suit. If caught before an opponent plays, correct it. Otherwise: a bidder&apos;s renege is a set for the bid amount and opponents get a point; a non-bidder&apos;s renege gives the bidders their bid and the reneging team loses a point.</li>
        <li><strong>Bidding:</strong> the dealer may take the bid at the current high bid. If nobody else bids, the dealer must pitch a 2 bid.</li>
        <li><strong>Misdeal:</strong> caught before bidding, the dealer deals again. Caught after bidding or play starts, the deal passes left. No points either way.</li>
      </ul>
      <p className="muted small">Disputes are settled by the committee.</p>
    </>
  );
}

export default async function RulesPage() {
  const s = await getSettings();
  return (
    <div className="card" style={{ maxWidth: 720 }}>
      <h1>League rules</h1>
      {s.rules.trim() ? <div style={{ whiteSpace: "pre-wrap" }}>{s.rules}</div> : <BuiltInRules />}
    </div>
  );
}
