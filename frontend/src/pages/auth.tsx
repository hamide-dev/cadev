import { useRef, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Level, type Specialty } from '../api';
import { useSession } from '../auth';
import { Avatar, BackButton, Brand, errorMessage, GitHubLogo, GoogleLogo, Icon, INTERESTS, LEVELS, roleLine, Sheet, SPECIALTIES } from '../ui';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function Welcome() {
  return (
    <main className="screen">
      <div className="auth">
        <div className="center" style={{ paddingTop: 24 }}>
          <Brand />
        </div>
        <div className="spacer" />
        <div className="stack center" style={{ gap: 8 }}>
          <h1>
            Le réseau social
            <br />
            des bâtisseurs.
          </h1>
          <p className="lead">Partage ce que tu codes, trouve ton équipe et fais-toi repérer en Afrique.</p>
        </div>
        <div className="footer-cta" style={{ padding: '0 0 32px' }}>
          <Link to="/signup" className="btn btn-primary btn-block">
            Continuer
          </Link>
          <p className="center small muted" style={{ marginTop: 16 }}>
            Déjà membre ?{' '}
            <Link to="/login" className="link">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

function OAuthButtons() {
  return (
    <>
      <a href={api.oauthUrl('google')} className="btn btn-dark btn-block">
        <GoogleLogo /> Continuer avec Google
      </a>
      <a href={api.oauthUrl('github')} className="btn btn-primary btn-block">
        <GitHubLogo /> Continuer avec GitHub
      </a>
    </>
  );
}

export function OtpInput({ value, onChange, invalid }: { value: string; onChange: (code: string) => void; invalid?: boolean }) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(4, ' ').slice(0, 4).split('');
  const set = (index: number, digit: string) => {
    const next = digits.map((d, i) => (i === index ? digit : d)).join('').replace(/\s+$/, '');
    onChange(next.replace(/\s/g, ''));
  };
  return (
    <div className="otp" role="group" aria-label="Code à 4 chiffres">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={4}
          aria-label={`Chiffre ${i + 1}`}
          aria-invalid={invalid || undefined}
          value={digit.trim()}
          onChange={(event) => {
            const typed = event.target.value.replace(/\D/g, '');
            if (typed.length > 1) {
              onChange(typed.slice(0, 4));
              refs.current[Math.min(typed.length, 3)]?.focus();
              return;
            }
            set(i, typed);
            if (typed && i < 3) refs.current[i + 1]?.focus();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !digit.trim() && i > 0) refs.current[i - 1]?.focus();
          }}
        />
      ))}
    </div>
  );
}

