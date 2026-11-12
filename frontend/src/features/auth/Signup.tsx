import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from '../../components/Avatar';
import { Brand } from '../../components/Brand';
import { Icon } from '../../components/Icon';
import { BackButton } from '../../components/TopBar';
import { OtpInput } from './OtpInput';
import { api, ApiError, type Level, type Specialty } from '../../lib/api';
import { EMAIL_PATTERN, errorMessage, INTERESTS, LEVELS, roleLine, SPECIALTIES } from '../../lib/format';
import { useSession } from '../../lib/session';

/**
 * Nouveau flux d'inscription en 5 etapes :
 *   0 — Nom + e-mail  -> envoie l'OTP immediatement
 *   1 — Saisie OTP    -> marque l'e-mail comme verifie (bloquant)
 *   2 — Username + mot de passe -> verification dispo du pseudo en base avant de continuer
 *   3 — Profil developpeur
 *   4 — Centres d'interet
 */
const STEP_TITLES = [
  'Créez votre compte',
  'Vérifiez votre e-mail',
  'Vos identifiants',
  'Votre profil développeur',
  "Vos centres d'intérêt",
];

export function Signup() {
  const { signIn, setUser } = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ displayName: '', email: '', username: '', password: '' });
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profile, setProfile] = useState<{ specialty: Specialty | null; experienceLevel: Level | null; github: string; bio: string }>({
    specialty: null,
    experienceLevel: null,
    github: '',
    bio: '',
      });
  const [interests, setInterests] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Etat de disponibilite du username : null = pas encore verifie, true/false = resultat */
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const usernameCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (key: keyof typeof form, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === 'username') {
      setUsernameAvailable(null);
    }
  };

  const githubUrl = profile.github.trim() ? `https://${profile.github.trim().replace(/^https?:\/\//, '').replace(/^www\./, '')}` : null;

  // Verification du username en temps reel (debounce 500 ms)
  useEffect(() => {
    if (step !== 2) return;
    if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    const username = form.username.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
      setUsernameAvailable(null);
      return;
    }
    usernameCheckTimer.current = setTimeout(async () => {
      try {
        const { available } = await api.checkUsername(username);
        setUsernameAvailable(available);
      } catch {
        setUsernameAvailable(null);
      }
    }, 500);
    return () => {
      if (usernameCheckTimer.current) clearTimeout(usernameCheckTimer.current);
    };
  }, [form.username, step]);

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.displayName.trim()) e.displayName = 'Indiquez le nom qui apparaîtra sur votre profil.';
      if (!EMAIL_PATTERN.test(form.email)) e.email = 'Saisissez une adresse e-mail valide, par exemple awa@example.com.';
    }
    if (step === 2) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) e.username = 'De 3 à 20 caractères : lettres, chiffres et tiret bas, sans espace.';
      else if (usernameAvailable === false) e.username = 'Ce pseudo est déjà pris. Essayez-en un autre.';
      if (form.password.length < 8) e.password = 'Au moins 8 caractères.';
    }
    if (step === 3) {
      if (!profile.specialty) e.specialty = 'Choisissez votre spécialité.';
      if (!profile.experienceLevel) e.level = 'Choisissez votre niveau.';
      if (githubUrl && !/^https:\/\/github\.com\/[A-Za-z0-9-]+\/?$/.test(githubUrl)) e.github = 'Format attendu : github.com/votre-pseudo';
          }
    return e;
  };

  const next = async (event: FormEvent) => {
    event.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;
    setError(null);
    setBusy(true);
    try {
      if (step === 0) {
        // Etape 0 -> envoie l'OTP de verification e-mail
        await api.initRegistration({ email: form.email.trim(), displayName: form.displayName.trim() });
      } else if (step === 1) {
        // Etape 1 -> valide l'OTP (ne cree pas encore le compte)
        await api.verifyInitOtp(form.email.trim(), code);
      } else if (step === 2) {
        // Etape 2 -> verifie username dispo cote serveur + cree le compte
        const check = await api.checkUsername(form.username.trim());
        if (!check.available) {
          setErrors({ username: 'Ce pseudo est déjà pris. Essayez-en un autre.' });
          setBusy(false);
          return;
        }
        const auth = await api.completeRegistration({
          email: form.email.trim(),
          username: form.username.trim(),
          password: form.password,
        });
        signIn(auth);
      } else if (step === 3) {
        setUser(await api.updateMe({ specialty: profile.specialty, experienceLevel: profile.experienceLevel, bio: profile.bio.trim() || undefined, githubUrl }));
      } else if (step === 4) {
        setUser(await api.updateMe({ interests }));
        return navigate('/feed');
      }
      setStep(step + 1);
    } catch (err) {
      const msg = errorMessage(err);
      setError(msg);
      if (err instanceof ApiError && err.code === 'EMAIL_ALREADY_EXISTS') {
        setErrors((prev) => ({ ...prev, email: msg }));
      } else if (err instanceof ApiError && err.code === 'USERNAME_ALREADY_EXISTS') {
        setErrors((prev) => ({ ...prev, username: msg }));
      }
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (key: string) =>
    errors[key] && (
      <p id={`${key}-error`} className="error-text">
        {errors[key]}
      </p>
    );

  const canSubmitStep1 = step === 1 && code.length === 4;
  const canSubmitStep2 = step === 2 && usernameAvailable !== false;

  return (
    <main className="screen">
      <form className="auth" style={{ paddingTop: 8 }} onSubmit={next} noValidate>
        <div className="row" style={{ marginLeft: -12 }}>
          {step === 0 ? (
            <BackButton to="/signup" />
          ) : step === 3 ? (
            <span style={{ width: 44 }} />
          ) : (
            <button
              type="button"
              className="icon-btn"
              aria-label="Étape précédente"
              onClick={() => {
                setError(null);
                setStep(step - 1);
              }}
            >
              <Icon name="back" />
            </button>
          )}
          <div className="grow center" style={{ marginRight: 44 }}>
            <Brand />
          </div>
        </div>
        <div className="row-between">
          <span className="xs muted">Étape {step + 1}/5</span>
          <span className="steps" aria-hidden="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={i <= step ? 'on' : ''} />
            ))}
          </span>
        </div>
        <div className="stack-s">
          <h1>{STEP_TITLES[step]}</h1>
          {step === 0 && <p className="lead">Commencez par votre nom et votre e-mail.</p>}
          {step === 1 && <p className="lead">Saisissez le code à 4 chiffres envoyé à :</p>}
          {step === 2 && <p className="lead">Choisissez votre pseudo et sécurisez votre compte.</p>}
          {step === 4 && <p className="lead">Choisissez les sujets que vous souhaitez retrouver dans votre fil.</p>}
        </div>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        {/* ── Etape 0 : nom + e-mail ── */}
        {step === 0 && (
          <div className="stack">
            <div className="field">
              <label htmlFor="displayName">Nom affiché</label>
              <input
                id="displayName"
                className="input"
                autoComplete="name"
                maxLength={80}
                value={form.displayName}
                onChange={(e) => update('displayName', e.target.value)}
                aria-invalid={!!errors.displayName}
                aria-describedby="displayName-hint displayName-error"
              />
              <p id="displayName-hint" className="hint">Le nom qui apparaîtra sur votre profil.</p>
              {fieldError('displayName')}
            </div>
            <div className="field">
              <label htmlFor="email">Adresse e-mail</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby="email-hint email-error"
              />
              <p id="email-hint" className="hint">Votre e-mail reste privé. Il ne sera pas affiché sur votre profil.</p>
              {fieldError('email')}
            </div>
          </div>
        )}

        {/* ── Etape 1 : OTP e-mail ── */}
        {step === 1 && (
          <div className="stack">
            <div className="stack-s">
              <p className="strong">{form.email}</p>
              <button
                type="button"
                className="link small"
                style={{ alignSelf: 'flex-start' }}
                onClick={() => { setCode(''); setStep(0); }}
              >
                Modifier l'e-mail
              </button>
            </div>
            <div className="field">
              <span className="label">Code de vérification</span>
              <OtpInput value={code} onChange={setCode} invalid={!!error} />
            </div>
            <div className="stack-s">
              <p className="small muted">Vous n'avez pas reçu l'e-mail ?</p>
              <button
                type="button"
                className="link small"
                style={{ alignSelf: 'flex-start' }}
                onClick={() =>
                  api
                    .resendVerification(form.email)
                    .then(() => setInfo('Un nouveau code vient de partir.'))
                    .catch((err) => setError(errorMessage(err)))
                }
              >
                Renvoyer le code
              </button>
              {info && <p className="small" role="status" style={{ color: 'var(--success)' }}>{info}</p>}
              <p className="xs muted">Pensez aussi à consulter vos courriers indésirables.</p>
            </div>
          </div>
        )}

        {/* ── Etape 2 : username + mot de passe ── */}
        {step === 2 && (
          <div className="stack">
            <div className="field">
              <label htmlFor="username">Pseudo</label>
              <div className="input-wrap">
                <input
                  id="username"
                  className="input mono"
                  autoComplete="username"
                  maxLength={20}
                  value={form.username}
                  onChange={(e) => update('username', e.target.value.replace(/^@/, ''))}
                  aria-invalid={!!errors.username || usernameAvailable === false}
                  aria-describedby="username-hint username-status username-error"
                  placeholder="awacodes"
                />
                {/* Indicateur de disponibilite */}
                {form.username.length >= 3 && (
                  <span
                    className="icon-btn"
                    aria-hidden="true"
                    style={{ color: usernameAvailable === null ? 'var(--muted)' : usernameAvailable ? 'var(--success)' : 'var(--danger)' }}
                  >
                    {usernameAvailable === null ? (
                      <Icon name="more" size={16} />
                    ) : usernameAvailable ? (
                      <Icon name="check" size={16} />
                    ) : (
                      <Icon name="x" size={16} />
                    )}
                  </span>
                )}
              </div>
              <p id="username-hint" className="hint">Votre identifiant public, utilisé pour vous mentionner. De 3 à 20 caractères : lettres, chiffres et tiret bas (_), sans espace.</p>
              {form.username.length >= 3 && usernameAvailable !== null && (
                <p
                  id="username-status"
                  className={usernameAvailable ? 'hint' : 'error-text'}
                  role="status"
                  style={{ color: usernameAvailable ? 'var(--success)' : undefined }}
                >
                  {usernameAvailable ? '✓ Ce pseudo est disponible.' : '✗ Ce pseudo est déjà pris.'}
                </p>
              )}
              {fieldError('username')}
            </div>
            <div className="field">
              <label htmlFor="password">Mot de passe</label>
              <div className="input-wrap">
                <input
                  id="password"
                  className="input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  maxLength={72}
                  value={form.password}
                  onChange={(e) => update('password', e.target.value)}
                  aria-invalid={!!errors.password}
                  aria-describedby="password-hint password-error"
                />
                <button type="button" className="icon-btn" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} />
                </button>
              </div>
              <p id="password-hint" className="hint">Utilisez au moins 8 caractères. Évitez un mot de passe déjà utilisé ailleurs.</p>
              {fieldError('password')}
            </div>
          </div>
        )}

        {/* ── Etape 3 : profil developpeur ── */}
        {step === 3 && (
          <div className="stack">
            <fieldset className="field">
              <legend className="label" style={{ marginBottom: 8 }}>Votre spécialité</legend>
              <div className="choices">
                {(Object.keys(SPECIALTIES) as Specialty[]).map((key) => (
                  <button key={key} type="button" className="choice" aria-pressed={profile.specialty === key} onClick={() => setProfile((p) => ({ ...p, specialty: key }))}>
                    {profile.specialty === key && <Icon name="check" size={16} />} {SPECIALTIES[key]}
                  </button>
                ))}
              </div>
              {fieldError('specialty')}
            </fieldset>
            <fieldset className="field">
              <legend className="label" style={{ marginBottom: 8 }}>Votre niveau</legend>
              <div className="choices two">
                {(Object.keys(LEVELS) as Level[]).map((key) => (
                  <button key={key} type="button" className="choice" aria-pressed={profile.experienceLevel === key} onClick={() => setProfile((p) => ({ ...p, experienceLevel: key }))}>
                    {profile.experienceLevel === key && <Icon name="check" size={16} />} {LEVELS[key]}
                  </button>
                ))}
              </div>
              {fieldError('level')}
            </fieldset>
            <div className="field">
              <label htmlFor="github">Profil GitHub · facultatif</label>
              <input id="github" className="input" inputMode="url" placeholder="github.com/awacodes" value={profile.github} onChange={(e) => setProfile((p) => ({ ...p, github: e.target.value }))} aria-invalid={!!errors.github} aria-describedby="github-error" />
              {fieldError('github')}
            </div>
            <div className="field">
              <label htmlFor="bio">Bio courte · facultative</label>
              <input id="bio" className="input" maxLength={500} placeholder="Je crée des interfaces web accessibles." value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))} />
            </div>

          </div>
        )}

        {/* ── Etape 4 : centres d'interet ── */}
        {step === 4 && (
          <div className="stack">
            <div className="row-between">
              <span className="label">Plusieurs choix possibles</span>
              <span className="xs muted" aria-live="polite">
                {interests.length} sélectionné{interests.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="choices two">
              {INTERESTS.map((topic) => {
                const on = interests.includes(topic);
                return (
                  <button key={topic} type="button" className="choice" aria-pressed={on} onClick={() => setInterests((list) => (on ? list.filter((t) => t !== topic) : [...list, topic]))}>
                    {on && <Icon name="check" size={16} />} {topic}
                  </button>
                );
              })}
            </div>
            <div className="stack-s">
              <span className="xs muted">Aperçu de votre profil</span>
              <div className="card row" style={{ gap: 16 }}>
                <Avatar user={{ username: form.username, displayName: form.displayName, avatarUrl: null }} link={false} />
                <div>
                  <p className="strong">{form.displayName}</p>
                  <p className="post-handle">@{form.username}</p>
                  <p className="xs muted">{roleLine(profile)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="spacer" />
        <div className="footer-cta" style={{ padding: '8px 0 32px' }}>
          {step === 4 && <p className="center xs muted" style={{ marginBottom: 12 }}>En créant votre compte, vous acceptez les Conditions et la Politique de confidentialité.</p>}
          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={busy || (step === 1 && !canSubmitStep1) || (step === 2 && canSubmitStep2 === false)}
          >
            {busy ? <span className="spinner" aria-label="Envoi en cours" /> : step === 4 ? 'Terminer mon profil' : 'Continuer'}
          </button>
        </div>
      </form>
    </main>
  );
}
