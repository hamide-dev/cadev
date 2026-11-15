import { useEffect, useState } from 'react';
import { NavLink, Outlet, useMatch, useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { Empty, ErrorState, Loading } from '../../components/states';
import { TopBar } from '../../components/TopBar';
import { useMe } from '../../lib/session';
import { emit, getSocket, type Conversation } from '../../lib/socket';
import { timeAgo } from '../../lib/format';
import { useLoad } from '../../lib/useLoad';
import { conversationPreview, conversationTitle } from './format';
import { NewConversation } from './NewConversation';

// Mobile : la liste, puis la conversation en plein écran.
// Desktop (≥ 1024 px) : la liste et la conversation ouverte côte à côte.
export function MessagesLayout() {
  const openId = useMatch('/messages/:id')?.params.id;
  return (
    <div className={`messages ${openId ? 'has-open' : ''}`}>
      <ConversationList openId={openId} />
      <Outlet />
    </div>
  );
}

export function ConversationPlaceholder() {
  return (
    <section className="conv-pane conv-empty">
      <Empty icon="chat" title="Choisis une conversation">
        Ouvre un échange dans la liste, ou démarre-en un nouveau avec un développeur ou ton équipe.
      </Empty>
    </section>
  );
}

function ConversationList({ openId }: { openId?: string }) {
  const me = useMe();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  // Rechargée quand on ouvre une conversation, pour voir apparaître celles qu'on vient de créer.
  const { data, error, loading, reload } = useLoad(() => emit<Conversation[]>('conversation:list'), [openId]);

  // Un message arrive ou une conversation est lue : la liste se met à jour (aperçu, non-lus, ordre).
  useEffect(() => {
    const socket = getSocket();
    const events = ['message:unread', 'message:created', 'conversation:read'];
    events.forEach((event) => socket.on(event, reload));
    return () => events.forEach((event) => socket.off(event, reload));
  }, [reload]);

  const q = query.trim().toLowerCase();
  const shown = (data ?? []).filter((c) => !q || conversationTitle(c, me.id).toLowerCase().includes(q));

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
    <section className="screen conv-list" aria-label="Conversations">
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
      ) : loading && !data ? (
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
              <NavLink key={c.id} to={`/messages/${c.id}`} className="list-item conv-item" style={{ minHeight: 80 }}>
                {c.type === 'GROUP' ? (
                  <span className="avatar" style={{ borderRadius: 10, background: 'var(--accent-bg)', color: 'var(--accent)' }} aria-hidden="true">
                    <Icon name="branch" size={22} />
                  </span>
                ) : (
                  <Avatar user={{ ...(c.members.find((m) => m.id !== me.id) ?? c.members[0]!), avatarUrl: (c.members.find((m) => m.id !== me.id) ?? c.members[0]!).avatarUrl ?? null }} link={false} />
                )}
                <div className="grow conv-text">
                  <p className={c.unreadCount > 0 ? 'strong' : undefined}>{conversationTitle(c, me.id)}</p>
                  <p className={`xs conv-preview ${c.unreadCount > 0 ? 'unread' : 'muted'}`}>{conversationPreview(c, me.id)}</p>
                </div>
                <div className="conv-meta">
                  {c.lastMessage && <span className="xs muted">{timeAgo(c.lastMessage.createdAt)}</span>}
                  {c.unreadCount > 0 && (
                    <span className="unread-badge" aria-label={`${c.unreadCount} message${c.unreadCount > 1 ? 's' : ''} non lu${c.unreadCount > 1 ? 's' : ''}`}>
                      {c.unreadCount > 99 ? '99+' : c.unreadCount}
                    </span>
                  )}
                </div>
              </NavLink>
            ))}
            {shown.length === 0 && <p className="center small muted" style={{ padding: 24 }}>Aucune conversation ne correspond à « {query} ».</p>}
          </div>
          {newConversation}
        </>
      )}
      {creating && <NewConversation onClose={() => setCreating(false)} onCreated={(c) => { setCreating(false); navigate(`/messages/${c.id}`); }} />}
    </section>
  );
}
