import { requireAdmin } from "@/lib/session";
import { saveRace } from "../actions";
import { ImportAndForm } from "./import-and-form";
import { BookmarkletLink } from "./bookmarklet-link";

export default async function NovaCorridaPage() {
  await requireAdmin();
  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 font-display text-2xl font-extrabold italic uppercase">Nova corrida</h1>
      <div className="space-y-6">
        <BookmarkletLink />
        <ImportAndForm save={saveRace.bind(null, null)} />
      </div>
    </div>
  );
}
