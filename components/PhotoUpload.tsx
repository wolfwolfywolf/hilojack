"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePhotos } from "@/lib/actions";
import { matchPlayer } from "@/lib/photoMatch";
import { displayName } from "@/lib/standings";
import type { Player } from "@/lib/types";

const SIZE = 256;

/** Shrink to a 256px square JPEG in the browser, so uploads are tiny. Crops a little toward the top to keep faces. */
async function shrink(file: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const sx = (bmp.width - side) / 2;
  const sy = Math.max(0, (bmp.height - side) * 0.25);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, sx, sy, side, side, 0, 0, SIZE, SIZE);
  bmp.close();
  return new Promise((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("Could not read that image."))), "image/jpeg", 0.85));
}

async function upload(items: { id: number; blob: Blob }[]) {
  let saved = 0;
  const errors: string[] = [];
  for (let i = 0; i < items.length; i += 8) {
    const fd = new FormData();
    for (const it of items.slice(i, i + 8)) fd.append(`photo_${it.id}`, it.blob, `${it.id}.jpg`);
    const r = await savePhotos(fd);
    saved += r.saved;
    errors.push(...r.errors);
  }
  return { saved, errors };
}

/** Add or replace one player's photo (admin player page). */
export function PlayerPhotoUpload({ playerId, hasPhoto }: { playerId: number; hasPhoto: boolean }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  return (
    <span>
    <label className="btn secondary" style={{ cursor: busy ? "wait" : "pointer" }}>
      {busy ? "Saving…" : hasPhoto ? "Change photo" : "Add photo"}
      <input
        type="file"
        accept="image/*"
        hidden
        disabled={busy}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setErr(null);
          start(async () => {
            try {
              const r = await upload([{ id: playerId, blob: await shrink(f) }]);
              if (r.errors.length) setErr(r.errors.join(" "));
              router.refresh();
            } catch (x) {
              setErr(x instanceof Error ? x.message : "Upload failed.");
            }
          });
        }}
      />
    </label>
    {err && <p className="small" style={{ color: "var(--err)" }}>{err}</p>}
    </span>
  );
}

type Picked = { name: string; player: Player | null; blob: Blob | null; url: string | null };

/** Pick many photos at once, named after the players ("John Smith.jpg" or "Smith, J.jpg"). */
export function BulkPhotoUpload({ players }: { players: Player[] }) {
  const router = useRouter();
  const [picked, setPicked] = useState<Picked[]>([]);
  const [busy, start] = useTransition();
  const [result, setResult] = useState<string | null>(null);
  const matched = picked.filter((p) => p.player && p.blob);
  const unmatched = picked.filter((p) => !p.player || !p.blob);

  return (
    <div>
      <p className="small muted" style={{ marginTop: 0 }}>
        Name each photo after the player, like &quot;John Smith.jpg&quot; or &quot;Smith, J.jpg&quot;, then pick them all here. You&apos;ll see who each one matched before anything is saved.
      </p>
      <input
        type="file"
        accept="image/*"
        multiple
        disabled={busy}
        onChange={async (e) => {
          const files = [...(e.target.files ?? [])];
          setResult(null);
          const out: Picked[] = [];
          for (const f of files) {
            const player = matchPlayer(f.name, players);
            let blob: Blob | null = null;
            try { blob = await shrink(f); } catch { /* listed as not usable */ }
            out.push({ name: f.name, player, blob, url: blob ? URL.createObjectURL(blob) : null });
          }
          setPicked(out);
        }}
      />
      {matched.length > 0 && (
        <ul className="photo-matches">
          {matched.map((p) => (
            <li key={p.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url!} alt="" />
              <span>{displayName(p.player)}{p.player!.photo_v ? <span className="muted small"> (replaces)</span> : null}</span>
            </li>
          ))}
        </ul>
      )}
      {unmatched.length > 0 && (
        <p className="small" style={{ color: "var(--err)" }}>
          Not matched, so they won&apos;t be saved: {unmatched.map((p) => p.name).join(", ")}
        </p>
      )}
      {matched.length > 0 && (
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            start(async () => {
              const r = await upload(matched.map((p) => ({ id: p.player!.id, blob: p.blob! })));
              setResult(`Saved ${r.saved} photo${r.saved === 1 ? "" : "s"}.${r.errors.length ? " " + r.errors.join(" ") : ""}`);
              setPicked([]);
              router.refresh();
            })
          }
        >
          {busy ? "Saving…" : `Save ${matched.length} photo${matched.length === 1 ? "" : "s"}`}
        </button>
      )}
      {result && <p className="small">{result}</p>}
    </div>
  );
}
