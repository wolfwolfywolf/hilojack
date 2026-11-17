import Link from "next/link";
import { getPlayers, getSettings } from "@/lib/league";
import { addPlayers, setShowPhotos } from "@/lib/actions";
import { displayName } from "@/lib/standings";
import { Flash, one, type SearchParams } from "@/components/Flash";
import type { Player } from "@/lib/types";
import { Avatar } from "@/components/Avatar";
import { BulkPhotoUpload } from "@/components/PhotoUpload";

function NameList({ players }: { players: Player[] }) {
  return (
    <ul className="name-list card">
      {players.map((p) => (
        <li key={p.id}>
          <Link href={`/admin/players/${p.id}`}><Avatar player={p} size={28} />{displayName(p)}</Link>
        </li>
      ))}
    </ul>
  );
}

/** Compact list of names; tap one to edit that player. */
export default async function PlayersAdmin({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const [players, settings] = await Promise.all([getPlayers(), getSettings()]);
  const regulars = players.filter((p) => !p.is_sub && p.active);
  const subs = players.filter((p) => p.is_sub && p.active);
  const inactive = players.filter((p) => !p.active);
  return (
    <div>
      <h1>Players</h1>
      <Flash msg={one(sp.msg)} err={one(sp.err)} />
      <details className="card add-players">
        <summary>Add players</summary>
        <form action={addPlayers}>
          <div className="field">
            <label htmlFor="names">One per line. &quot;Smith, John&quot;, &quot;John Smith&quot; or &quot;Smith, J&quot; all work; only the first initial is kept.</label>
            <textarea id="names" name="names" placeholder={"Smith, John\nJones, B\nMike Brown"} />
          </div>
          <div className="row">
            <label className="inline-check"><input type="checkbox" name="is_sub" /> These are subs</label>
            <button type="submit">Add</button>
          </div>
        </form>
      </details>

      <form action={setShowPhotos} className="card photo-switch">
        <label className="inline-check">
          <input type="checkbox" name="show_photos" defaultChecked={settings.show_photos} />
          <strong>Show photos to players</strong>
        </label>
        <button type="submit" className="secondary">Save</button>
        <p className="muted small" style={{ margin: 0, flexBasis: "100%" }}>
          {settings.show_photos
            ? "On: players see photos on player pages and the name picker."
            : "Off: only managers see photos. Players see the site exactly as before."}
        </p>
      </form>

      <details className="card add-players">
        <summary>Add photos</summary>
        <BulkPhotoUpload players={players} />
      </details>

      <h2>League players ({regulars.length})</h2>
      {regulars.length ? <NameList players={regulars} /> : <p className="muted">None yet.</p>}
      {regulars.length % 4 !== 0 && (
        <p className="muted small">
          The schedule needs a multiple of 4 ({4 - (regulars.length % 4)} short of {regulars.length + 4 - (regulars.length % 4)}).
        </p>
      )}

      <h2>Subs ({subs.length})</h2>
      {subs.length ? <NameList players={subs} /> : <p className="muted">None yet.</p>}

      {inactive.length > 0 && (
        <details className="inactive-players">
          <summary>Inactive ({inactive.length})</summary>
          <NameList players={inactive} />
        </details>
      )}
      <p className="muted small">Tap a name to add or change their photo, rename them, switch between player and sub, retire them, or delete them.</p>
    </div>
  );
}
