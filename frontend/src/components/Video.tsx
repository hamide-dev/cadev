import { useEffect, useRef } from 'react';
import { restorePosition, savePosition } from '../lib/videoPositions';
import { Icon } from './Icon';
import { openLightbox } from './Lightbox';

// Vidéo d'une publication. Le plein écran natif est remplacé par la visionneuse de l'app,
// qui reste en vertical : Chrome sur Android bascule sinon l'écran en paysage.
export function Video({ id, src }: { id: string; src: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  // En quittant l'écran (clic sur la publication), on note où on en était.
  useEffect(() => {
    const video = ref.current;
    return () => savePosition(id, video);
  }, [id]);

  const openFull = () => {
    savePosition(id, ref.current, true);
    ref.current?.pause();
    openLightbox({ src, video: true, id, onClose: () => restorePosition(id, ref.current) });
  };

  return (
    <div className="video">
      <video
        ref={ref}
        src={src}
        controls
        controlsList="nofullscreen"
        playsInline
        preload="metadata"
        onLoadedMetadata={() => restorePosition(id, ref.current)}
      />
      <button type="button" className="icon-btn video-full" aria-label="Voir la vidéo en plein écran" onClick={openFull}>
        <Icon name="expand" size={18} />
      </button>
    </div>
  );
}
