/** Verde-água oficial do Pix, usado só nos botões de pagamento Pix. */
export const PIX_GREEN = "#32bcad";

/** Símbolo do Pix (losango), para os botões de pagamento. Herda a cor do texto. */
export function PixIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        d="M12 2.6 21.4 12 12 21.4 2.6 12Z M7.2 12 12 16.8 16.8 12 12 7.2Z"
        fill="currentColor"
        fillRule="evenodd"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