export function Login() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!EMAIL.test(email)) return setError('Saisis une adresse e-mail valide, par exemple awa@example.com.');
    setBusy(true);
    setError(null);
    try {
      if (usePassword) {
        signIn(await api.login(email, password));
        navigate('/feed');
      } else {
        await api.requestLoginCode(email);
        setCode('');
        setCodeSent(true);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    setCode(value);
    if (value.length !== 4) return;
    setBusy(true);
    setError(null);
    try {
      signIn(await api.verifyLoginCode(email, value));
      navigate('/feed');
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <form className="auth" onSubmit={submit} noValidate>
        <div className="stack center" style={{ paddingTop: 24, gap: 24 }}>
          <Brand />
          <div className="stack-s">
            <h1>Bonjour</h1>
            <p className="lead">Connecte-toi pour poursuivre ta session.</p>
          </div>
        </div>
        <div className="spacer" />
        <div className="stack">
          {error && !codeSent && (
            <p className="alert" role="alert">
              {error}
            </p>
          )}
          <div className="field">
            <label htmlFor="login-email">E-mail</label>
            <div className="input-wrap">
              <input
                id="login-email"
                className="input"
                type="email"
                autoComplete="email"
                placeholder="awa@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
              {!usePassword && (
                <button type="submit" className="icon-btn solid" aria-label="Recevoir un code de connexion" disabled={busy}>
                  {busy ? <span className="spinner" /> : <Icon name="arrow" />}
                </button>
              )}
            </div>
          </div>
          {usePassword && (
            <>
              <div className="field">
                <label htmlFor="login-password">Mot de passe</label>
                <input id="login-password" className="input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy || !password}>
                {busy ? <span className="spinner" /> : 'Se connecter'}
              </button>
            </>
          )}
          <button type="button" className="link small" style={{ alignSelf: 'flex-start', color: 'var(--text-2)' }} onClick={() => setUsePassword(!usePassword)}>
            {usePassword ? 'Recevoir plutôt un code par e-mail' : 'Utiliser mon mot de passe'}
          </button>
          <div className="divider">Ou</div>
          <OAuthButtons />
          <div className="row-between small">
            <span className="muted">Nouveau dans le coin ?</span>
            <Link to="/signup" className="strong" style={{ textDecoration: 'none' }}>
              Créer un compte
            </Link>
          </div>
          <p className="center xs muted" style={{ paddingBottom: 24 }}>
            En continuant, tu acceptes les règles de la communauté.
          </p>
        </div>
      </form>

      {codeSent && (
        <Sheet title="Vérification de ton e-mail" onClose={() => setCodeSent(false)}>
          <p className="center small muted">Tu vas recevoir un code à 4 chiffres à l'adresse {email}.</p>
          <OtpInput value={code} onChange={verify} invalid={!!error} />
          {error && (
            <p className="error-text center" role="alert">
              {error}
            </p>
          )}
          {busy && (
            <p className="center" role="status">
              <span className="spinner" style={{ display: 'inline-block' }} aria-label="Vérification en cours" />
            </p>
          )}
          <p className="center small muted">
            Tu n'as pas reçu le code ?{' '}
            <button type="button" className="link" onClick={() => api.requestLoginCode(email).catch((err) => setError(errorMessage(err)))}>
              Renvoyer
            </button>
          </p>
        </Sheet>
      )}
    </main>
  );
}

export function SignupChoice() {
  return (
    <main className="screen">
      <div className="auth">
        <div className="stack center" style={{ paddingTop: 24, gap: 24 }}>
          <Brand />
          <div className="stack-s">
            <h1>Créez votre compte</h1>
            <p className="lead">Rejoignez le réseau social des développeurs pour partager vos projets, trouver une équipe et faire grandir votre carrière.</p>
          </div>
        </div>
        <div className="stack" style={{ paddingTop: 16 }}>
          <Link to="/signup/email" className="btn btn-primary btn-block">
            <Icon name="mail" size={20} /> Continuer avec e-mail
          </Link>
          <div className="divider">Ou</div>
          <OAuthButtons />
          <p className="center small muted">
            Déjà membre ?{' '}
            <Link to="/login" className="strong" style={{ textDecoration: 'none', color: 'var(--text)' }}>
              Se connecter
            </Link>
          </p>
          <p className="center xs muted">En continuant, vous acceptez les Conditions et la Politique de confidentialité.</p>
        </div>
      </div>
    </main>
  );
}

// Ordre adapté à l'API (voir DECISIONS.md) : le back exige pseudo et mot de passe avant d'envoyer l'OTP.
const STEP_TITLES = ['Créez votre compte', 'Vos identifiants', 'Vérifiez votre e-mail', 'Votre profil développeur', 'Vos centres d’intérêt'];

export function Signup() {
  const { signIn, setUser } = useSession();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ displayName: '', email: '', username: '', password: '' });
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [profile, setProfile] = useState<{ specialty: Specialty | null; experienceLevel: Level | null; github: string; bio: string; codes: boolean }>({
    specialty: null,
    experienceLevel: null,
    github: '',
    bio: '',
    codes: false,
  });
  const [interests, setInterests] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const githubUrl = profile.github.trim() ? `https://${profile.github.trim().replace(/^https?:\/\//, '').replace(/^www\./, '')}` : null;

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!form.displayName.trim()) e.displayName = 'Indiquez le nom qui apparaîtra sur votre profil.';
      if (!EMAIL.test(form.email)) e.email = 'Saisissez une adresse e-mail valide, par exemple awa@example.com.';
    }
    if (step === 1) {
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(form.username)) e.username = 'De 3 à 20 caractères : lettres, chiffres et tiret bas, sans espace.';
      if (form.password.length < 12) e.password = 'Au moins 12 caractères.';
    }
    if (step === 3) {
      if (!profile.specialty) e.specialty = 'Choisissez votre spécialité.';
      if (!profile.experienceLevel) e.level = 'Choisissez votre niveau.';
      if (githubUrl && !/^https:\/\/github\.com\/[A-Za-z0-9-]+\/?$/.test(githubUrl)) e.github = 'Format attendu : github.com/votre-pseudo';
      if (!profile.codes) e.codes = 'Ce réseau est réservé aux personnes qui codent.';
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
      if (step === 1) {
        await api.register({ ...form, displayName: form.displayName.trim(), email: form.email.trim() });
      } else if (step === 2) {
        signIn(await api.verifyEmail(form.email.trim(), code));
      } else if (step === 3) {
        setUser(await api.updateMe({ specialty: profile.specialty, experienceLevel: profile.experienceLevel, bio: profile.bio.trim() || undefined, githubUrl }));
      } else if (step === 4) {
        setUser(await api.updateMe({ interests }));
        return navigate('/feed');
      }
      setStep(step + 1);
    } catch (err) {
      setError(errorMessage(err));
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

  return (
    <main className="screen">
      <form className="auth" style={{ paddingTop: 8 }} onSubmit={next} noValidate>
        <div className="row" style={{ marginLeft: -12 }}>
          {step === 0 ? (
            <BackButton to="/signup" />
          ) : step === 3 ? (
            <span style={{ width: 44 }} />
          ) : (
            <button type="button" className="icon-btn" aria-label="Étape précédente" onClick={() => setStep(step - 1)}>
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
          {step === 1 && <p className="lead">Choisissez votre pseudo et sécurisez votre compte.</p>}
          {step === 4 && <p className="lead">Choisissez les sujets que vous souhaitez retrouver dans votre fil.</p>}
        </div>

        {error && (
          <p className="alert" role="alert">
            {error}
          </p>
        )}

        {step === 0 && (
          <div className="stack">
            <div className="field">
              <label htmlFor="displayName">Nom affiché</label>
              <input id="displayName" className="input" autoComplete="name" maxLength={80} value={form.displayName} onChange={(e) => update('displayName', e.target.value)} aria-invalid={!!errors.displayName} aria-describedby="displayName-hint displayName-error" />
              <p id="displayName-hint" className="hint">Le nom qui apparaîtra sur votre profil.</p>
              {fieldError('displayName')}
            </div>
            <div className="field">
              <label htmlFor="email">Adresse e-mail</label>
              <input id="email" className="input" type="email" autoComplete="email" value={form.email} onChange={(e) => update('email', e.target.value)} aria-invalid={!!errors.email} aria-describedby="email-hint email-error" />
              <p id="email-hint" className="hint">Votre e-mail reste privé. Il ne sera pas affiché sur votre profil.</p>
              {fieldError('email')}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="stack">
            <div className="field">
              <label htmlFor="username">Pseudo</label>
              <input id="username" className="input mono" autoComplete="username" maxLength={20} value={form.username} onChange={(e) => update('username', e.target.value.replace(/^@/, ''))} aria-invalid={!!errors.username} aria-describedby="username-hint username-error" placeholder="awacodes" />
              <p id="username-hint" className="hint">Votre identifiant public, utilisé pour vous mentionner. De 3 à 20 caractères : lettres, chiffres et tiret bas (_), sans espace.</p>
              {fieldError('username')}
            </div>
            <div className="field">
              <label htmlFor="password">Mot de passe</label>
              <div className="input-wrap">
                <input id="password" className="input" type={showPassword ? 'text' : 'password'} autoComplete="new-password" maxLength={72} value={form.password} onChange={(e) => update('password', e.target.value)} aria-invalid={!!errors.password} aria-describedby="password-hint password-error" />
                <button type="button" className="icon-btn" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                  <Icon name={showPassword ? 'eyeOff' : 'eye'} />
                </button>
              </div>
              <p id="password-hint" className="hint">Utilisez au moins 12 caractères, avec des lettres, des chiffres et un symbole. Évitez un mot de passe déjà utilisé ailleurs.</p>
              {fieldError('password')}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="stack">
            <div className="stack-s">
              <p className="lead">Saisissez le code à 4 chiffres envoyé à :</p>
              <p className="strong">{form.email}</p>
              <button type="button" className="link small" style={{ alignSelf: 'flex-start' }} onClick={() => setStep(0)}>
                Modifier l’e-mail
              </button>
            </div>
            <div className="field">
              <span className="label">Code de vérification</span>
              <OtpInput value={code} onChange={setCode} invalid={!!error} />
            </div>
            <div className="stack-s">
              <p className="small muted">Vous n’avez pas reçu l’e-mail ?</p>
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

        {step === 3 && (
          <div className="stack">
            <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
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
            <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
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
            <label className="check">
              <input type="checkbox" checked={profile.codes} onChange={(e) => setProfile((p) => ({ ...p, codes: e.target.checked }))} aria-describedby="codes-error" />
              Je développe, ou j’apprends à développer. Ce réseau est réservé aux personnes qui codent.
            </label>
            {fieldError('codes')}
          </div>
        )}

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
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || (step === 2 && code.length !== 4)}>
            {busy ? <span className="spinner" aria-label="Envoi en cours" /> : step === 4 ? 'Terminer mon profil' : 'Continuer'}
          </button>
        </div>
      </form>
    </main>
  );
}
