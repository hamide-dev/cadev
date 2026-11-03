import { useState, type FormEvent } from 'react';
import { Sheet } from '../../components/Sheet';
import { api, type Project, type Task } from '../../lib/api';
import { errorMessage } from '../../lib/format';

export function NewProject({ onClose, onCreated }: { onClose: () => void; onCreated: (p: Project) => void }) {
  const [form, setForm] = useState({ name: '', description: '', repositoryUrl: '', technologies: '', isBeginnerFriendly: true });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.name.trim().length < 3) return setError('Le nom doit faire au moins 3 caractères.');
    if (form.description.trim() && form.description.trim().length < 10) return setError('Décris le projet en au moins 10 caractères.');
    setBusy(true);
    setError(null);
    try {
      const repo = form.repositoryUrl.trim();
      onCreated(
        await api.createProject({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          repositoryUrl: repo ? (repo.startsWith('http') ? repo : `https://${repo}`) : undefined,
          technologies: form.technologies.split(',').map((t) => t.trim()).filter(Boolean),
          isBeginnerFriendly: form.isBeginnerFriendly,
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };
  return (
    <Sheet title="Ajouter un projet" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="np-name">Nom du projet</label>
          <input id="np-name" className="input" maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="devlink" />
        </div>
        <div className="field">
          <label htmlFor="np-desc">Description</label>
          <textarea id="np-desc" className="textarea" maxLength={2000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Ce que fait le projet et l’aide recherchée." />
        </div>
        <div className="field">
          <label htmlFor="np-repo">Dépôt GitHub · facultatif</label>
          <input id="np-repo" className="input mono" inputMode="url" value={form.repositoryUrl} onChange={(e) => setForm({ ...form, repositoryUrl: e.target.value })} placeholder="github.com/awacodes/devlink" />
        </div>
        <div className="field">
          <label htmlFor="np-tech">Technologies</label>
          <input id="np-tech" className="input" value={form.technologies} onChange={(e) => setForm({ ...form, technologies: e.target.value })} placeholder="React, TypeScript" />
          <p className="hint">Sépare-les par des virgules.</p>
        </div>
        <label className="row-between">
          <span className="small">Accueille les débutants</span>
          <span className="switch">
            <input type="checkbox" checked={form.isBeginnerFriendly} onChange={(e) => setForm({ ...form, isBeginnerFriendly: e.target.checked })} />
            <span />
          </span>
        </label>
        {error && <p className="alert" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <span className="spinner" aria-label="Création" /> : 'Créer le projet'}
        </button>
      </form>
    </Sheet>
  );
}

export function ContributeSheet({ projectId, taskId, onClose }: { projectId: string; taskId?: string; onClose: () => void }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (message.trim().length < 10) return setError('Dis-en un peu plus (10 caractères minimum).');
    setBusy(true);
    setError(null);
    try {
      await api.contribute(projectId, message.trim(), taskId);
      setDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet title={taskId ? 'Proposer mon aide' : 'Contribuer au projet'} onClose={onClose}>
      {done ? (
        <div className="stack center">
          <p className="alert success">Proposition envoyée. L’équipe du projet va te répondre.</p>
          <button type="button" className="btn btn-block" onClick={onClose}>
            Fermer
          </button>
        </div>
      ) : (
        <form className="stack" onSubmit={submit}>
          <div className="field">
            <label htmlFor="contrib">Ton message à l’équipe</label>
            <textarea id="contrib" className="textarea" maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ce que tu proposes de faire, et comment tu comptes t’y prendre." />
          </div>
          {error && <p className="alert" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <span className="spinner" aria-label="Envoi" /> : 'Envoyer ma proposition'}
          </button>
        </form>
      )}
    </Sheet>
  );
}

export function NewTask({ projectId, onClose, onCreated }: { projectId: string; onClose: () => void; onCreated: (t: Task) => void }) {
  const [form, setForm] = useState({ title: '', description: '', criteria: '', isBeginnerFriendly: false });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (form.title.trim().length < 3) return setError('Le titre doit faire au moins 3 caractères.');
    if (form.description.trim().length < 10) return setError('Décris la tâche en au moins 10 caractères.');
    setBusy(true);
    setError(null);
    try {
      onCreated(
        await api.createTask(projectId, {
          title: form.title.trim(),
          description: form.description.trim(),
          acceptanceCriteria: form.criteria.split('\n').map((c) => c.trim()).filter(Boolean),
          isBeginnerFriendly: form.isBeginnerFriendly,
        }),
      );
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };
  return (
    <Sheet title="Nouvelle tâche" onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="nt-title">Titre</label>
          <input id="nt-title" className="input" maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="nt-desc">Description</label>
          <textarea id="nt-desc" className="textarea" maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="nt-crit">Critères d’acceptation</label>
          <textarea id="nt-crit" className="textarea" value={form.criteria} onChange={(e) => setForm({ ...form, criteria: e.target.value })} placeholder="Un critère par ligne" />
        </div>
        <label className="row-between">
          <span className="small">Bonne première tâche (good first issue)</span>
          <span className="switch">
            <input type="checkbox" checked={form.isBeginnerFriendly} onChange={(e) => setForm({ ...form, isBeginnerFriendly: e.target.checked })} />
            <span />
          </span>
        </label>
        {error && <p className="alert" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <span className="spinner" aria-label="Création" /> : 'Créer la tâche'}
        </button>
      </form>
    </Sheet>
  );
}
