import { useId } from 'react';

// Logo officiel (maquette « Splash ») : le capuchon noir touche les bords, aucun cadre blanc autour.
// Seuls les coins sont arrondis. Les yeux sont tracés, pas écrits, pour un rendu identique partout.
export function LogoMark({ size = 40 }: { size?: number }) {
  const clip = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" style={{ flexShrink: 0 }}>
      <clipPath id={clip}>
        <rect width="64" height="64" rx="14" />
      </clipPath>
      <g clipPath={`url(#${CSS.escape(clip)})`}>
        <rect width="64" height="64" fill="#fff" />
        <path d="M0 25 32 38.5 64 25V64H0z" fill="#000" />
        <path d="M16.5 43 24.5 48.5 16.5 54M47.5 43 39.5 48.5 47.5 54" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
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
