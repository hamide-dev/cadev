import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ErrorState, Loading } from '../../components/states';
import { PostCard } from './PostCard';
import { type Post } from '../../lib/api';
import { errorMessage } from '../../lib/format';

type FeedPage = { items: Post[]; nextCursor: string | null; hasMore: boolean };

// Dernière première page vue par fil : au retour sur un écran, elle s'affiche tout de suite puis se met à jour.
const pageCache = new Map<string, FeedPage>();

// Liste paginée par curseur, partagée par les fils et le profil.
export function PostFeed({ load, empty, cacheKey }: { load: (cursor?: string | null) => Promise<FeedPage>; empty: ReactNode; cacheKey?: string }) {
  const cached = cacheKey ? pageCache.get(cacheKey) : undefined;
  const [items, setItems] = useState<Post[] | null>(cached?.items ?? null);
  const [cursor, setCursor] = useState<string | null>(cached?.nextCursor ?? null);
  const [hasMore, setHasMore] = useState(cached?.hasMore ?? false);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  const fetchPage = useCallback(
    async (from: string | null) => {
      setError(null);
      try {
        const page = await load(from);
        if (!from && cacheKey) pageCache.set(cacheKey, page);
        setItems((prev) => (from && prev ? [...prev, ...page.items] : page.items));
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (err) {
        setError(errorMessage(err));
      }
    },
    [load, cacheKey],
  );

  useEffect(() => {
    if (!cacheKey || !pageCache.has(cacheKey)) setItems(null);
    fetchPage(null);
  }, [fetchPage, cacheKey]);

  if (error && !items) return <ErrorState message={error} onRetry={() => fetchPage(null)} />;
  if (!items) return <Loading />;
  if (items.length === 0) return <>{empty}</>;
  return (
    <div>
      {items.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          onChange={(next) => setItems((list) => list!.map((p) => (p.id === next.id ? next : p)))}
          onDelete={(id) => setItems((list) => list!.filter((p) => p.id !== id))}
        />
      ))}
      {hasMore && (
        <div className="pad" style={{ padding: 16 }}>
          <button
            type="button"
            className="btn btn-block"
            disabled={more}
            onClick={async () => {
              setMore(true);
              await fetchPage(cursor);
              setMore(false);
            }}
          >
            {more ? <span className="spinner" aria-label="Chargement" /> : 'Voir plus de publications'}
          </button>
        </div>
      )}
      {error && <p className="alert" style={{ margin: 16 }}>{error}</p>}
    </div>
  );
}
