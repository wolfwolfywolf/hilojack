import { getSettings } from "@/lib/league";
import { resetSeason, saveSettings } from "@/lib/actions";
import { Flash, one, type SearchParams } from "@/components/Flash";

export default async function SettingsAdmin({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const s = await getSettings();
  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h1>Settings</h1>
      <Flash msg={one(sp.msg)} err={one(sp.err)} />
      <form action={saveSettings} className="card">
        <div className="field">
          <label htmlFor="league_name">League name</label>
          <input id="league_name" name="league_name" defaultValue={s.league_name} />
        </div>
        <div className="field">
          <label htmlFor="season_name">Season</label>
          <input id="season_name" name="season_name" defaultValue={s.season_name} />
        </div>
        <div className="row">
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="num_weeks">Weeks in the regular season</label>
            <input id="num_weeks" name="num_weeks" type="number" min={1} max={52} defaultValue={s.num_weeks} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label htmlFor="playoff_size">Players in the playoffs</label>
            <input id="playoff_size" name="playoff_size" type="number" min={2} max={64} defaultValue={s.playoff_size} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="sub_credit">When a sub plays for someone</label>
          <select id="sub_credit" name="sub_credit" defaultValue={s.sub_credit}>
            <option value="scheduled">The absent player gets the points the sub earned</option>
            <option value="none">The absent player gets no points that week</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="announcement">Announcement on the standings page (optional)</label>
          <textarea id="announcement" name="announcement" defaultValue={s.announcement} style={{ minHeight: "5rem" }} />
        </div>
        <div className="field">
          <label htmlFor="rules">League rules page. Leave empty to show the built-in rules (from the 2023–24 rules sheet); paste your own text to replace them.</label>
          <textarea id="rules" name="rules" defaultValue={s.rules} style={{ minHeight: "10rem" }} />
        </div>
        <button type="submit">Save settings</button>
      </form>

      <form action={resetSeason} className="card">
        <h2 style={{ marginTop: 0 }}>Start a new season</h2>
        <p className="muted">Deletes every week, matchup and score. Players are kept.</p>
        <div className="row">
          <input name="confirm" placeholder="Type RESET" aria-label="Type RESET to confirm" />
          <button type="submit" className="danger">Clear season</button>
        </div>
      </form>
    </div>
  );
}
