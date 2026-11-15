import { BadRequestException, Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string;
}

const TIMEOUT_MS = 5_000;
const MAX_BYTES = 512 * 1024;
const MAX_REDIRECTS = 3;
const CACHE_MS = 60 * 60 * 1000;
const CACHE_MAX = 500;

// Adresses réservées : le serveur ne doit jamais aller lire son propre réseau (protection SSRF).
function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 6) {
    const a = address.toLowerCase();
    if (a === '::1' || a === '::' || a.startsWith('fc') || a.startsWith('fd') || a.startsWith('fe80')) return true;
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? isPrivateAddress(mapped[1]!) : false;
  }
  const [a = 0, b = 0] = address.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224
  );
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

function meta(html: string, ...names: string[]): string | null {
  for (const name of names) {
    const escaped = name.replace(/[:.]/g, '\\$&');
    const byProp = new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]*content=["']([^"']*)["']`, 'i').exec(html);
    const byContent = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${escaped}["']`, 'i').exec(html);
    const value = byProp?.[1] ?? byContent?.[1];
    if (value) return decodeEntities(value).slice(0, 300);
  }
  return null;
}

@Injectable()
export class LinkPreviewService {
  private readonly cache = new Map<string, { at: number; preview: LinkPreview }>();

  async getPreview(rawUrl: string): Promise<LinkPreview> {
    const url = this.parse(rawUrl);
    const key = url.toString();
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.preview;

    const preview = await this.fetchPreview(url);
    if (this.cache.size >= CACHE_MAX) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, { at: Date.now(), preview });
    return preview;
  }

  private parse(rawUrl: string): URL {
    let url: URL;
    try {
      url = new URL(rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`);
    } catch {
      throw new BadRequestException({ code: 'INVALID_URL', message: 'This link is not valid.' });
    }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) {
      throw new BadRequestException({ code: 'INVALID_URL', message: 'This link is not valid.' });
    }
    url.hash = '';
    return url;
  }

  private async assertPublicHost(url: URL) {
    const host = url.hostname.replace(/^\[|\]$/g, '');
    if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) {
      throw new BadRequestException({ code: 'URL_NOT_ALLOWED', message: 'This link cannot be previewed.' });
    }
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
    if (!addresses.length || addresses.some(({ address }) => isPrivateAddress(address))) {
      throw new BadRequestException({ code: 'URL_NOT_ALLOWED', message: 'This link cannot be previewed.' });
    }
  }

  private async fetchPreview(start: URL): Promise<LinkPreview> {
    let url = start;
    let response: Response | null = null;
    for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
      await this.assertPublicHost(url);
      response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': 'HelloWorldLinkPreview/1.0', accept: 'text/html,application/xhtml+xml' },
      }).catch(() => null);
      if (!response) break;
      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        url = this.parse(new URL(location, url).toString());
        continue;
      }
      break;
    }

    const fallback: LinkPreview = { url: url.toString(), title: null, description: null, image: null, siteName: url.hostname.replace(/^www\./, '') };
    if (!response?.ok || !(response.headers.get('content-type') ?? '').includes('html') || !response.body) return fallback;

    // Lecture plafonnée : seuls les premiers Ko (le <head>) nous intéressent.
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (size < MAX_BYTES) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      size += value.byteLength;
      if (new TextDecoder().decode(value).includes('</head>')) break;
    }
    await reader.cancel().catch(() => undefined);
    const html = new TextDecoder().decode(Buffer.concat(chunks));

    const title = meta(html, 'og:title', 'twitter:title') ?? (/<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1] ? decodeEntities(/<title[^>]*>([^<]*)<\/title>/i.exec(html)![1]!).slice(0, 300) : null);
    const imageRaw = meta(html, 'og:image', 'og:image:url', 'twitter:image');
    let image: string | null = null;
    if (imageRaw) {
      try {
        const resolved = new URL(imageRaw, url);
        if (resolved.protocol === 'https:') image = resolved.toString();
      } catch {
        image = null;
      }
    }
    return {
      url: url.toString(),
      title,
      description: meta(html, 'og:description', 'twitter:description', 'description'),
      image,
      siteName: meta(html, 'og:site_name') ?? fallback.siteName,
    };
  }
}
