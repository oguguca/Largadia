import Link from "next/link";
import { Logo } from "./logo";
import { slogan } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="bg-asfalto-950 text-asfalto-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-3">
        <div className="space-y-2">
          <Logo light />
          <p className="text-sm">{slogan}</p>
        </div>
        <nav className="grid grid-cols-2 gap-2 text-sm" aria-label="Rodapé">
          <Link href="/busca" className="hover:text-white">Corridas</Link>
          <Link href="/assinatura" className="hover:text-white">Premium</Link>
          <Link href="/termos" className="hover:text-white">Termos de uso</Link>
          <Link href="/privacidade" className="hover:text-white">Privacidade</Link>
        </nav>
        <p className="text-xs text-asfalto-300 md:text-right">
          As informações das provas são fornecidas pelos organizadores. Confira sempre o site oficial antes de se inscrever.
        </p>
      </div>
    </footer>
  );
}
