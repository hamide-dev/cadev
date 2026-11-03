import { useState, type FormEvent } from 'react';
import { Sheet } from '../../components/Sheet';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { type Conversation, emit } from '../../lib/socket';

export function NewConversation({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Conversation) => void }) {
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
