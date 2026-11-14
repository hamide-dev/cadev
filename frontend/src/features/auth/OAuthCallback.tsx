import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loading } from '../../components/states';
import { api } from '../../lib/api';
import { errorMessage } from '../../lib/format';
import { useSession } from '../../lib/session';

export function OAuthCallback() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const restore = async () => {
      try {
        const user = await api.me();
        signIn({ expiresIn: 24 * 60 * 60, user });
        const onboarding = params.get('onboarding') === '1';
        navigate(onboarding ? '/signup/oauth' : '/feed', { replace: true });
      } catch (reason) {
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
