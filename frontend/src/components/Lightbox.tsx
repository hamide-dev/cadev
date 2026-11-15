import { useEffect, useRef, useState } from 'react';
import { restorePosition, savePosition } from '../lib/videoPositions';
import { Icon } from './Icon';

// Visionneuse plein écran : photo de profil, bannière, images et vidéos des publications.
// openLightbox() s'appelle de n'importe où ; un seul LightboxHost est monté dans l'app.
// Une vidéo (id fourni) reprend à sa position et la rend à la fermeture, via onClose.
// Une galerie (plusieurs photos) se parcourt aux flèches, au clavier ou en glissant le doigt.
type Photo = { src: string; alt?: string };
type Item = Photo & { video?: boolean; id?: string; onClose?: () => void; gallery?: Photo[]; index?: number };
const EVENT = 'hw:lightbox';
const SWIPE = 50;

export function openLightbox(item: Item) {
  window.dispatchEvent(new CustomEvent<Item>(EVENT, { detail: item }));
}

export function LightboxHost() {
  const [item, setItem] = useState<Item | null>(null);
  const [index, setIndex] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<Item>).detail;
      setItem(detail);
      setIndex(detail.index ?? 0);
    };
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

  const photos = item?.gallery ?? [];
  const count = photos.length;
  const go = (step: number) => count > 1 && setIndex((i) => (i + step + count) % count);

  const close = () => {
    if (item?.id) savePosition(item.id, videoRef.current);
    item?.onClose?.();
    setItem(null);
  };

  useEffect(() => {
    if (!item) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  });

  if (!item) return null;
  const photo = count > 0 ? photos[index]! : item;
  return (
    <div
      className="lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={item.video ? 'Vidéo' : count > 1 ? `Photo ${index + 1} sur ${count}` : photo.alt || 'Image'}
      onClick={close}
      onTouchStart={(e) => (touchX.current = e.touches[0]!.clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0]!.clientX - (touchX.current ?? e.changedTouches[0]!.clientX);
        if (Math.abs(dx) > SWIPE) go(dx < 0 ? 1 : -1);
        touchX.current = null;
      }}
    >
      <button type="button" className="icon-btn lightbox-close" aria-label="Fermer" onClick={close}>
        <Icon name="x" />
      </button>
      {item.video ? (
        <video
          ref={videoRef}
          src={item.src}
          controls
          controlsList="nofullscreen"
          autoPlay
          playsInline
          onLoadedMetadata={() => item.id && restorePosition(item.id, videoRef.current)}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <img key={photo.src} src={photo.src} alt={photo.alt ?? ''} onClick={(e) => e.stopPropagation()} />
      )}
      {count > 1 && (
        <>
          <button type="button" className="icon-btn lightbox-nav prev" aria-label="Photo précédente" onClick={(e) => { e.stopPropagation(); go(-1); }}>
            <Icon name="back" />
          </button>
          <button type="button" className="icon-btn lightbox-nav next" aria-label="Photo suivante" onClick={(e) => { e.stopPropagation(); go(1); }}>
            <Icon name="back" />
          </button>
          <p className="lightbox-count" aria-live="polite">{index + 1} / {count}</p>
        </>
      )}
    </div>
  );
}
