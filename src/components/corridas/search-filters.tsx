import { distanceBuckets, priceOptions, raceTypeLabels, UFS } from "@/config/corridas";
import type { SearchFilters } from "@/domain/corridas/filtros";
import { LocationField } from "./location-field";

const field = "w-full rounded-lg border border-asfalto-300 bg-white px-3 py-2 text-sm";
const label = "text-xs font-semibold text-asfalto-500 uppercase";

/** Formulário GET: funciona sem JavaScript e gera URLs compartilháveis. */
export function SearchFiltersForm({ filters }: { filters: SearchFilters }) {
  return (
    <form action="/busca" className="space-y-4">
      {filters.view === "mapa" && <input type="hidden" name="view" value="mapa" />}
      <label className="block space-y-1.5">
        <span className={label}>Buscar</span>
        <input name="q" defaultValue={filters.q} placeholder="Nome, cidade ou organizador" className={field} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className={label}>Estado</span>
          <select name="uf" defaultValue={filters.uf ?? ""} className={field}>
            <option value="">Todos</option>
            {UFS.map((uf) => (
              <option key={uf}>{uf}</option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5">
          <span className={label}>Tipo</span>
          <select name="tipo" defaultValue={filters.tipo ?? ""} className={field}>
            <option value="">Todos</option>
            {Object.entries(raceTypeLabels).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filters.cidade && <input type="hidden" name="cidade" value={filters.cidade} />}

      <LocationField
        initial={filters.lat !== undefined && filters.lng !== undefined ? { lat: filters.lat, lng: filters.lng } : undefined}
        initialRadius={filters.raio}
      />

      <fieldset className="space-y-1.5">
        <legend className={label}>Distância</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(distanceBuckets).map(([v, b]) => (
            <label key={v} className="cursor-pointer">
              <input type="radio" name="dist" value={v} defaultChecked={filters.dist === v} className="peer sr-only" />
              <span className="inline-block rounded-full border border-asfalto-300 bg-white px-3 py-1 text-sm peer-checked:border-largada-500 peer-checked:bg-largada-500 peer-checked:text-asfalto-950 peer-focus-visible:ring-2 peer-focus-visible:ring-largada-500">
                {b.label}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5">
          <span className={label}>De</span>
          <input type="date" name="de" defaultValue={filters.de} className={field} />
        </label>
        <label className="block space-y-1.5">
          <span className={label}>Até</span>
          <input type="date" name="ate" defaultValue={filters.ate} className={field} />
        </label>
      </div>

      <label className="block space-y-1.5">
        <span className={label}>Preço</span>
        <select name="preco" defaultValue={filters.preco?.toString() ?? ""} className={field}>
          <option value="">Qualquer valor</option>
          {priceOptions.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2">
        <button className="flex-1 rounded-lg bg-largada-500 px-4 py-2.5 font-semibold text-asfalto-950 hover:bg-largada-600">
          Aplicar filtros
        </button>
        <a href={filters.view === "mapa" ? "/busca?view=mapa" : "/busca"} className="rounded-lg px-4 py-2.5 text-sm text-asfalto-500 hover:text-asfalto-900">
          Limpar
        </a>
      </div>
    </form>
  );
}
