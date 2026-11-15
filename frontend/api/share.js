// Aperçus de partage (WhatsApp, Facebook, X, LinkedIn, Telegram, Discord…).
// Ces robots n'exécutent pas le JavaScript de l'application : vercel.json leur envoie cette fonction,
// qui renvoie une page avec les balises Open Graph du profil, de la publication ou du projet partagé.
// Les visiteurs humains ne passent jamais par ici.

const API = (process.env.HW_API_ORIGIN || 'https://cadev-1.onrender.com').replace(/\/$/, '');
// Même clé publique que celle intégrée au navigateur (voir src/lib/api/client.ts).
const API_KEY = process.env.VITE_API_KEY || process.env.FRONTEND_API_KEY || 'b4f7b88eff2a716ce8c2b0f045c38a37c00cc6959a2df30f970f9c5a2e487d9b';
const SITE = 'Hello World';
const TAGLINE = 'Le réseau social des bâtisseurs : partage ce que tu codes, trouve ton équipe et fais-toi repérer en Afrique.';
const SPECIALTIES = { FRONT_END: 'Front-end', BACK_END: 'Back-end', FULL_STACK: 'Full-stack', MOBILE: 'Mobile', DATA_AI: 'Data/IA', DEVOPS: 'DevOps', VIBE_CODING: 'Vibe coding' };
const LEVELS = { LEARNING: 'En apprentissage', JUNIOR: 'Junior', CONFIRMED: 'Confirmé', SENIOR: 'Senior' };

const escape = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const clip = (value, max) => {
  const text = String(value ?? '').replace(/```[\s\S]*?```/g, ' ').replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
};

async function get(path) {
  const response = await fetch(`${API}/api/v1${path}`, { headers: { 'x-api-key': API_KEY }, signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function githubImage(url) {
  const match = /github\.com\/([\w.-]+)\/([\w.-]+)/.exec(url || '');
  return match ? `https://opengraph.githubassets.com/1/${match[1]}/${match[2].replace(/\.git$/, '')}` : null;
}

async function describe(type, id, origin) {
  const fallback = { title: `${SITE} · by Viso Studio`, description: TAGLINE, image: `${origin}/og.png`, large: true };
  if (!id) return fallback;
  try {
    if (type === 'user') {
      const user = await get(`/users/${encodeURIComponent(id)}`);
      const role = [SPECIALTIES[user.specialty], LEVELS[user.experienceLevel]].filter(Boolean).join(' · ');
      const stats = `${user.followerCount ?? 0} abonnés · ${user.postCount ?? 0} publications`;
      return {
        title: `${user.displayName} (@${user.username}) sur ${SITE}`,
        description: clip([role, user.bio, stats].filter(Boolean).join(' — '), 200),
        image: user.avatarUrl || user.bannerUrl || fallback.image,
        large: !user.avatarUrl && !user.bannerUrl ? true : Boolean(user.bannerUrl && !user.avatarUrl),
      };
    }
    if (type === 'post') {
      const post = await get(`/posts/${encodeURIComponent(id)}`);
      const kind = post.type === 'QUESTION' ? 'Question' : post.type === 'PROJECT_LAUNCH' ? 'Projet' : 'Publication';
      const media = (post.attachments || []).find((m) => m.resourceType === 'image');
      return {
        title: `${kind} de ${post.author.displayName} sur ${SITE}`,
        description: clip(`${post.content}${post.tags?.length ? ` · #${post.tags.join(' #')}` : ''}`, 200) || TAGLINE,
        image: media?.url || githubImage(post.content) || post.author.avatarUrl || fallback.image,
        large: Boolean(media || githubImage(post.content)) || !post.author.avatarUrl,
      };
    }
    if (type === 'project') {
      const project = await get(`/projects/${encodeURIComponent(id)}`);
      const tags = (project.technologies || []).slice(0, 4).join(' · ');
      return {
        title: `${project.name} · projet open source sur ${SITE}`,
        description: clip([project.description, tags, project.isBeginnerFriendly ? 'Débutants bienvenus' : null].filter(Boolean).join(' — '), 200),
        image: githubImage(project.repositoryUrl) || fallback.image,
        large: true,
      };
    }
  } catch {
    // Contenu introuvable ou API indisponible : l'aperçu général du site reste propre.
  }
  return fallback;
}

export default async function handler(req, res) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'www.hello-world.ci';
  const origin = `https://${host}`;
  const type = String(req.query.type || '');
  const id = String(req.query.id || '');
  const path = type === 'user' ? `/u/${id}` : type === 'post' ? `/post/${id}` : type === 'project' ? `/projects/${id}` : '/';
  const url = `${origin}${path}`;
  const meta = await describe(type, id, origin);

  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('cache-control', 'public, max-age=0, s-maxage=600, stale-while-revalidate=86400');
  res.status(200).send(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escape(meta.title)}</title>
<meta name="description" content="${escape(meta.description)}" />
<link rel="canonical" href="${escape(url)}" />
<meta property="og:site_name" content="${SITE}" />
<meta property="og:locale" content="fr_FR" />
<meta property="og:type" content="${type === 'user' ? 'profile' : type === 'post' ? 'article' : 'website'}" />
<meta property="og:title" content="${escape(meta.title)}" />
<meta property="og:description" content="${escape(meta.description)}" />
<meta property="og:url" content="${escape(url)}" />
<meta property="og:image" content="${escape(meta.image)}" />
<meta name="twitter:card" content="${meta.large ? 'summary_large_image' : 'summary'}" />
<meta name="twitter:title" content="${escape(meta.title)}" />
<meta name="twitter:description" content="${escape(meta.description)}" />
<meta name="twitter:image" content="${escape(meta.image)}" />
<meta name="theme-color" content="#141414" />
</head>
<body><h1>${escape(meta.title)}</h1><p>${escape(meta.description)}</p><p><a href="${escape(url)}">Ouvrir dans Hello World</a></p></body>
</html>`);
}
