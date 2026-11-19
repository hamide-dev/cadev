import { useRef } from 'react';
import { openLightbox } from '../../components/Lightbox';

type Photo = { src: string; alt: string };
const GRID_MAX = 4;

// Photos d'une publication, comme sur X.
// Jusqu'à 4 : en grille (1 pleine largeur, 2 côte à côte, 3 : une grande et deux empilées, 4 : 2 × 2).
// Au-delà : une rangée qu'on fait défiler du doigt, photo par photo, la suivante dépasse sur le bord.
// Un toucher ouvre la visionneuse sur la bonne photo, qui grandit depuis sa miniature.
export function PhotoMosaic({ photos }: { photos: Photo[] }) {
  const cells = useRef<(HTMLElement | null)[]>([]);
  const carousel = photos.length > GRID_MAX;

  const open = (index: number) =>
    openLightbox({
      ...photos[index]!,
      gallery: photos,
      index,
      origin: (i) => {
        const cell = cells.current[i];
        if (!cell) return null;
        // Dans la rangée, on ramène la photo dans le champ avant qu'elle ne s'y range.
        if (carousel) cell.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        return cell;
      },
    });

  return (
    <div className={carousel ? 'carousel' : `mosaic mosaic-${photos.length}`}>
      {photos.map((photo, index) => (
        <button
          key={photo.src}
          ref={(el) => {
            cells.current[index] = el;
          }}
          type="button"
          className={carousel ? 'carousel-cell' : 'mosaic-cell'}
          aria-label={photos.length > 1 ? `Agrandir la photo ${index + 1} sur ${photos.length}` : 'Agrandir l’image'}
          onClick={() => open(index)}
        >
          <img src={photo.src} alt="" loading="lazy" draggable={false} />
        </button>
      ))}
    </div>
  );
}
