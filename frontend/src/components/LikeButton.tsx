import { useState, type CSSProperties } from 'react';
import { Icon } from './Icon';

// Compteur dont seuls les chiffres qui changent roulent : vers le haut quand il monte, vers le bas quand il baisse.
export function RollingCount({ value }: { value: number }) {
  // Valeur précédente gardée en état : quand le nombre change, on note d'où il vient.
  const [shown, setShown] = useState(value);
  const [from, setFrom] = useState(value);
  if (value !== shown) {
    setFrom(shown);
    setShown(value);
  }

  const now = String(value);
  const before = String(from);
  const width = Math.max(now.length, before.length);
  const a = now.padStart(width, ' ');
  const b = before.padStart(width, ' ');
  const dir = value >= from ? 'up' : 'down';

  return (
    <span className="roll" aria-label={now}>
      {[...a].map((char, i) => {
        const changed = from !== value && a[i] !== b[i];
        if (char === ' ' && !changed) return null;
        return (
          <span key={changed ? `${i}-${value}` : i} className="roll-digit" aria-hidden="true">
            <span className={changed ? `roll-in-${dir}` : undefined}>{char === ' ' ? '' : char}</span>
            {changed && b[i] !== ' ' && <span className={`roll-out-${dir}`}>{b[i]}</span>}
          </span>
        );
      })}
    </span>
  );
}

// Bouton j'aime : en aimant, le cœur se remplit en sautant, une petite gerbe part autour de lui
// et le compteur roule d'un cran. En retirant le j'aime, le cœur se vide et le compteur redescend.
export function LikeButton({ liked, count, onToggle, size = 20, className = 'action' }: {
  liked: boolean;
  count: number;
  onToggle: () => void;
  size?: number;
  className?: string;
}) {
  const [burst, setBurst] = useState(0);
  return (
    <button
      type="button"
      className={`${className} like`}
      aria-pressed={liked}
      aria-label={liked ? "Retirer le j'aime" : "J'aime"}
      onClick={(e) => {
        e.stopPropagation();
        if (!liked) setBurst((n) => n + 1);
        onToggle();
      }}
    >
      <span className="like-heart">
        <span key={liked ? `on-${burst}` : 'off'} className={`like-svg${liked && burst ? ' pop' : ''}`}>
          <Icon name="heart" size={size} />
        </span>
        {liked && burst > 0 && (
          <span key={burst} className="like-burst" aria-hidden="true">
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} style={{ '--a': `${i * 45 + 22}deg` } as CSSProperties} />
            ))}
          </span>
        )}
      </span>
      <RollingCount value={count} />
    </button>
  );
}
