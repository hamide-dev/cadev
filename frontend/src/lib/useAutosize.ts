import { useLayoutEffect, useRef } from 'react';

// Zone de texte qui prend la hauteur de ce qu'on écrit : une ligne au départ, elle grandit à chaque
// retour à la ligne, jusqu'au max-height du CSS (au-delà, elle défile). Elle se rétracte après l'envoi.
export function useAutosize(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => {
      el.style.height = 'auto';
      const border = el.offsetHeight - el.clientHeight;
      el.style.height = `${el.scrollHeight + border}px`;
    };
    fit();
    // La largeur change (rotation, clavier, fenêtre) : les lignes se recoupent, on remesure.
    let width = el.clientWidth;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return;
      width = el.clientWidth;
      fit();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return ref;
}
