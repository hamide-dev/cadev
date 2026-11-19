import { useEffect, useRef, useState } from 'react';
import type { Post } from '../lib/api';
import { restorePosition, savePosition } from '../lib/videoPositions';
import { Icon } from './Icon';
import { openLightbox } from './Lightbox';

// Vidéo d'une publication, comme dans le fil de X : elle se lance en silence quand elle est
// bien visible et s'arrête en sortant de l'écran, en boucle, sans les commandes du navigateur.
// En bas à gauche : pause/lecture et temps restant ; son en bas à droite. Un toucher l'ouvre en plein écran, avec le son.
// Le choix du son vaut pour toutes les vidéos du fil, le temps de la session.
let soundOn = false;
const SOUND_EVENT = 'hw:video-sound';

const left = (v: HTMLVideoElement) => {
  const s = Math.max(0, (v.duration || 0) - v.currentTime);
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

export function Video({ id, src, post, onPostChange }: { id: string; src: string; post?: Post; onPostChange?: (post: Post) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(!soundOn);
  const [remaining, setRemaining] = useState('');
  const [paused, setPaused] = useState(true);

  // En quittant l'écran (clic sur la publication), on note où on en était.
  useEffect(() => {
    const video = ref.current;
    return () => savePosition(id, video);
  }, [id]);

  useEffect(() => {
    const onSound = () => setMuted(!soundOn);
    window.addEventListener(SOUND_EVENT, onSound);
    return () => window.removeEventListener(SOUND_EVENT, onSound);
  }, []);

  useEffect(() => {
    if (ref.current) ref.current.muted = muted;
  }, [muted]);

  // Lecture automatique quand plus de 60 % de la vidéo est à l'écran (sauf si l'utilisateur limite les animations).
  useEffect(() => {
    const video = ref.current;
    if (!video || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry!.isIntersecting && !document.querySelector('.viewer')) void video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.6 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const openFull = () => {
    savePosition(id, ref.current, true);
    ref.current?.pause();
    openLightbox({ src, video: true, id, post, onPostChange, origin: () => box.current, onClose: () => restorePosition(id, ref.current) });
  };

  return (
    <div
      ref={box}
      className="video"
      role="button"
      tabIndex={0}
      aria-label="Ouvrir la vidéo en plein écran"
      onClick={openFull}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openFull())}
    >
      <video
        ref={ref}
        src={src}
        muted
        loop
        playsInline
        preload="metadata"
        onLoadedMetadata={(e) => {
          setRemaining(left(e.currentTarget));
          restorePosition(id, ref.current);
        }}
        onTimeUpdate={(e) => setRemaining(left(e.currentTarget))}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      />
      {paused && (
        <span className="video-play" aria-hidden="true">
          <Icon name="play" size={26} />
        </span>
      )}
      <div className="video-info">
        <button
          type="button"
          className="video-toggle"
          aria-label={paused ? 'Lire la vidéo' : 'Mettre en pause'}
          onClick={(e) => {
            e.stopPropagation();
            const v = ref.current;
            if (!v) return;
            if (v.paused) void v.play().catch(() => {});
            else v.pause();
          }}
        >
          <Icon name={paused ? 'play' : 'pause'} size={14} />
        </button>
        {remaining && <span className="video-time">{remaining}</span>}
      </div>
      <button
        type="button"
        className="video-sound"
        aria-label={muted ? 'Activer le son' : 'Couper le son'}
        onClick={(e) => {
          e.stopPropagation();
          soundOn = muted;
          window.dispatchEvent(new Event(SOUND_EVENT));
          if (soundOn) void ref.current?.play().catch(() => {});
        }}
      >
        <Icon name={muted ? 'muted' : 'volume'} size={16} />
      </button>
    </div>
  );
}
