import { useEffect, useState } from 'react';
import { api, type LinkPreview } from '../../lib/api';

// Aperçu d'un lien, comme sur WhatsApp : titre, description et image de la page, sans avoir à l'ouvrir.
// Un aperçu demandé une fois est gardé pour toute la visite.
const cache = new Map<string, Promise<LinkPreview | null>>();

function load(url: string) {
  if (!cache.has(url)) cache.set(url, api.linkPreview(url).catch(() => null));
  return cache.get(url)!;
}

export function LinkPreviewCard({ url }: { url: string }) {
  const [preview, setPreview] = useState<LinkPreview | null>(null);
  const [imageOk, setImageOk] = useState(true);

  useEffect(() => {
    let alive = true;
    void load(url).then((value) => alive && setPreview(value));
    return () => {
      alive = false;
    };
  }, [url]);

  if (!preview || (!preview.title && !preview.description)) return null;
  return (
    <a href={preview.url} target="_blank" rel="noopener noreferrer nofollow" className="link-card" onClick={(event) => event.stopPropagation()}>
      {preview.image && imageOk && <img src={preview.image} alt="" loading="lazy" onError={() => setImageOk(false)} />}
      <span className="link-card-body">
        <span className="link-card-site">{preview.siteName}</span>
        {preview.title && <span className="link-card-title">{preview.title}</span>}
        {preview.description && <span className="link-card-desc">{preview.description}</span>}
      </span>
    </a>
  );
}
