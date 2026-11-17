import Link from "next/link";
import { notFound } from "next/navigation";
import { getLeague } from "@/lib/league";
import { deletePlayer, updatePlayer } from "@/lib/actions";
import { displayName } from "@/lib/standings";
import { ConfirmButton } from "@/components/ConfirmButton";
import { Flash, one, type SearchParams } from "@/components/Flash";

/** Edit one player: name, sub or regular, active, delete. */
export default async function EditPlayer({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const id = Number((await params).id);
  const sp = await searchParams;
  const { players, matches } = await getLeague();
  const p = players.find((x) => x.id === id);
  if (!p) notFound();

  let scheduled = 0;
  let scored = 0;
  for (const m of matches)
    for (const s of m.slots)
      if (s.player_id === id || s.sub_id === id) {
        scheduled++;
        if (s.score != null || s.adjust != null || s.no_show) scored++;
      }
  const blocked = scored > 0 ? "They have scores, so deleting would change past results." : scheduled > 0 ? "They're on the schedule." : null;

  return (
    <div className="edit-player">
      <p className="small"><Link href="/admin/players">‹ All players</Link></p>
      <h1>{displayName(p)}</h1>
      <Flash msg={one(sp.msg)} err={one(sp.err)} />

      <form action={updatePlayer} className="card stack-form">
        <input type="hidden" name="id" value={p.id} />
        <div className="field">
          <label htmlFor="last_name">Last name</label>
          <input id="last_name" name="last_name" defaultValue={p.last_name} required autoComplete="off" />
        </div>
        <div className="field">
          <label htmlFor="first_initial">First initial</label>
          <input id="first_initial" name="first_initial" defaultValue={p.first_initial} maxLength={1} autoComplete="off" style={{ width: "4rem" }} />
        </div>
        <label className="inline-check"><input type="checkbox" name="is_sub" defaultChecked={p.is_sub} /> Sub (not a league player)</label>
        <label className="inline-check"><input type="checkbox" name="active" defaultChecked={p.active} /> Active (untick to retire them; their history stays)</label>
        <button type="submit" className="big-save">Save</button>
      </form>

      <section className="card danger-zone">
        <h2 style={{ marginTop: 0 }}>Delete</h2>
        {blocked ? (
          <>
            <p className="muted small" style={{ marginTop: 0 }}>
              Can&apos;t delete this player. {blocked} Untick Active above instead.
            </p>
            <button type="button" className="secondary" disabled>Delete player</button>
          </>
        ) : (
          <form action={deletePlayer}>
            <input type="hidden" name="id" value={p.id} />
            <p className="muted small" style={{ marginTop: 0 }}>{displayName(p)} has no games, so it&apos;s safe to delete them.</p>
            <ConfirmButton type="submit" className="danger" message={`Delete ${displayName(p)}? This can't be undone.`}>Delete player</ConfirmButton>
          </form>
        )}
      </section>
    </div>
  );
}
