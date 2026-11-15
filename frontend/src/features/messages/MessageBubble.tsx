import { useRef, useState } from 'react';
import { Icon } from '../../components/Icon';
import { firstUrl, Linkify } from '../posts/RichText';
import { LinkPreviewCard } from './LinkPreviewCard';
import { type Message } from '../../lib/socket';

// Une bulle de message.
// - Glisser vers la droite (doigt ou souris) : répondre, comme sur WhatsApp. La bulle suit le doigt
//   avec une résistance, une flèche apparaît, et au-delà du seuil la réponse s'ouvre au relâchement.
// - Appui long (mobile) ou bouton ⋯ au survol (ordinateur) : Répondre, Copier, Supprimer.
const THRESHOLD = 64;
const MAX_PULL = 96;

type Props = {
  message: Message;
  mine: boolean;
  parent: Message | null;
  onReply: (message: Message) => void;
  onDelete: (message: Message) => void;
  onJump: (id: string) => void;
};

export function MessageBubble({ message: m, mine, parent, onReply, onDelete, onJump }: Props) {
  const [pull, setPull] = useState(0);
  const [menu, setMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const start = useRef<{ x: number; y: number; id: number; axis: 'x' | 'y' | null } | null>(null);
  const press = useRef<ReturnType<typeof setTimeout> | null>(null);
  const armed = useRef(false);

  const clearPress = () => {
    if (press.current) clearTimeout(press.current);
    press.current = null;
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('a, button')) return;
    start.current = { x: event.clientX, y: event.clientY, id: event.pointerId, axis: null };
    if (event.pointerType !== 'mouse') press.current = setTimeout(() => setMenu(true), 450);
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = event.clientX - s.x;
    const dy = event.clientY - s.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) clearPress();
    if (!s.axis && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (s.axis === 'x') (event.currentTarget as HTMLElement).setPointerCapture(s.id);
    }
    if (s.axis !== 'x') return;
    const value = dx <= 0 ? 0 : dx < THRESHOLD ? dx : THRESHOLD + Math.min(MAX_PULL - THRESHOLD, (dx - THRESHOLD) * 0.3);
    if (value >= THRESHOLD && !armed.current) {
      armed.current = true;
      navigator.vibrate?.(8);
    } else if (value < THRESHOLD) armed.current = false;
    setPull(value);
  };
  const onPointerUp = () => {
    clearPress();
    if (start.current?.axis === 'x' && armed.current) onReply(m);
    start.current = null;
    armed.current = false;
    setPull(0);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(m.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Copie refusée par le navigateur : rien d'autre à faire.
    }
    setMenu(false);
  };

  const url = m.type === 'CODE' ? null : firstUrl(m.content);

  return (
    <div className={`msg-row ${mine ? 'mine' : ''}`} id={`msg-${m.id}`}>
      <span className="msg-reply-hint" style={{ opacity: Math.min(1, pull / THRESHOLD), transform: `scale(${pull >= THRESHOLD ? 1 : 0.7})` }} aria-hidden="true">
        <Icon name="back" size={18} />
      </span>
      <div
        className={`bubble ${mine ? 'mine' : ''} ${pull ? 'is-pulling' : ''}`}
        style={pull ? { transform: `translateX(${pull}px)` } : undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(event) => {
          event.preventDefault();
          setMenu(true);
        }}
      >
        {parent !== undefined && m.parentMessageId && (
          <button type="button" className="msg-quote" onClick={() => onJump(m.parentMessageId!)}>
            {parent ? (
              <>
                <strong>{parent.sender.displayName}</strong>
                <span>{parent.type === 'CODE' ? 'Extrait de code' : parent.content}</span>
              </>
            ) : (
              <span>Message supprimé</span>
            )}
          </button>
        )}
        {m.type === 'CODE' ? <pre>{m.content}</pre> : <Linkify text={m.content} />}
        {url && <LinkPreviewCard url={url} />}
      </div>
      <button type="button" className="icon-btn msg-more" aria-label="Actions du message" onClick={() => setMenu(!menu)}>
        <Icon name="more" size={18} />
      </button>
      {copied && <span className="msg-toast">Copié</span>}
      {menu && (
        <>
          <div className="menu-scrim" onClick={() => setMenu(false)} />
          <div className={`menu msg-menu ${mine ? 'mine' : ''}`} role="menu">
            <button type="button" role="menuitem" className="list-item" onClick={() => { onReply(m); setMenu(false); }}>
              <Icon name="back" size={18} /> Répondre
            </button>
            <button type="button" role="menuitem" className="list-item" onClick={copy}>
              <Icon name="clip" size={18} /> Copier
            </button>
            {mine && (
              <button type="button" role="menuitem" className="list-item" style={{ color: 'var(--danger)' }} onClick={() => { setMenu(false); onDelete(m); }}>
                <Icon name="x" size={18} /> Supprimer
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
