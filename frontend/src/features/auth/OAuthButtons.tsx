import { GitHubLogo, GoogleLogo } from '../../components/Icon';
import { api } from '../../lib/api';

export function OAuthButtons() {
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
