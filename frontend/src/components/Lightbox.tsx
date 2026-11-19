import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { restorePosition, savePosition } from '../lib/videoPositions';
import { Icon } from './Icon';

// Visionneuse plein écran, comme sur X : photo de profil, bannière, photos et vidéos des publications.
// openLightbox() s'appelle de n'importe où ; un seul LightboxHost est monté dans l'app.
// - Ouverture : le média grandit depuis sa miniature (origin) ; fermeture : il y retourne.
// - Galerie : on balaie au doigt (le média suit), flèches et clavier sur ordinateur.
// - On glisse vers le haut ou le bas pour fermer, le fond s'éclaircit avec la distance.
// - Toucher : affiche ou masque les commandes ; double toucher : zoom sur la photo.
// - Vidéo : reprend à sa position et la rend à la fermeture (onClose), commandes de l'app.
type Photo = { src: string; alt?: string };
type Item = Photo & {
  video?: boolean;
  id?: string;
  onClose?: () => void;
  gallery?: Photo[];
  index?: number;
  /** Élément d'où part (et où revient) le média n° index. */
  origin?: (index: number) => HTMLElement | null | undefined;
};
const EVENT = 'hw:lightbox';
const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)';
const OPEN_MS = 380;
const CLOSE_MS = 300;
const ZOOM = 2.5;

