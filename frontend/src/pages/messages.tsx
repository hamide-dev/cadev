import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useMe } from '../auth';
import { emit, getSocket, type Conversation, type Message } from '../socket';
import { Avatar, Empty, ErrorState, errorMessage, Icon, Loading, Sheet, TopBar, useLoad } from '../ui';

function title(conversation: Conversation, meId: string): string {
  if (conversation.name) return conversation.name;
  const others = conversation.members.filter((m) => m.id !== meId);
  return others.map((m) => m.displayName).join(', ') || 'Conversation';
}

function subtitle(conversation: Conversation, meId: string): string {
  if (conversation.type === 'DIRECT') return 'Message direct';
  const others = conversation.members.filter((m) => m.id !== meId);
  return `${others.map((m) => m.displayName.split(' ')[0]).join(', ')} · ${conversation.members.length} membres`;
}

export function Messages() {
  const me = useMe();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const { data, error, loading, reload } = useLoad(() => emit<Conversation[]>('conversation:list'), []);

  const q = query.trim().toLowerCase();
  const shown = (data ?? []).filter((c) => !q || title(c, me.id).toLowerCase().includes(q));

  const newConversation = (
    <div className="card stack-s" style={{ margin: 16 }}>
      <Icon name="chat" />
      <p className="strong">Une idée à construire ensemble ?</p>
      <p className="small muted">Échangez en direct ou réunissez votre équipe autour d’un projet.</p>
      <button type="button" className="btn btn-block" onClick={() => setCreating(true)}>
        <Icon name="plus" size={18} /> Nouvelle conversation
      </button>
    </div>
  );

  return (
    <main className="screen with-nav">
      <TopBar
        avatar
        title="Messages"
        right={
          <button type="button" className="icon-btn" aria-label="Nouvelle conversation" onClick={() => setCreating(true)}>
            <Icon name="compose" />
          </button>
        }
      />
      <div className="pad" style={{ paddingBottom: 12 }}>
        <label className="input-wrap">
          <span className="sr-only">Rechercher une conversation</span>
          <span style={{ position: 'absolute', left: 14, color: 'var(--text-3)' }}>
            <Icon name="search" size={22} />
          </span>
          <input className="input" type="search" style={{ paddingLeft: 46 }} placeholder="Rechercher une conversation" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
      </div>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <Loading />
      ) : (data ?? []).length === 0 ? (
        <>
          <Empty icon="mail" title="Aucune conversation">
            Écris à un développeur depuis son profil, ou crée un groupe pour ton équipe.
          </Empty>
          {newConversation}
        </>
      ) : (
        <>
          <h2 className="section-title pad" style={{ padding: '8px 16px' }}>Vos échanges</h2>
          <div className="list">
            {shown.map((c) => (
              <Link key={c.id} to={`/messages/${c.id}`} className="list-item" style={{ minHeight: 80 }}>
                {c.type === 'GROUP' ? (
                  <span className="avatar" style={{ borderRadius: 10, background: 'var(--accent-bg)', color: 'var(--accent)' }} aria-hidden="true">
                    <Icon name="branch" size={22} />
                  </span>
                ) : (
                  <Avatar user={{ ...(c.members.find((m) => m.id !== me.id) ?? c.members[0]!), avatarUrl: null }} link={false} />
                )}
                <div className="grow">
                  <p className="strong">{title(c, me.id)}</p>
                  <p className="xs muted">{subtitle(c, me.id)}</p>
                </div>
                <Icon name="chevron" size={20} />
              </Link>
            ))}
            {shown.length === 0 && <p className="center small muted" style={{ padding: 24 }}>Aucune conversation ne correspond à « {query} ».</p>}
          </div>
          {newConversation}
        </>
      )}
      {creating && <NewConversation onClose={() => setCreating(false)} onCreated={(c) => navigate(`/messages/${c.id}`)} />}
    </main>
  );
}

function NewConversation({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Conversation) => void }) {
  const [handles, setHandles] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const list = [...new Set(handles.split(/[\s,]+/).map((h) => h.replace(/^@/, '').trim()).filter(Boolean))];

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!list.length) return setError('Ajoute au moins un pseudo.');
    setBusy(true);
    setError(null);
    try {
      const users = await Promise.all(list.map((h) => api.user(h).catch(() => Promise.reject(new Error(`@${h} n’existe pas.`)))));
      const group = users.length > 1;
      onCreated(
        await emit<Conversation>('conversation:create', {
          type: group ? 'GROUP' : 'DIRECT',
          memberIds: users.map((u) => u.id),
          ...(group && name.trim() ? { name: name.trim() } : {}),
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <Sheet title="Nouvelle conversation" onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <div className="field">
          <label htmlFor="nc-handles">Avec qui ?</label>
          <input id="nc-handles" className="input mono" placeholder="@mariam_c, @idriss_dev" value={handles} onChange={(e) => setHandles(e.target.value)} />
          <p className="hint">Un pseudo pour un message direct, plusieurs pour un groupe (30 personnes maximum).</p>
        </div>
        {list.length > 1 && (
          <div className="field">
            <label htmlFor="nc-name">Nom du groupe · facultatif</label>
            <input id="nc-name" className="input" maxLength={100} placeholder="Équipe devlink" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        {error && <p className="alert" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <span className="spinner" aria-label="Création" /> : 'Démarrer la conversation'}
        </button>
      </form>
    </Sheet>
  );
}

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

  if (error && !messages) return <main className="screen"><TopBar back="/messages" title="Conversation" /><ErrorState message={error} /></main>;
  if (!conversation || !messages) return <main className="screen"><TopBar back="/messages" title="Conversation" /><Loading /></main>;
  const typingNames = conversation.members.filter((m) => typing.includes(m.id) && m.id !== me.id).map((m) => m.displayName.split(' ')[0]);

  return (
    <main className="screen">
      <TopBar back="/messages" title={title(conversation, me.id)} sub={subtitle(conversation, me.id)} />
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
