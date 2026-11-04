"use client";

import { useEffect, useState } from "react";

const INTERVAL_MS = 10_000;

/** Contagem de participantes que se atualiza sozinha enquanto a aba está visível. */
export function LiveEntryCount({ raffleId, initial }: { raffleId: string; initial: number }) {
  const [count, setCount] = useState(initial);

  useEffect(() => {
    let stopped = false;
    const refresh = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/sorteios/${raffleId}/participantes`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { count: number };
        if (!stopped) setCount(data.count);
      } catch {
        // Sem rede: tenta de novo no próximo ciclo
      }
    };
    const timer = setInterval(refresh, INTERVAL_MS);
    // Voltou para a aba: atualiza na hora, sem esperar o próximo ciclo
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [raffleId]);

  return (
    <p className="text-sm text-asfalto-500" aria-live="polite">
      <strong className="font-display text-lg text-asfalto-950 tabular-nums">{count.toLocaleString("pt-BR")}</strong>{" "}
      {count === 1 ? "participante" : "participantes"}
    </p>
  );
}
