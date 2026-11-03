const STAR = "M12 2.5l2.9 6 6.6.8-4.9 4.6 1.3 6.5L12 17.2l-5.9 3.2 1.3-6.5L2.5 9.3l6.6-.8z";

/** Nota de 0 a 5 em estrelas, com preenchimento parcial (4,3 preenche 4 estrelas e um terço). */
export function Stars({ value, className = "h-4 w-4" }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, (value / 5) * 100));
  const row = (fill: string) => (
    <span className="flex">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24" className={`${className} shrink-0 ${fill}`} aria-hidden>
          <path d={STAR} />
        </svg>
      ))}
    </span>
  );
  return (
    <span className="relative inline-flex" role="img" aria-label={`Nota ${value.toLocaleString("pt-BR")} de 5`}>
      {row("fill-asfalto-300")}
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        {row("fill-largada-500")}
      </span>
    </span>
  );
}

export { STAR };
