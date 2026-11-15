import { useEffect, useState } from 'react';
import { Icon } from './Icon';

// Visionneuse plein écran : photo de profil, bannière, images des publications.
// openLightbox() s'appelle de n'importe où ; un seul LightboxHost est monté dans l'app.
type Item = { src: string; alt?: string; video?: boolean };
const EVENT = 'hw:lightbox';

export function openLightbox(item: Item) {
  window.dispatchEvent(new CustomEvent<Item>(EVENT, { detail: item }));
}

export function LightboxHost() {
  const [item, setItem] = useState<Item | null>(null);

  useEffect(() => {
    const onOpen = (event: Event) => setItem((event as CustomEvent<Item>).detail);
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

  useEffect(() => {
    if (!item) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setItem(null);
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [item]);

  if (!item) return null;
  return (
    <div className="lightbox" role="dialog" aria-modal="true" aria-label={item.alt || 'Image'} onClick={() => setItem(null)}>
      <button type="button" className="icon-btn lightbox-close" aria-label="Fermer" onClick={() => setItem(null)}>
        <Icon name="x" />
      </button>
      {item.video ? (
        <video src={item.src} controls autoPlay playsInline onClick={(e) => e.stopPropagation()} />
      ) : (
        <img src={item.src} alt={item.alt ?? ''} onClick={(e) => e.stopPropagation()} />
      )}
    </div>
  );
}
