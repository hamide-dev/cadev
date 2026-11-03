import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brand } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { api, type Level, type Specialty } from '../../lib/api';
import { errorMessage, INTERESTS, LEVELS, SPECIALTIES } from '../../lib/format';
import { useMe, useSession } from '../../lib/session';

export function OAuthOnboarding() {
  const user = useMe();
  const { setUser } = useSession();
  const navigate = useNavigate();
  const [specialty, setSpecialty] = useState<Specialty | null>(user.specialty);
  const [level, setLevel] = useState<Level | null>(user.experienceLevel);
  const [interests, setInterests] = useState(user.interests);
  const [bio, setBio] = useState(user.bio ?? '');
  const [github, setGithub] = useState(user.githubUrl ?? '');
  const [codes, setCodes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!specialty || !level || interests.length === 0 || !codes) {
      setError('Choisis une spécialité, un niveau, au moins un centre d’intérêt et confirme que tu codes.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await api.updateMe({
        specialty,
        experienceLevel: level,
        interests,
        bio: bio.trim() || undefined,
        githubUrl: github.trim() || null,
      });
      setUser(updated);
      navigate('/feed', { replace: true });
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <form className="auth stack" onSubmit={submit}>
        <div className="center"><Brand /></div>
        <div className="stack-s">
          <h1>Complétez votre profil</h1>
          <p className="lead">Quelques informations pour personnaliser votre expérience.</p>
        </div>
        {error && <p className="alert" role="alert">{error}</p>}
        <fieldset className="field" style={{ border: 0, padding: 0 }}>
          <legend className="label">Votre spécialité</legend>
          <div className="choices">
            {(Object.keys(SPECIALTIES) as Specialty[]).map((item) => (
              <button key={item} type="button" className="choice" aria-pressed={specialty === item} onClick={() => setSpecialty(item)}>
                {specialty === item && <Icon name="check" size={16} />} {SPECIALTIES[item]}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset className="field" style={{ border: 0, padding: 0 }}>
          <legend className="label">Votre niveau</legend>
          <div className="choices two">
            {(Object.keys(LEVELS) as Level[]).map((item) => (
              <button key={item} type="button" className="choice" aria-pressed={level === item} onClick={() => setLevel(item)}>
                {level === item && <Icon name="check" size={16} />} {LEVELS[item]}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="field">
          <label htmlFor="oauth-github">Profil GitHub · facultatif</label>
          <input id="oauth-github" className="input" placeholder="https://github.com/votre-pseudo" value={github} onChange={(event) => setGithub(event.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="oauth-bio">Bio courte · facultative</label>
          <textarea id="oauth-bio" className="textarea" maxLength={500} value={bio} onChange={(event) => setBio(event.target.value)} />
        </div>
        <fieldset className="field" style={{ border: 0, padding: 0 }}>
          <legend className="label">Centres d’intérêt</legend>
          <div className="choices two">
            {INTERESTS.map((item) => (
              <button key={item} type="button" className="choice" aria-pressed={interests.includes(item)} onClick={() => setInterests((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])}>
                {interests.includes(item) && <Icon name="check" size={16} />} {item}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="check">
          <input type="checkbox" checked={codes} onChange={(event) => setCodes(event.target.checked)} />
          Je développe, ou j’apprends à développer.
        </label>
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          {busy ? <span className="spinner" /> : 'Terminer mon inscription'}
        </button>
      </form>
    </main>
  );
}
