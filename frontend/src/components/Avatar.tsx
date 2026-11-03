import { Link } from 'react-router-dom';
import { type Author } from '../lib/api';
import { initials } from '../lib/format';

const AVATAR_COLORS = ['#373737', '#1D4ED8', '#0B5F46', '#6D28D9', '#9A3412'];

export function Avatar({ user, size, link = true }: { user: Pick<Author, 'username' | 'displayName' | 'avatarUrl'>; size?: 's' | 'xl'; link?: boolean }) {
  const hash = [...user.username].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const content = user.avatarUrl ? (
    <img src={user.avatarUrl} alt="" loading="lazy" width={96} height={96} />
  ) : (
    initials(user.displayName)
  );
  const props = { className: `avatar ${size ?? ''}`, style: { background: AVATAR_COLORS[hash % AVATAR_COLORS.length] } };
  return link ? (
    <Link to={`/u/${user.username}`} {...props} aria-label={`Profil de ${user.displayName}`}>
      {content}
    </Link>
  ) : (
    <span {...props} aria-hidden="true">
      {content}
    </span>
  );
}
