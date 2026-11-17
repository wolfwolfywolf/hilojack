import type { Player } from "@/lib/types";

/** Small round photo, or the player's initials when there's no photo. */
export function Avatar({ player, size = 32 }: { player: Pick<Player, "id" | "last_name" | "first_initial" | "photo_v">; size?: number }) {
  const style = { width: size, height: size, fontSize: Math.round(size * 0.38) };
  if (player.photo_v)
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="avatar" src={`/photo/${player.id}?v=${player.photo_v}`} alt="" width={size} height={size} style={style} loading="lazy" />;
  const initials = `${player.first_initial.charAt(0)}${player.last_name.charAt(0)}`.toUpperCase();
  return <span className="avatar empty" style={style} aria-hidden>{initials}</span>;
}
