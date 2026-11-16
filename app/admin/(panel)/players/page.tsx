import { getPlayers } from "@/lib/league";
import { addPlayers, deletePlayer, updatePlayer } from "@/lib/actions";
import { displayName } from "@/lib/standings";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Flash, one, type SearchParams } from "@/components/Flash";
import type { Player } from "@/lib/types";

function PlayerTable({ title, players }: { title: string; players: Player[] }) {
  return (
    <section>
      <h2>{title} ({players.length})</h2>
      {players.length === 0 ? (
        <p className="muted">None yet.</p>
      ) : (
        <div className="table-scroll card" style={{ padding: 0 }}>
          <table className="players-edit">
            <thead>
              <tr><th>Shown as</th><th>Last name</th><th>Initial</th><th>Sub</th><th>Active</th><th /></tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const formId = `p${p.id}`;
                return (
                  <tr key={p.id} className={p.active ? undefined : "muted"}>
                    <td className="pe-name">{displayName(p)}</td>
                    <td className="pe-last"><input form={formId} name="last_name" defaultValue={p.last_name} required aria-label="Last name" /></td>
                    <td className="pe-init"><input form={formId} name="first_initial" defaultValue={p.first_initial} maxLength={1} aria-label="First initial" /></td>
                    <td className="pe-sub"><label className="inline-check"><input form={formId} type="checkbox" name="is_sub" defaultChecked={p.is_sub} /> <span className="show-sm">Sub</span></label></td>
                    <td className="pe-active"><label className="inline-check"><input form={formId} type="checkbox" name="active" defaultChecked={p.active} /> <span className="show-sm">Active</span></label></td>
                    <td className="pe-actions">
                      <div className="row">
                        <form id={formId} action={updatePlayer}>
                          <input type="hidden" name="id" value={p.id} />
                          <button type="submit" className="secondary">Save</button>
                        </form>
                        <form action={deletePlayer}>
                          <input type="hidden" name="id" value={p.id} />
                          <ConfirmButton type="submit" className="secondary" message={`Delete ${displayName(p)}? This can't be undone.`} title="Only works for players not on the schedule">Delete</ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function PlayersAdmin({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const players = await getPlayers();
  const regulars = players.filter((p) => !p.is_sub);
  const subs = players.filter((p) => p.is_sub);
  const activeRegulars = regulars.filter((p) => p.active).length;
  return (
    <div>
      <h1>Players</h1>
      <Flash msg={one(sp.msg)} err={one(sp.err)} />
      <form action={addPlayers} className="card">
        <div className="field">
          <label htmlFor="names">Add players, one per line. &quot;Smith, John&quot;, &quot;John Smith&quot; or &quot;Smith, J&quot; all work; only the first initial is kept.</label>
          <textarea id="names" name="names" placeholder={"Smith, John\nJones, B\nMike Brown"} />
        </div>
        <div className="row">
          <label className="inline-check"><input type="checkbox" name="is_sub" /> These are subs</label>
          <button type="submit">Add</button>
        </div>
      </form>
      <p className="muted small">
        {activeRegulars} active league players.{" "}
        {activeRegulars % 4 !== 0 && activeRegulars > 0
          ? `The schedule needs a multiple of 4 (you're ${4 - (activeRegulars % 4)} short of ${activeRegulars + 4 - (activeRegulars % 4)}).`
          : ""}
      </p>
      <PlayerTable title="League players" players={regulars} />
      <PlayerTable title="Subs" players={subs} />
    </div>
  );
}