export function openLightbox(item: Item) {
  window.dispatchEvent(new CustomEvent<Item>(EVENT, { detail: item }));
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Transformation qui pose le média (à son emplacement final) sur la miniature, recadré comme elle.
function onThumb(media: HTMLElement, thumb: DOMRect) {
  const r = media.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  const s = Math.max(thumb.width / r.width, thumb.height / r.height);
  const dx = thumb.left + thumb.width / 2 - (r.left + r.width / 2);
  const dy = thumb.top + thumb.height / 2 - (r.top + r.height / 2);
  const ix = Math.max(0, (r.width - thumb.width / s) / 2);
  const iy = Math.max(0, (r.height - thumb.height / s) / 2);
  return { transform: `translate(${dx}px, ${dy}px) scale(${s})`, clipPath: `inset(${iy}px ${ix}px round ${16 / s}px)` };
}

const visible = (rect: DOMRect) => rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0;

export function LightboxHost() {
  const [item, setItem] = useState<Item | null>(null);
  const [index, setIndex] = useState(0);
  const [chrome, setChrome] = useState(true);
  const [closing, setClosing] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const mediaRefs = useRef<(HTMLElement | null)[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hidden = useRef<HTMLElement | null>(null);
  const opened = useRef(false);
  const zoom = useRef({ s: 1, x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; t: number; lx: number; ly: number; lt: number; axis: 'x' | 'y' | 'pan' | null; id: number } | null>(null);
  const lastTap = useRef({ t: 0, x: 0, y: 0 });

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<Item>).detail;
      opened.current = false;
      zoom.current = { s: 1, x: 0, y: 0 };
      setClosing(false);
      setChrome(true);
      setIndex(detail.index ?? 0);
      setItem(detail);
    };
    window.addEventListener(EVENT, onOpen);
    return () => window.removeEventListener(EVENT, onOpen);
  }, []);

  const hideChrome = useRef(() => setChrome(false)).current;
  const slides: Photo[] = item ? (item.gallery?.length ? item.gallery : [item]) : [];
  const count = slides.length;
  const media = () => mediaRefs.current[index] ?? null;

  const showThumb = () => {
    if (hidden.current) hidden.current.style.visibility = '';
    hidden.current = null;
  };
  const hideThumb = (i: number) => {
    showThumb();
    const el = item?.origin?.(i);
    if (el) {
      el.style.visibility = 'hidden';
      hidden.current = el;
    }
  };

  const moveTrack = (i: number, animate: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animate ? `transform 340ms ${EASE}` : 'none';
    track.style.transform = `translateX(${-i * 100}%)`;
  };

  const applyZoom = (animate: boolean) => {
    const el = media();
    if (!el) return;
    const { s, x, y } = zoom.current;
    el.style.transition = animate ? `transform 300ms ${EASE}` : 'none';
    el.style.transform = s === 1 ? '' : `translate(${x}px, ${y}px) scale(${s})`;
  };

  // Ouverture : le média part de la miniature. Il faut ses dimensions, donc l'image (ou la vidéo) chargée.
  const animateIn = () => {
    const el = media();
    const backdrop = backdropRef.current;
    if (!el || !backdrop || opened.current) return;
    opened.current = true;
    hideThumb(index);
    const thumb = item?.origin?.(index)?.getBoundingClientRect();
    const from = thumb && visible(thumb) && !reducedMotion() ? onThumb(el, thumb) : null;
    if (!from) {
      el.animate([{ opacity: 0, transform: 'scale(0.94)' }, { opacity: 1, transform: 'none' }], { duration: 260, easing: EASE });
      backdrop.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
      return;
    }
    el.style.transition = 'none';
    el.style.transform = from.transform;
    el.style.clipPath = from.clipPath;
    backdrop.style.transition = 'none';
    backdrop.style.opacity = '0';
    void el.offsetWidth;
    el.style.transition = `transform ${OPEN_MS}ms ${EASE}, clip-path ${OPEN_MS}ms ${EASE}`;
    el.style.transform = '';
    el.style.clipPath = 'inset(0px 0px round 0px)';
    backdrop.style.transition = `opacity ${OPEN_MS}ms ease-out`;
    backdrop.style.opacity = '1';
  };

  useLayoutEffect(() => {
    if (!item) return;
    moveTrack(index, false);
    const el = media();
    const ready = el instanceof HTMLImageElement ? el.complete && el.naturalWidth > 0 : el instanceof HTMLVideoElement && el.readyState >= 1;
    if (ready) animateIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item]);

  const finish = () => {
    showThumb();
    const onClose = item?.onClose;
    setItem(null);
    setClosing(false);
    onClose?.();
  };

  // Fermeture : retour vers la miniature si elle est à l'écran, sinon le média file dans le sens du geste.
  const close = (dy = 0) => {
    if (!item || closing) return;
    if (item.id) savePosition(item.id, videoRef.current);
    setClosing(true);
    setChrome(false);
    const el = media();
    const backdrop = backdropRef.current;
    if (!el || !backdrop || reducedMotion()) return finish();
    hideThumb(index);
    const thumb = item.origin?.(index)?.getBoundingClientRect();
    // On mesure le média à sa place de repos (sans le geste en cours) pour calculer le retour.
    const current = el.style.transform;
    el.style.transition = 'none';
    el.style.transform = '';
    const to = thumb && visible(thumb) ? onThumb(el, thumb) : null;
    el.style.transform = current;
    void el.offsetWidth;
    el.style.transition = `transform ${CLOSE_MS}ms ${EASE}, clip-path ${CLOSE_MS}ms ${EASE}, opacity ${CLOSE_MS}ms ease-out`;
    if (to) {
      el.style.transform = to.transform;
      el.style.clipPath = to.clipPath;
    } else {
      el.style.transform = `translateY(${(dy < 0 ? -1 : 1) * window.innerHeight * 0.6}px)`;
      el.style.opacity = '0';
    }
    backdrop.style.transition = `opacity ${CLOSE_MS}ms ease-out`;
    backdrop.style.opacity = '0';
    window.setTimeout(finish, CLOSE_MS);
  };

  const go = (step: number) => {
    const next = Math.min(count - 1, Math.max(0, index + step));
    if (next === index) return moveTrack(index, true);
    zoom.current = { s: 1, x: 0, y: 0 };
    applyZoom(false);
    setIndex(next);
    moveTrack(next, true);
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

  // Gestes : on décide de l'axe au premier mouvement net, puis le média suit le doigt.
  const onPointerDown = (e: React.PointerEvent) => {
    if (closing || (e.target as HTMLElement).closest('button, input, .viewer-controls')) return;
    const now = performance.now();
    drag.current = { x: e.clientX, y: e.clientY, t: now, lx: e.clientX, ly: e.clientY, lt: now, axis: zoom.current.s > 1 ? 'pan' : null, id: e.pointerId };
    rootRef.current?.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.axis) {
      if (Math.hypot(dx, dy) < 8) return;
      d.axis = Math.abs(dx) > Math.abs(dy) && count > 1 ? 'x' : 'y';
      setChrome(false);
    }
    const el = media();
    if (d.axis === 'pan') {
      zoom.current.x += e.clientX - d.lx;
      zoom.current.y += e.clientY - d.ly;
      applyZoom(false);
    } else if (d.axis === 'x') {
      const atEdge = (index === 0 && dx > 0) || (index === count - 1 && dx < 0);
      const track = trackRef.current!;
      track.style.transition = 'none';
      track.style.transform = `translateX(calc(${-index * 100}% + ${atEdge ? dx * 0.3 : dx}px))`;
    } else if (el && backdropRef.current) {
      const p = Math.min(Math.abs(dy) / 400, 1);
      el.style.transition = 'none';
      el.style.transform = `translate(${dx * 0.4}px, ${dy}px) scale(${1 - p * 0.18})`;
      backdropRef.current.style.transition = 'none';
      backdropRef.current.style.opacity = String(1 - p * 0.85);
    }
    d.lx = e.clientX;
    d.ly = e.clientY;
    d.lt = performance.now();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    const dt = Math.max(1, performance.now() - d.t);
    const recent = Math.max(1, performance.now() - d.lt) < 80;
    const vx = recent ? dx / dt : 0;
    const vy = recent ? dy / dt : 0;

    if (d.axis === 'x') {
      const width = rootRef.current?.clientWidth ?? window.innerWidth;
      if (dx < -width * 0.18 || vx < -0.45) go(1);
      else if (dx > width * 0.18 || vx > 0.45) go(-1);
      else moveTrack(index, true);
      return;
    }
    if (d.axis === 'y') {
      if (Math.abs(dy) > 120 || Math.abs(vy) > 0.6) return close(dy);
      const el = media();
      if (el) {
        el.style.transition = `transform 420ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
        el.style.transform = '';
      }
      if (backdropRef.current) {
        backdropRef.current.style.transition = 'opacity 300ms ease-out';
        backdropRef.current.style.opacity = '1';
      }
      setChrome(true);
      return;
    }
    if (d.axis === 'pan' && Math.hypot(dx, dy) > 8) return;

    // Toucher simple : commandes. Double toucher sur une photo : zoom. Clic à côté sur ordinateur : fermeture.
    const onMedia = (e.target as HTMLElement).closest('.viewer-media');
    const now = performance.now();
    const double = now - lastTap.current.t < 300 && Math.hypot(e.clientX - lastTap.current.x, e.clientY - lastTap.current.y) < 30;
    lastTap.current = { t: double ? 0 : now, x: e.clientX, y: e.clientY };
    if (double && onMedia && !item?.video) {
      const el = media()!;
      if (zoom.current.s > 1) zoom.current = { s: 1, x: 0, y: 0 };
      else {
        const r = el.getBoundingClientRect();
        zoom.current = { s: ZOOM, x: (r.left + r.width / 2 - e.clientX) * (ZOOM - 1), y: (r.top + r.height / 2 - e.clientY) * (ZOOM - 1) };
      }
      applyZoom(true);
      return;
    }
    if (!onMedia && e.pointerType === 'mouse') return close();
    if (!double) setChrome((c) => !c);
  };

  if (!item) return null;
  const label = item.video ? 'Vidéo' : count > 1 ? `Photo ${index + 1} sur ${count}` : slides[0]?.alt || 'Image';
  return (
    <div
      ref={rootRef}
      className={`viewer${chrome ? '' : ' chrome-off'}`}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div ref={backdropRef} className="viewer-backdrop" />
      <div ref={trackRef} className="viewer-track">
        {slides.map((photo, i) => (
          <div key={photo.src + i} className="viewer-slide" aria-hidden={i !== index}>
            {item.video ? (
              <ViewerVideo
                ref={(el) => {
                  mediaRefs.current[i] = el;
                  videoRef.current = el;
                }}
                src={photo.src}
                id={item.id}
                chrome={chrome}
                onReady={animateIn}
                onActivity={() => setChrome(true)}
                onIdle={hideChrome}
              />
            ) : Math.abs(i - index) <= 1 ? (
              <img
                ref={(el) => {
                  mediaRefs.current[i] = el;
                }}
                className="viewer-media"
                src={photo.src}
                alt={photo.alt ?? ''}
                draggable={false}
                onLoad={i === index ? animateIn : undefined}
              />
            ) : null}
          </div>
        ))}
      </div>

      <button type="button" className="icon-btn viewer-close" aria-label="Fermer" onClick={() => close()}>
        <Icon name="x" />
      </button>
      {count > 1 && (
        <>
          <button type="button" className="icon-btn viewer-nav prev" aria-label="Photo précédente" disabled={index === 0} onClick={() => go(-1)}>
            <Icon name="back" />
          </button>
          <button type="button" className="icon-btn viewer-nav next" aria-label="Photo suivante" disabled={index === count - 1} onClick={() => go(1)}>
            <Icon name="back" />
          </button>
          <div className="viewer-dots" aria-live="polite" aria-label={`${index + 1} sur ${count}`}>
            {slides.map((photo, i) => (
              <span key={photo.src + i} className={i === index ? 'on' : ''} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const time = (s: number) => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

// Lecteur de la visionneuse : sans les commandes du navigateur, avec celles de l'app,
// qui se masquent seules pendant la lecture.
function ViewerVideo({ ref, src, id, chrome, onReady, onActivity, onIdle }: {
  ref: (el: HTMLVideoElement | null) => void;
  src: string;
  id?: string;
  chrome: boolean;
  onReady: () => void;
  onActivity: () => void;
  onIdle: () => void;
}) {
  const video = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!chrome || !playing) return;
    const timer = window.setTimeout(onIdle, 2500);
    return () => window.clearTimeout(timer);
  }, [chrome, playing, onIdle]);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused || v.ended) void v.play().catch(() => {});
    else v.pause();
    onActivity();
  };

  return (
    <>
      <video
        ref={(el) => {
          video.current = el;
          ref(el);
        }}
        className="viewer-media"
        src={src}
        autoPlay
        playsInline
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration);
          if (id) restorePosition(id, v);
          onReady();
        }}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
      />
      {!playing && (
        <button type="button" className="viewer-play" aria-label="Lire" onClick={toggle}>
          <Icon name="play" size={30} />
        </button>
      )}
      <div className="viewer-controls">
        <button type="button" className="icon-btn" aria-label={playing ? 'Pause' : 'Lire'} onClick={toggle}>
          <Icon name={playing ? 'pause' : 'play'} size={20} />
        </button>
        <span className="viewer-time">{time(current)} / {time(duration)}</span>
        <input
          type="range"
          className="viewer-seek"
          aria-label="Position dans la vidéo"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          style={{ '--p': `${duration ? (current / duration) * 100 : 0}%` } as React.CSSProperties}
          onChange={(e) => {
            if (video.current) video.current.currentTime = Number(e.target.value);
            setCurrent(Number(e.target.value));
            onActivity();
          }}
        />
        <button
          type="button"
          className="icon-btn"
          aria-label={muted ? 'Activer le son' : 'Couper le son'}
          onClick={() => {
            if (video.current) video.current.muted = !video.current.muted;
            onActivity();
          }}
        >
          <Icon name={muted ? 'muted' : 'volume'} size={20} />
        </button>
      </div>
    </>
  );
}
