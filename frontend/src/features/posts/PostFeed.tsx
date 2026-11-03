import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { ErrorState, Loading } from '../../components/states';
import { PostCard } from './PostCard';
import { type Post } from '../../lib/api';
import { errorMessage } from '../../lib/format';

// Liste paginée par curseur, partagée par les fils et le profil.
export function PostFeed({ load, empty }: { load: (cursor?: string | null) => Promise<{ items: Post[]; nextCursor: string | null; hasMore: boolean }>; empty: ReactNode }) {
  const [items, setItems] = useState<Post[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  const fetchPage = useCallback(
    async (from: string | null) => {
      setError(null);
      try {
        const page = await load(from);
        setItems((prev) => (from && prev ? [...prev, ...page.items] : page.items));
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (err) {
        setError(errorMessage(err));
      }
    },
    [load],
  );

  useEffect(() => {
    setItems(null);
    fetchPage(null);
  }, [fetchPage]);

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
