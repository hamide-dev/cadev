import { useId } from 'react';

// Un identifiant de dégradé propre à chaque logo : avec un id partagé, un logo
// placé dans un élément masqué (navigation mobile) effacerait le dégradé des autres.
export function LogoMark({ size = 40 }: { size?: number }) {
  const gradient = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#d9d9d9" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#${CSS.escape(gradient)})`} />
      <path d="M4 26 32 38 60 26V52a10 10 0 0 1-10 10H14A10 10 0 0 1 4 52z" fill="#000" />
      <text x="32" y="55" textAnchor="middle" fill="#fff" fontFamily="Geist Mono, monospace" fontWeight="700" fontSize="15">&gt; &lt;</text>
    </svg>
  );
}

export function Brand() {
  return (
    <span className="brand">
      <LogoMark size={40} />
      Hello World
    </span>
  );
}
