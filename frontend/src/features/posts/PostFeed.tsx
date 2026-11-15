import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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
  const sentinel = useRef<HTMLDivElement>(null);

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

  // Un like, un épinglage ou une suppression mettent aussi à jour la copie gardée en mémoire :
  // en revenant sur le fil, on retrouve exactement ce qu'on a laissé.
  useEffect(() => {
    if (cacheKey && items) pageCache.set(cacheKey, { items, nextCursor: cursor, hasMore });
  }, [cacheKey, items, cursor, hasMore]);

  const loadMore = useCallback(async () => {
    if (more || !hasMore || !cursor) return;
    setMore(true);
    await fetchPage(cursor);
    setMore(false);
  }, [more, hasMore, cursor, fetchPage]);

  // Fil sans fin : la page suivante se charge quand on arrive à environ un écran du bas.
  useEffect(() => {
    const node = sentinel.current;
    if (!node || !hasMore) return;
    const observer = new IntersectionObserver((entries) => entries[0]?.isIntersecting && void loadMore(), { rootMargin: '0px 0px 900px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loadMore]);

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
        <div ref={sentinel} className="feed-more" aria-live="polite">
          {more ? <span className="spinner" aria-label="Chargement de la suite" /> : (
            <button type="button" className="btn btn-ghost btn-s" onClick={() => void loadMore()}>
              Voir plus de publications
            </button>
          )}
        </div>
      )}
      {!hasMore && items.length > 5 && <p className="feed-end">Tu es à jour. Reviens plus tard ou explore de nouveaux développeurs.</p>}
      {error && <p className="alert" style={{ margin: 16 }}>{error}</p>}
    </div>
  );
}
