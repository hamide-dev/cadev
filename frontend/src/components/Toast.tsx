import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from './Avatar';
import { type Author } from '../lib/api';

// Bannière en haut de l'écran quand l'app est ouverte (comme une notification iOS).
// Elle descend, reste 4 s, se ferme d'un glissement vers le haut ; un toucher ouvre la conversation.
export type ToastData = { title: string; body: string; to: string; user?: Pick<Author, 'username' | 'displayName' | 'avatarUrl'> };
const EVENT = 'hw:toast';

export function showToast(toast: ToastData) {
  window.dispatchEvent(new CustomEvent<ToastData>(EVENT, { detail: toast }));
}

export function ToastHost() {
  const navigate = useNavigate();
  const [toast, setToast] = useState<(ToastData & { id: number }) | null>(null);
  const [leaving, setLeaving] = useState(false);
  const startY = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => {
      setToast(null);
      setLeaving(false);
    }, 220);
  };

  useEffect(() => {
    const onToast = (event: Event) => {
      if (timer.current) clearTimeout(timer.current);
      setLeaving(false);
      setToast({ ...(event as CustomEvent<ToastData>).detail, id: Date.now() });
      navigator.vibrate?.(12);
      timer.current = setTimeout(dismiss, 4000);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);

  if (!toast) return null;
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <button
        key={toast.id}
        type="button"
        className={`toast ${leaving ? 'is-leaving' : ''}`}
        onClick={() => {
          dismiss();
          navigate(toast.to);
        }}
        onPointerDown={(event) => (startY.current = event.clientY)}
        onPointerUp={(event) => {
          if (startY.current !== null && startY.current - event.clientY > 24) dismiss();
          startY.current = null;
        }}
      >
        {toast.user ? <Avatar user={toast.user} size="s" link={false} /> : <img src="/icon-192.png" alt="" width={32} height={32} style={{ borderRadius: 8 }} />}
        <span className="toast-text">
          <strong>{toast.title}</strong>
          <span>{toast.body}</span>
        </span>
      </button>
    </div>
  );
}
