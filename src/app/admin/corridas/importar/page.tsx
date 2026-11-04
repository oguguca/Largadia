import { requireAdmin } from "@/lib/session";
import { MAX_LINKS_PER_BATCH } from "@/domain/importacao/lote";
import { BatchImportForm } from "./batch-import-form";
import { CalendarBookmarkletLink } from "./calendar-bookmarklet-link";

// Cada link leva alguns segundos (página + geocode, com pausa entre eles)
export const maxDuration = 60;

export default async function ImportarCorridasPage() {
  await requireAdmin();
  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="font-display text-2xl font-extrabold italic uppercase">Importar em lote</h1>
      <CalendarBookmarkletLink />
      <h2 className="pt-2 font-display text-lg font-bold uppercase">Por links</h2>
      <p className="text-sm text-asfalto-500">
        Cole até {MAX_LINKS_PER_BATCH} links de páginas de prova (um por linha). Cada prova entra como pendente, com nome, data,
        local, organizador e imagem. Preço e distâncias não aparecem na página da plataforma: confira na edição antes de publicar.
      </p>
      <BatchImportForm />
    </div>
  );
}
