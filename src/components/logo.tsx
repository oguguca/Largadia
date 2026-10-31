import Link from "next/link";

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2" aria-label="Largadia, página inicial">
      <span className="faixa-largada block h-6 w-3 -skew-x-12 rounded-sm" aria-hidden />
      <span
        className={`font-display text-2xl font-extrabold italic tracking-tight uppercase ${
          light ? "text-white" : "text-asfalto-950"
        }`}
      >
        Largadia
      </span>
    </Link>
  );
}
