import { db } from "@/lib/db";

// A player's photo. Behind the league password like every other page (see middleware.ts).
// The URL carries ?v=<photo version>, so browsers can keep it for a long time.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });
  const sql = await db();
  const [row] = await sql<{ image: Uint8Array; mime: string }[]>`
    select image, mime from player_photos where player_id = ${id}`;
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.image), {
    headers: {
      "Content-Type": row.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
