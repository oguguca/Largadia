import "server-only";
import sharp from "sharp";
import { db } from "@/lib/db";

/** Maior arquivo aceito do computador do admin (o envio inteiro tem limite de 4 MB no next.config). */
export const MAX_IMAGE_BYTES = 3.5 * 1024 * 1024;
const MAX_SIDE = 1200;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp", "gif", "avif", "heif"]);

export type SavedImage = { url: string } | { error: string };

/**
 * Grava a imagem enviada no banco, reduzida para no máximo 1200 px e convertida para WebP.
 * Devolve o endereço em que o site serve a imagem. Arquivo vazio = nenhuma imagem enviada (null).
 */
export async function saveUploadedImage(file: FormDataEntryValue | null): Promise<SavedImage | null> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_IMAGE_BYTES) return { error: "Imagem grande demais: envie uma de até 3,5 MB." };
  const bytes = Buffer.from(await file.arrayBuffer());
  // O tipo informado pelo navegador nem sempre vem certo (no Windows pode vir vazio): quem decide é o conteúdo
  const format = await sharp(bytes)
    .metadata()
    .then((m) => m.format)
    .catch(() => undefined);
  if (!format || !ACCEPTED_FORMATS.has(format)) return { error: "Envie um arquivo de imagem (JPG, PNG, WebP, GIF ou AVIF)." };
  try {
    const { data, info } = await sharp(bytes, { animated: false })
      .rotate() // respeita a orientação da foto do celular
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    const saved = await db.upload.create({
      data: { contentType: "image/webp", data, width: info.width, height: info.height },
      select: { id: true },
    });
    return { url: `/api/imagens/${saved.id}` };
  } catch {
    return { error: "Não consegui ler essa imagem. Tente outro arquivo." };
  }
}
