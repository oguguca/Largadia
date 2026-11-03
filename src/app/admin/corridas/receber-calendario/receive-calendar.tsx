"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { calendarCardSchema, cardToRace, type CalendarCard } from "@/domain/importacao/calendario";
import { importCalendar, knownCalendarKeys, type CalendarImportState } from "../actions";
import { BOOKMARKLET_PING, CALENDAR_TYPE } from "../bookmarklet";

/** `key`: ID da prova na plataforma (ou o link), usado para marcar, descartar repetidas e enviar. */
type Row = { key: string; card: CalendarCard; date?: string; place?: string; note?: string; known?: boolean };

function toRows(raw: unknown): Row[] {
  if (!Array.isArray(raw)) return [];
  const rows = raw.flatMap((item): Row[] => {
    const card = calendarCardSchema.safeParse(item);
    if (!card.success) return [];
    const built = cardToRace(card.data);
    // Provas que já aconteceram nem aparecem
    if (!built.ok && built.reason === "passada") return [];
    if (!built.ok) return [{ key: card.data.url, card: card.data, note: built.message }];
    const d = built.data;
    return [
      {
        key: d.externalId,
        card: card.data,
        date: d.startsAt.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }),
        place: `${d.venue === d.city ? d.city : `${d.venue}, ${d.city}`}/${d.state}`,
      },
    ];
  });
  // A mesma prova pode vir de duas páginas de ano da Yescom: fica só a primeira
  const seen = new Set<string>();
  return rows.filter((r) => !seen.has(r.key) && !!seen.add(r.key));
}

export function ReceiveCalendar() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [waiting, setWaiting] = useState(true);
  const [result, setResult] = useState<CalendarImportState | null>(null);
  const [pending, startTransition] = useTransition();
  /** Reenviar as que já estão no site, só para atualizar data, situação e imagem */
  const [updateKnown, setUpdateKnown] = useState(false);

  useEffect(() => {
    const opener = window.opener as Window | null;
    // Sem janela de origem não há o que esperar
    const timeout = setTimeout(() => setWaiting(false), opener ? 8000 : 0);
    if (!opener) return () => clearTimeout(timeout);
    let done = false;
    const onMessage = async (e: MessageEvent) => {
      if (done || e.source !== opener || e.data?.tipo !== CALENDAR_TYPE) return;
      done = true;
      const parsed = toRows(e.data.cards);
      // Descarta as que já foram enviadas antes
      const known = new Set(await knownCalendarKeys({ cards: parsed.map((r) => r.card) }));
      const received = parsed.map((r) => ({ ...r, known: known.has(r.key) }));
      setRows(received);
      setSelected(new Set(received.filter((r) => !r.note && !r.known).map((r) => r.key)));
      setWaiting(false);
    };
    window.addEventListener("message", onMessage);
    // Avisa o calendário que pode mandar os dados (o ping não leva nada)
    opener.postMessage(BOOKMARKLET_PING, "*");
    return () => {
      window.removeEventListener("message", onMessage);
      clearTimeout(timeout);
    };
  }, []);

  if (waiting) return <p className="text-asfalto-500">Recebendo as provas do calendário…</p>;
  if (!rows) {
    return (
      <p className="rounded-lg bg-largada-100 p-3 text-sm text-largada-700">
        Nenhum calendário recebido. Abra o calendário da Ticket Sports ou da Yescom e clique no favorito “Enviar calendário ao Largadia”. Veja como
        instalar em{" "}
        <Link href="/admin/corridas/importar" className="underline">
          Importar em lote
        </Link>
        .
      </p>
    );
  }

  if (result) {
    return (
      <div className="space-y-3">
        {result.error ? (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{result.error}</p>
        ) : (
          <p role="status" className="rounded-lg bg-pace-500/20 p-3 text-sm font-semibold">
            {result.created} prova(s) nova(s) publicada(s) e {result.updated} atualizada(s).
          </p>
        )}
        {result.skipped.length > 0 && (
          <ul className="space-y-1 text-sm text-asfalto-700">
            {result.skipped.map((s) => (
              <li key={s.name}>
                <strong>{s.name}</strong>: {s.message}
              </li>
            ))}
          </ul>
        )}
        <Link href="/admin/corridas" className="inline-block rounded-lg bg-asfalto-950 px-4 py-2 text-sm font-semibold text-white">
          Ver corridas
        </Link>
      </div>
    );
  }

  const toggle = (url: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });

  const fresh = rows.filter((r) => !r.known);
  const known = rows.filter((r) => r.known);
  const toSend = rows.filter((r) => (r.known ? updateKnown : selected.has(r.key)));

  return (
    <div className="space-y-4">
      <p className="text-sm text-asfalto-500">
        {fresh.length} prova(s) nova(s) recebida(s). Desmarque o que não é corrida. As provas novas entram publicadas.
      </p>
      {known.length > 0 && (
        <div className="space-y-2 rounded-2xl bg-asfalto-100/60 p-3 text-sm">
          <details>
            <summary className="cursor-pointer font-semibold">{known.length} já estavam no site e foram descartadas</summary>
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-asfalto-700">
              {known.map((r) => (
                <li key={r.key}>{r.card.name}</li>
              ))}
            </ul>
          </details>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={updateKnown} onChange={(e) => setUpdateKnown(e.target.checked)} className="size-4 accent-largada-500" />
            Atualizar também as já enviadas (data, situação das inscrições e imagem)
          </label>
        </div>
      )}
      {fresh.length === 0 && <p className="rounded-lg bg-white p-3 text-sm ring-1 ring-asfalto-100">Nenhuma prova nova nesta página.</p>}
      <ul className="divide-y divide-asfalto-100 rounded-2xl bg-white ring-1 ring-asfalto-100">
        {fresh.map((r) => (
          <li key={r.key}>
            <label className="flex cursor-pointer items-center gap-3 p-3 text-sm">
              <input
                type="checkbox"
                checked={selected.has(r.key)}
                disabled={!!r.note}
                onChange={() => toggle(r.key)}
                className="size-4 accent-largada-500"
              />
              <span className="flex-1">
                <span className="block font-semibold">{r.card.name}</span>
                <span className="text-asfalto-500">{r.note ?? `${r.date} · ${r.place}`}</span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button
        type="button"
        disabled={pending || toSend.length === 0}
        onClick={() =>
          startTransition(async () => {
            setResult(await importCalendar({ cards: toSend.map((r) => r.card) }));
          })
        }
        className="rounded-lg bg-largada-500 px-4 py-2 font-semibold text-asfalto-950 disabled:opacity-50"
      >
        {pending ? "Publicando…" : `Publicar ${toSend.length} prova(s)`}
      </button>
    </div>
  );
}
