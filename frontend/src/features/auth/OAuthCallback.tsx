import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loading } from '../../components/states';
import { api, setToken } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { useSession } from '../../lib/session';

export function OAuthCallback() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hash.get('accessToken');
    const expiresIn = Number(hash.get('expiresIn') ?? 900);
    if (!accessToken) {
      setError('La connexion Google n’a pas fourni de jeton valide.');
      return;
    }
    const restore = async () => {
      try {
        setToken(accessToken);
        const user = await api.me();
        signIn({ accessToken, tokenType: 'Bearer', expiresIn, user });
        const onboarding = params.get('onboarding') === '1';
        navigate(onboarding ? '/signup/oauth' : '/feed', { replace: true });
      } catch (reason) {
        setToken(null);
        setError(errorMessage(reason));
      }
    };
    void restore();
  }, [navigate, params, signIn]);

  if (error) {
    return (
      <main className="screen center">
        <div className="auth stack">
          <p className="alert" role="alert">{error}</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate('/login')}>Retour à la connexion</button>
        </div>
      </main>
    );
  }
  return <Loading />;
}
