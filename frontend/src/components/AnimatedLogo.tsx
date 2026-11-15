import { useMemo } from 'react';

// Animation officielle du logo (fournie par Viso Studio, frontend/public/brand/logo-anim.webm).
// On l'affiche en WebP animé : transparence lue partout (iPhone compris) et pas bloquée par le mode économie d'énergie.
// « Réduire les animations » activé : on montre directement l'image finale.
export function AnimatedLogo({ size = 120, replay = false }: { size?: number; replay?: boolean }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Une adresse unique relance l'animation depuis le début à chaque affichage.
  const src = useMemo(() => (reduced ? '/brand/logo-final.png' : `/brand/logo-anim.webp${replay ? `?r=${Date.now()}` : ''}`), [reduced, replay]);
  return <img className="animated-logo" src={src} width={size} height={size} alt="" aria-hidden="true" decoding="async" />;
}
