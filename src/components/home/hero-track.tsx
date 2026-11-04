const LANES = 6;
const LANE_WIDTH = 26;

/** Curva de pista de atletismo com a linha de largada, saindo pela direita do topo da página. Só decoração. */
export function HeroTrack({ className = "" }: { className?: string }) {
  // Pista em formato de estádio: retângulo com as pontas arredondadas, uma raia dentro da outra
  const outer = { x: 0, y: 0, w: 1000, h: 640 };
  const lanes = Array.from({ length: LANES + 1 }, (_, i) => {
    const inset = i * LANE_WIDTH;
    const h = outer.h - inset * 2;
    return { x: outer.x + inset, y: outer.y + inset, w: outer.w - inset * 2, h, r: h / 2 };
  });
  const inner = lanes[LANES];
  // Linha de largada na reta de baixo, atravessando todas as raias
  const startX = 420;
  return (
    <svg viewBox="-10 -10 1020 660" className={className} aria-hidden focusable="false">
      {/* Piso da pista */}
      <path
        fillRule="evenodd"
        className="fill-largada-500/15"
        d={`${stadium(lanes[0])} ${stadium(inner)}`}
      />
      {lanes.map((l, i) => (
        <rect
          key={i}
          x={l.x}
          y={l.y}
          width={l.w}
          height={l.h}
          rx={l.r}
          fill="none"
          className={i === 0 ? "stroke-largada-500" : "stroke-white/25"}
          strokeWidth={i === 0 ? 4 : 2}
        />
      ))}
      <line
        x1={startX}
        x2={startX}
        y1={outer.y + outer.h}
        y2={inner.y + inner.h}
        className="stroke-white"
        strokeWidth={6}
      />
      {/* Marcas de largada escalonadas, uma por raia */}
      {Array.from({ length: LANES }, (_, i) => {
        const y = outer.y + outer.h - i * LANE_WIDTH - LANE_WIDTH / 2;
        return <circle key={i} cx={startX - 26 - i * 14} cy={y} r={4} className="fill-pace-500" />;
      })}
    </svg>
  );
}

/** Caminho fechado de um estádio (para recortar o piso entre a raia de fora e a de dentro). */
function stadium({ x, y, w, h, r }: { x: number; y: number; w: number; h: number; r: number }) {
  return `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}
