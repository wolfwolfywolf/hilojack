import { cookies } from "next/headers";
import { getPlayers, getSettings } from "@/lib/league";
import { pickMe } from "@/lib/actions";
import { displayName } from "@/lib/standings";
import { one, type SearchParams } from "@/components/Flash";
import { Avatar } from "@/components/Avatar";

/** Pick (or switch) who you are on this phone. One tap sets it. */
export default async function PickMe({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = one(sp.next) ?? "/";
  const meId = Number((await cookies()).get("hlj_me")?.value) || undefined;
  const all = (await getPlayers()).filter((p) => p.active);
  const groups = [
    { title: "League players", list: all.filter((p) => !p.is_sub) },
    { title: "Subs", list: all.filter((p) => p.is_sub) },
  ].filter((g) => g.list.length);
  const anyPhotos = (await getSettings()).show_photos && all.some((p) => p.photo_v);
  return (
    <div className="pick-me">
      <h1>Who are you?</h1>
      <p className="muted small">Tap your name. This phone will remember it, and your matches and standings row will be highlighted.</p>
      <form action={pickMe}>
        <input type="hidden" name="next" value={next} />
        {groups.map((g) => (
          <section key={g.title}>
            <h2>{g.title}</h2>
            <div className="pick-grid">
              {g.list.map((p) => (
                <button key={p.id} type="submit" name="player" value={p.id} className={p.id === meId ? "pick on" : "pick"}>
                  {anyPhotos && <Avatar player={p} size={32} />}
                  {displayName(p)}
                </button>
              ))}
            </div>
          </section>
        ))}
        {meId && (
          <p className="small" style={{ marginTop: 16 }}>
            <button type="submit" name="player" value="" className="link">Clear my name from this phone</button>
          </p>
        )}
      </form>
    </div>
  );
}
