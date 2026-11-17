/**
 * Year-end tournament rules (from the league's 2026 rules sheet). Matchups and dates are TBD until the
 * league confirms how pairs are set and this season's dates.
 */
export default function PlayoffsPage() {
  return (
    <div className="stack playoffs">
      <div>
        <h1>Year-End Tournament</h1>
        <p className="muted" style={{ margin: 0 }}>
          7 rounds over 3 nights. Players drop out after each night. Standings are individual: both partners get the
          team&apos;s points.
        </p>
      </div>

      <div className="card">
        <strong>Matchups: to be determined</strong>
        <p className="muted small" style={{ marginBottom: 0 }}>Partners and tables will be posted here once they are set.</p>
      </div>

      <section className="card">
        <h2>Night 1 · Rounds 1, 2 &amp; 3</h2>
        <p className="muted small">Date TBD</p>
        <ul>
          <li><strong>Everyone plays.</strong> Partners and seats come from the final season standings (ties go to whoever was higher in Week 16).</li>
          <li>New partners and opponents each round.</li>
          <li><strong>3 games to 11</strong>: 2 points per game, 1 per bump, 1 if the opponents are in the hole. No bonus point.</li>
          <li>After Round 3: <strong>top 20 move on</strong>, the rest are out.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Night 2 · Rounds 4 &amp; 5</h2>
        <p className="muted small">Date TBD</p>
        <ul>
          <li><strong>Round 4 (top 20):</strong> partners and seats from the tournament standings after Round 3 (ties go to whoever was higher in the final week).</li>
          <li>After Round 4 (points from Rounds 1–4): <strong>top 12 move on</strong>.</li>
          <li><strong>Round 5 (top 12):</strong> new partners and opponents from the standings through Round 4 (ties broken by cutting the cards).</li>
          <li>After Round 5 (points from Rounds 1–5): <strong>top 8 move on</strong> to the semifinals.</li>
          <li><strong>5 games to 11</strong>: 2 points per game, 1 per bump, 1 if the opponents are in the hole, plus 1 bonus point for winning 4 or more games.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Night 3 · Rounds 6 &amp; 7</h2>
        <p className="muted small">Date TBD</p>
        <ul>
          <li><strong>Round 6, semifinals (top 8):</strong> 4 teams in 2 matches, partners and seats from the standings through Round 5. Winning teams go to the final. Losing teams take 3rd and 4th place.</li>
          <li><strong>Round 7, final:</strong> the same teams as in Round 6. The winner is Tournament Champion.</li>
          <li>Same scoring as Night 2: 5 games to 11 with the bonus point.</li>
        </ul>
      </section>

      <section className="card">
        <h2>Prizes</h2>
        <ul>
          <li>Champions: <strong>$600</strong></li>
          <li>Second place: <strong>$400</strong></li>
          <li>3rd and 4th place: <strong>$250</strong> per team</li>
        </ul>
      </section>

      <section className="card">
        <h2>Ties at the cut line</h2>
        <p style={{ margin: 0 }}>
          If players are tied for the last spot that moves on (20th, 12th or 8th), they play a single head-to-head playoff
          game. The winner moves on.
        </p>
      </section>
    </div>
  );
}
