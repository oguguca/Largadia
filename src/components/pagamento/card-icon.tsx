/** Ícone de cartão de crédito, para os botões de pagamento. Herda a cor do texto. */
export function CardIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19" strokeWidth="2.6" />
      <path d="M6 15h4" strokeLinecap="round" />
    </svg>
  );
}
