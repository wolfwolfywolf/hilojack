import { cookies } from "next/headers";
import { getPlayers } from "@/lib/league";
import { pickMe } from "@/lib/actions";
import { displayName } from "@/lib/standings";
import { one, type SearchParams } from "@/components/Flash";

/** Pick (or switch) who you are on this phone. One tap sets it. */
export default async function PickMe({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = one(sp.next) ?? "/";
  const meId = Number((await cookies()).get("hlj_me")?.value) || undefined;
  const players = (await getPlayers()).filter((p) => !p.is_sub && p.active);
  return (
    <div className="pick-me">
      <h1>Who are you?</h1>
      <p className="muted small">Tap your name. This phone will remember it, and your matches and standings row will be highlighted.</p>
      <form action={pickMe}>
        <input type="hidden" name="next" value={next} />
        <div className="pick-grid">
          {players.map((p) => (
            <button key={p.id} type="submit" name="player" value={p.id} className={p.id === meId ? "pick on" : "pick"}>
              {displayName(p)}
            </button>
          ))}
        </div>
        {meId && (
          <p className="small" style={{ marginTop: 16 }}>
            <button type="submit" name="player" value="" className="link">I&apos;m not a player, clear my name</button>
          </p>
        )}
      </form>
    </div>
  );
}
