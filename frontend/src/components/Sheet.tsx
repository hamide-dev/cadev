import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

// Fenêtre du bas façon iOS : elle monte avec un ressort, se ferme avec le bouton ×, la touche Échap,
// un toucher hors de la fenêtre, ou en la faisant glisser vers le bas par sa poignée.
// Le geste suit le doigt ; au relâchement, une distance ou une vitesse suffisante la ferme, sinon elle revient.
const CLOSE_DISTANCE = 120;
const CLOSE_VELOCITY = 0.6; // px/ms
const EXIT_MS = 220;

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; lastY: number; lastT: number; velocity: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);

  const close = useCallback(() => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, EXIT_MS);
  }, [closing, onClose]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    // Le focus va au premier champ à remplir ; sinon à la fenêtre elle-même (pas de contour sur un bouton à l'ouverture).
    const field = ref.current?.querySelector<HTMLElement>('.sheet-body input:not([type=hidden]), .sheet-body textarea, .sheet-body select');
    (field ?? ref.current)?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus({ preventScroll: true });
    };
  }, [close]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, lastY: event.clientY, lastT: event.timeStamp, velocity: 0 };
    setDragging(true);
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dt = Math.max(1, event.timeStamp - d.lastT);
    d.velocity = (event.clientY - d.lastY) / dt;
    d.lastY = event.clientY;
    d.lastT = event.timeStamp;
    const dy = event.clientY - d.startY;
    // Vers le haut, la fenêtre résiste (effet élastique) au lieu de se détacher.
    setOffset(dy > 0 ? dy : -Math.sqrt(-dy) * 2);
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    const dy = d.lastY - d.startY;
    if (dy > CLOSE_DISTANCE || d.velocity > CLOSE_VELOCITY) close();
    else setOffset(0);
  };

  return (
    <div className={`sheet-backdrop ${closing ? 'is-closing' : ''}`} onClick={close}>
      <div
        ref={ref}
        className={`sheet ${dragging ? 'is-dragging' : ''} ${closing ? 'is-closing' : ''}`}
        style={offset && !closing ? { transform: `translateY(${offset}px)` } : undefined}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sheet-grab" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
          <span className="sheet-handle" aria-hidden="true" />
          <div className="sheet-head">
            <h2>{title}</h2>
            <button type="button" className="icon-btn sheet-close" aria-label="Fermer" onPointerDown={(event) => event.stopPropagation()} onClick={close}>
              <Icon name="x" size={20} />
            </button>
          </div>
        </div>
        <div className="sheet-body stack">{children}</div>
      </div>
    </div>
  );
}
