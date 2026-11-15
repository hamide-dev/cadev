import { openLightbox } from '../../components/Lightbox';

type Photo = { src: string; alt: string };
const SHOWN = 4;

// Photos d'une publication en grille, comme sur X :
// 1 photo pleine largeur, 2 côte à côte, 3 : une grande à gauche et deux empilées à droite, 4 : 2 × 2.
// « +N » sur la 4e case quand il y en a plus. Un clic ouvre la galerie sur la bonne photo.
export function PhotoMosaic({ photos }: { photos: Photo[] }) {
  const shown = photos.slice(0, SHOWN);
  const hidden = photos.length - shown.length;

  return (
    <div className={`mosaic mosaic-${shown.length}`}>
      {shown.map((photo, index) => {
        const more = hidden > 0 && index === shown.length - 1;
        return (
          <button
            key={photo.src}
            type="button"
            className="mosaic-cell"
            aria-label={more ? `Voir les ${hidden + 1} dernières photos` : photos.length > 1 ? `Agrandir la photo ${index + 1} sur ${photos.length}` : 'Agrandir l’image'}
            onClick={() => openLightbox({ ...photo, gallery: photos, index })}
          >
            <img src={photo.src} alt="" loading="lazy" />
            {more && <span className="mosaic-more" aria-hidden="true">+{hidden}</span>}
          </button>
        );
      })}
    </div>
  );
}
