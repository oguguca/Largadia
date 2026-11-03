import { z } from "zod";
import { db } from "@/lib/db";

/** Serve as imagens enviadas pelo admin. O conteúdo de um id nunca muda, então o navegador pode guardar para sempre. */
export async function GET(_request: Request, ctx: RouteContext<"/api/imagens/[id]">) {
  const id = z.string().cuid().safeParse((await ctx.params).id);
  if (!id.success) return new Response("Imagem não encontrada", { status: 404 });
  const image = await db.upload.findUnique({ where: { id: id.data }, select: { contentType: true, data: true } });
  if (!image) return new Response("Imagem não encontrada", { status: 404 });
  return new Response(new Uint8Array(image.data), {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
