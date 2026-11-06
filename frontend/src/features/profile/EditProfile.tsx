import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Icon } from '../../components/Icon';
import { TopBar } from '../../components/TopBar';
import { api, type Level, type Specialty, uploadToCloudinary } from '../../lib/api';
import { errorMessage, INTERESTS, LEVELS, SPECIALTIES } from '../../lib/format';
import { useMe, useSession } from '../../lib/session';

export function EditProfile() {
  const me = useMe();
  const { setUser } = useSession();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    displayName: me.displayName,
    username: me.username,
    bio: me.bio ?? '',
    github: me.githubUrl?.replace(/^https:\/\//, '') ?? '',
    specialty: me.specialty,
    experienceLevel: me.experienceLevel,
    interests: me.interests,
    technologies: me.technologies.join(', '),
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const uploadAvatar = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const sig = await api.profileSignature();
      await uploadToCloudinary(sig, file, 'profile');
      const { avatarUrl } = await api.confirmProfile(sig.publicId);
      setUser({ ...me, avatarUrl });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const githubUrl = form.github.trim() ? `https://${form.github.trim().replace(/^https?:\/\//, '').replace(/^www\./, '')}` : null;
    if (!form.displayName.trim()) return setError('Le nom ne peut pas être vide.');
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) return setError('Pseudo : de 3 à 20 caractères, lettres, chiffres et tiret bas.');
    if (githubUrl && !/^https:\/\/github\.com\/[A-Za-z0-9-]+\/?$/.test(githubUrl)) return setError('Lien GitHub : format attendu github.com/ton-pseudo.');
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateMe({
        displayName: form.displayName.trim(),
        username: form.username,
        bio: form.bio.trim(),
        githubUrl,
        specialty: form.specialty,
        experienceLevel: form.experienceLevel,
        interests: form.interests,
        technologies: [...new Set(form.technologies.split(',').map((t) => t.trim()).filter(Boolean))],
      });
      setUser(updated);
      navigate(`/u/${updated.username}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <form onSubmit={save} className="stack" noValidate style={{ flex: 1 }}>
        <TopBar back title="Modifier le profil" sub="Retour au profil" right={<button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Annuler</button>} />
        <div className="pad stack">
          <div className="row" style={{ gap: 16 }}>
            <Avatar user={me} size="xl" link={false} />
            <label className="icon-btn bordered" style={{ borderRadius: 10, cursor: 'pointer' }} aria-label="Changer la photo de profil">
              {uploading ? <span className="spinner" /> : <Icon name="camera" size={20} />}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) uploadAvatar(f); }} />
            </label>
          </div>
          <div className="field">
            <label htmlFor="ep-name">Nom</label>
            <input id="ep-name" className="input" maxLength={80} value={form.displayName} onChange={(e) => set('displayName', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ep-username">Pseudo</label>
            <input id="ep-username" className="input mono" maxLength={20} value={form.username} onChange={(e) => set('username', e.target.value.replace(/^@/, ''))} />
          </div>
          <div className="field">
            <label htmlFor="ep-bio">Bio</label>
            <textarea id="ep-bio" className="textarea" maxLength={500} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="ep-github">Profil GitHub</label>
            <input id="ep-github" className="input" inputMode="url" placeholder="github.com/ton-pseudo" value={form.github} onChange={(e) => set('github', e.target.value)} />
          </div>
          <fieldset className="field">
            <legend className="label" style={{ marginBottom: 8 }}>Spécialité</legend>
            <div className="choices">
              {(Object.keys(SPECIALTIES) as Specialty[]).map((key) => (
                <button key={key} type="button" className="choice" aria-pressed={form.specialty === key} onClick={() => set('specialty', key)}>
                  {SPECIALTIES[key]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="field">
            <legend className="label" style={{ marginBottom: 8 }}>Niveau</legend>
            <div className="choices two">
              {(Object.keys(LEVELS) as Level[]).map((key) => (
                <button key={key} type="button" className="choice" aria-pressed={form.experienceLevel === key} onClick={() => set('experienceLevel', key)}>
                  {LEVELS[key]}
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="field">
            <legend className="label" style={{ marginBottom: 8 }}>Centres d’intérêt</legend>
            <div className="choices two">
              {[...new Set([...INTERESTS, ...form.interests])].map((topic) => {
                const on = form.interests.includes(topic);
                return (
                  <button key={topic} type="button" className="choice" aria-pressed={on} onClick={() => set('interests', on ? form.interests.filter((t) => t !== topic) : [...form.interests, topic])}>
                    {topic}
                  </button>
                );
              })}
            </div>
          </fieldset>
          <div className="field">
            <label htmlFor="ep-tech">Technologies maîtrisées</label>
            <input id="ep-tech" className="input" placeholder="React, TypeScript, PostgreSQL" value={form.technologies} onChange={(e) => set('technologies', e.target.value)} />
            <p className="hint">Sépare-les par des virgules.</p>
          </div>
        </div>
        <div className="spacer" />
        <div className="footer-cta stack-s">
          {error && <p className="alert" role="alert">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
            {busy ? <span className="spinner" aria-label="Enregistrement" /> : 'Enregistrer'}
          </button>
        </div>
      </form>
    </main>
  );
}
