import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Brand } from '../../components/Brand';
import { OAuthButtons } from './OAuthButtons';
import { api } from '../../lib/api';
import { EMAIL_PATTERN, errorMessage } from '../../lib/format';
import { useSession } from '../../lib/session';

export function Login() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgot, setForgot] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (forgot) {
      await requestReset();
      return;
    }
    if (!EMAIL_PATTERN.test(email)) return setError('Saisis une adresse e-mail valide, par exemple awa@example.com.');
    setBusy(true);
    setError(null);
    try {
      if (password.length < 8) return setError('Le mot de passe doit contenir au moins 8 caractères.');
      signIn(await api.login(email, password));
      navigate('/feed');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const requestReset = async () => {
    if (!EMAIL_PATTERN.test(email)) return setError('Saisis ton e-mail pour recevoir un code.');
    setBusy(true);
    setError(null);
    try {
      await api.requestPasswordReset(email);
      setResetSent(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!/^\d{4}$/.test(resetCode) || newPassword.length < 8) {
      return setError('Le code doit contenir 4 chiffres et le nouveau mot de passe au moins 8 caractères.');
    }
    setBusy(true);
    setError(null);
    try {
      await api.resetPassword(email, resetCode, newPassword);
      setForgot(false);
      setResetSent(false);
      setPassword('');
      setNewPassword('');
      setResetCode('');
      setError('Mot de passe réinitialisé. Tu peux te connecter.');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
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
          {error && (
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
                disabled={forgot && resetSent}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          </div>
          {!forgot ? <>
          <div className="field">
                <label htmlFor="login-password">Mot de passe</label>
                <input id="login-password" className="input" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={busy || !password}>
            {busy ? <span className="spinner" /> : 'Se connecter'}
          </button>
          <button type="button" className="link small" onClick={() => { setForgot(true); setError(null); }}>
            Mot de passe oublié ?
          </button></> : <section className="stack">
            <p className="small muted">Entre ton e-mail pour recevoir un code de réinitialisation valable 2 minutes.</p>
            {!resetSent ? <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={requestReset}>
              {busy ? <span className="spinner" /> : 'Recevoir le code'}
            </button> : <>
              <p className="small muted" role="status">Si cette adresse correspond à un compte vérifié, un code de réinitialisation vient d’être envoyé. Vérifie aussi tes courriers indésirables.</p>
              <label className="field"><span>Code reçu</span><input className="input" inputMode="numeric" maxLength={4} value={resetCode} onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))} /></label>
              <label className="field"><span>Nouveau mot de passe</span><input className="input" type="password" minLength={8} maxLength={72} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></label>
              <button type="button" className="btn btn-primary btn-block" disabled={busy} onClick={reset}>Réinitialiser le mot de passe</button>
              <button type="button" className="link small" disabled={busy} onClick={requestReset}>Renvoyer le code</button>
            </>}
            <button type="button" className="link small" onClick={() => { setForgot(false); setError(null); }}>Retour à la connexion</button>
          </section>}
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

    </main>
  );
}
