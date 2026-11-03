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
  const endRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const socket = getSocket();
    let alive = true;
    const onMessage = (message: Message) => {
      if (message.conversationId !== id) return;
      setMessages((list) => (list && !list.some((m) => m.id === message.id) ? [...list, message] : list));
    };
    const onTyping = ({ userId }: { userId: string }) => setTyping((list) => (list.includes(userId) ? list : [...list, userId]));
    const onStopped = ({ userId }: { userId: string }) => setTyping((list) => list.filter((u) => u !== userId));
    socket.on('message:created', onMessage);
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
      socket.off('typing:started', onTyping);
      socket.off('typing:stopped', onStopped);
      socket.emit('conversation:leave', { conversationId: id });
    };
  }, [id]);

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
      const message = await emit<Message>('message:send', { conversationId: id, type, content });
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
          const newDay = i === 0 || new Date(messages[i - 1]!.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
          return (
            <div key={m.id} className="stack-s" style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
              {newDay && <p className="center xs muted" style={{ alignSelf: 'stretch' }}>{dayLabel(m.createdAt)}</p>}
              <p className="row xs muted">
                {!mine && <Avatar user={m.sender} size="s" />}
                {mine ? 'Vous' : m.sender.displayName} · {TIME.format(new Date(m.createdAt))}
              </p>
              <div className={`bubble ${mine ? 'mine' : ''}`}>
                {m.type === 'CODE' ? (
                  <pre>{m.content}</pre>
                ) : m.type === 'LINK' ? (
                  <a href={/^https?:\/\//.test(m.content) ? m.content : `https://${m.content}`} target="_blank" rel="noreferrer" className="link-accent">
                    {m.content}
                  </a>
                ) : (
                  m.content
                )}
              </div>
            </div>
          );
        })}
        {typingNames.length > 0 && <p className="xs muted">{typingNames.join(', ')} écrit…</p>}
        <div ref={endRef} />
      </div>
      <form className="composer" onSubmit={send} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
        {error && <p className="error-text">{error}</p>}
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
