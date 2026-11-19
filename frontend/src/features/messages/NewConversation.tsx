import { useEffect, useState, type FormEvent } from 'react';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { Sheet } from '../../components/Sheet';
import { api, type User } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { useMe } from '../../lib/session';
import { type Conversation, emit } from '../../lib/socket';

const MAX = 30;

// Nouvelle conversation : on cherche les personnes par nom ou pseudo et on les coche dans la liste.
// Une personne : message direct. Plusieurs : un groupe, qu'on peut nommer.
export function NewConversation({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Conversation) => void }) {
  const me = useMe();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<User[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Recherche au fil de la frappe (un court délai évite une requête par lettre). Sans texte : des suggestions.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const page = await api.users(query.trim().replace(/^@/, ''), 1, 20);
        if (!cancelled) setResults(page.items.filter((u) => u.id !== me?.id));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, query ? 250 : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, me?.id]);

  const isPicked = (user: User) => picked.some((p) => p.id === user.id);
  const toggle = (user: User) => {
    setError(null);
    if (isPicked(user)) return setPicked((list) => list.filter((p) => p.id !== user.id));
    if (picked.length >= MAX) return setError(`${MAX} personnes maximum.`);
    setPicked((list) => [...list, user]);
  };

  const group = picked.length > 1;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!picked.length) return setError('Choisis au moins une personne.');
    setBusy(true);
    setError(null);
    try {
      onCreated(
        await emit<Conversation>('conversation:create', {
          type: group ? 'GROUP' : 'DIRECT',
          memberIds: picked.map((u) => u.id),
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
        {picked.length > 0 && (
          <ul className="picked" aria-label="Personnes choisies">
            {picked.map((user) => (
              <li key={user.id}>
                <button type="button" className="picked-chip" onClick={() => toggle(user)} aria-label={`Retirer ${user.displayName}`}>
                  <Avatar user={user} size="s" link={false} />
                  <span>{user.displayName.split(' ')[0]}</span>
                  <Icon name="x" size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="field">
          <label htmlFor="nc-search">Avec qui ?</label>
          <div className="search-field">
            <Icon name="search" size={18} />
            <input
              id="nc-search"
              className="input"
              type="search"
              autoComplete="off"
              placeholder="Chercher un nom ou un @pseudo"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <p className="hint">Une personne pour un message direct, plusieurs pour un groupe ({MAX} maximum).</p>
        </div>

        <ul className="pick-list" aria-label={query ? 'Résultats' : 'Suggestions'} aria-busy={searching}>
          {results.map((user) => {
            const on = isPicked(user);
            return (
              <li key={user.id}>
                <button type="button" className="pick-row" aria-pressed={on} onClick={() => toggle(user)}>
                  <Avatar user={user} size="s" link={false} />
                  <span className="pick-who">
                    <strong>{user.displayName}</strong>
                    <span>@{user.username}</span>
                  </span>
                  <span className="pick-check" aria-hidden="true">{on && <Icon name="check" size={14} />}</span>
                </button>
              </li>
            );
          })}
          {!searching && results.length === 0 && <li className="pick-empty">{query ? 'Personne ne correspond à cette recherche.' : 'Aucune suggestion pour le moment.'}</li>}
        </ul>

        {group && (
          <div className="field">
            <label htmlFor="nc-name">Nom du groupe · facultatif</label>
            <input id="nc-name" className="input" maxLength={100} placeholder="Équipe devlink" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
        )}
        {error && <p className="alert" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !picked.length}>
          {busy ? <span className="spinner" aria-label="Création" /> : group ? `Créer le groupe (${picked.length})` : 'Démarrer la conversation'}
        </button>
      </form>
    </Sheet>
  );
}
