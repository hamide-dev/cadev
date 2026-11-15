import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { TopBar } from '../../components/TopBar';
import { Empty, ErrorState, Loading } from '../../components/states';
import { conversationSubtitle, conversationTitle } from './format';
import { errorMessage } from '../../lib/format';
import { useMe } from '../../lib/session';
import { type Conversation, emit, getSocket, type Message } from '../../lib/socket';
import { MessageBubble } from './MessageBubble';

const DAY = new Intl.DateTimeFormat('fr', { weekday: 'long', day: 'numeric', month: 'long' });
const TIME = new Intl.DateTimeFormat('fr', { hour: '2-digit', minute: '2-digit' });

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return `Aujourd’hui · ${date.toLocaleDateString('fr', { day: 'numeric', month: 'long' })}`;
  return DAY.format(date);
}

export function ConversationScreen() {
  const me = useMe();
  const { id = '' } = useParams();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [type, setType] = useState<'TEXT' | 'CODE' | 'LINK'>('TEXT');
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState<string[]>([]);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const socket = getSocket();
    let alive = true;
    const onMessage = (message: Message) => {
      if (message.conversationId !== id) return;
      setMessages((list) => (list && !list.some((m) => m.id === message.id) ? [...list, message] : list));
      if (message.sender.id !== me.id) {
        void emit('conversation:read', { conversationId: id }).catch((err) => setError(errorMessage(err)));
      }
    };
    const onTyping = ({ userId }: { userId: string }) => setTyping((list) => (list.includes(userId) ? list : [...list, userId]));
    const onStopped = ({ userId }: { userId: string }) => setTyping((list) => list.filter((u) => u !== userId));
    const onDeleted = ({ id: deletedId }: { id: string }) => setMessages((list) => list && list.filter((m) => m.id !== deletedId));
    socket.on('message:created', onMessage);
    socket.on('message:deleted', onDeleted);
    socket.on('typing:started', onTyping);
    socket.on('typing:stopped', onStopped);

    (async () => {
      try {
        const list = await emit<Conversation[]>('conversation:list');
        const found = list.find((c) => c.id === id);
        if (!found) throw new Error('Cette conversation n’existe pas ou tu n’en fais pas partie.');
        await emit('conversation:join', { conversationId: id });
        const history = await emit<Message[]>('message:history', { conversationId: id, limit: 50 });
        if (alive) {
          setConversation(found);
          setMessages(history);
        }
      } catch (err) {
        if (alive) setError(errorMessage(err));
      }
    })();

    return () => {
      alive = false;
      socket.off('message:created', onMessage);
      socket.off('message:deleted', onDeleted);
      socket.off('typing:started', onTyping);
      socket.off('typing:stopped', onStopped);
      socket.emit('conversation:leave', { conversationId: id });
    };
  }, [id, me.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages?.length]);

  const onType = (value: string) => {
    setText(value);
    const socket = getSocket();
    if (!typingTimer.current) socket.emit('typing:start', { conversationId: id });
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', { conversationId: id });
      typingTimer.current = null;
    }, 1500);
  };

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      const message = await emit<Message>('message:send', { conversationId: id, type, content, ...(replyTo ? { parentMessageId: replyTo.id } : {}) });
      setReplyTo(null);
      setMessages((list) => (list && !list.some((m) => m.id === message.id) ? [...list, message] : list));
      setText('');
      setType('TEXT');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  if (error && !messages) return <main className="screen conv-pane"><TopBar back="/messages" title="Conversation" /><ErrorState message={error} /></main>;
  if (!conversation || !messages) return <main className="screen conv-pane"><TopBar back="/messages" title="Conversation" /><Loading /></main>;
  const typingNames = conversation.members.filter((m) => typing.includes(m.id) && m.id !== me.id).map((m) => m.displayName.split(' ')[0]);

  return (
    <main className="screen conv-pane">
      <TopBar back="/messages" title={conversationTitle(conversation, me.id)} sub={conversationSubtitle(conversation, me.id)} />
      <div className="grow stack pad" style={{ paddingTop: 8, paddingBottom: 16 }} aria-live="polite">
        {messages.length === 0 && <Empty icon="chat" title="Démarrez l’échange">Le premier message donne le ton.</Empty>}
        {messages.map((m, i) => {
          const mine = m.sender.id === me.id;
          const prev = messages[i - 1];
          const newDay = i === 0 || new Date(prev!.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
          // Messages groupés comme sur WhatsApp : nom et heure seulement quand l'expéditeur change ou après 5 minutes.
          const grouped = !newDay && prev?.sender.id === m.sender.id && new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000;
          return (
            <div key={m.id} className="stack-s msg-block" style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
              {newDay && <p className="center xs muted" style={{ alignSelf: 'stretch' }}>{dayLabel(m.createdAt)}</p>}
              {!grouped && (
                <p className="row xs muted">
                  {!mine && <Avatar user={m.sender} size="s" />}
                  {mine ? 'Vous' : m.sender.displayName} · {TIME.format(new Date(m.createdAt))}
                </p>
              )}
              <MessageBubble
                message={m}
                mine={mine}
                parent={m.parentMessageId ? messages.find((x) => x.id === m.parentMessageId) ?? null : null}
                onReply={(target) => {
                  setReplyTo(target);
                  document.getElementById('message-input')?.focus();
                }}
                onDelete={async (target) => {
                  if (!confirm('Supprimer ce message pour tout le monde ?')) return;
                  const before = messages;
                  setMessages((list) => list && list.filter((x) => x.id !== target.id));
                  try {
                    await emit('message:delete', { messageId: target.id });
                  } catch (err) {
                    setMessages(before);
                    setError(errorMessage(err));
                  }
                }}
                onJump={(target) => {
                  const node = document.getElementById(`msg-${target}`);
                  node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  node?.classList.add('flash');
                  setTimeout(() => node?.classList.remove('flash'), 1200);
                }}
              />
            </div>
          );
        })}
        {typingNames.length > 0 && <p className="xs muted">{typingNames.join(', ')} écrit…</p>}
        <div ref={endRef} />
      </div>
      <form className="composer" onSubmit={send} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        {error && <p className="error-text">{error}</p>}
        {replyTo && (
          <div className="reply-bar">
            <span className="grow">
              <strong>Réponse à {replyTo.sender.id === me.id ? 'vous-même' : replyTo.sender.displayName}</strong>
              <span>{replyTo.type === 'CODE' ? 'Extrait de code' : replyTo.content}</span>
            </span>
            <button type="button" className="icon-btn" aria-label="Annuler la réponse" onClick={() => setReplyTo(null)}>
              <Icon name="x" size={18} />
            </button>
          </div>
        )}
        <div className="row" role="group" aria-label="Type de message">
          <button type="button" className="action" aria-pressed={type === 'CODE'} style={type === 'CODE' ? { color: 'var(--success)' } : undefined} onClick={() => setType(type === 'CODE' ? 'TEXT' : 'CODE')}>
            <Icon name="code" size={18} /> Code
          </button>
          <button type="button" className="action" aria-pressed={type === 'LINK'} style={type === 'LINK' ? { color: 'var(--accent)' } : undefined} onClick={() => setType(type === 'LINK' ? 'TEXT' : 'LINK')}>
            <Icon name="link" size={18} /> Lien
          </button>
        </div>
        <div className="row">
          <label className="grow">
            <span className="sr-only">Ton message</span>
            <textarea
              id="message-input"
              className={`textarea ${type === 'CODE' ? 'mono' : ''}`}
              rows={1}
              maxLength={10000}
              placeholder={type === 'CODE' ? 'Colle ton code…' : type === 'LINK' ? 'https://…' : 'Écrire un message…'}
              value={text}
              onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && type !== 'CODE') {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
            />
          </label>
          <button type="submit" className="icon-btn solid" style={{ borderRadius: 999 }} aria-label="Envoyer" disabled={sending || !text.trim()}>
            {sending ? <span className="spinner" /> : <Icon name="send" size={20} />}
          </button>
        </div>
      </form>
    </main>
  );
}
