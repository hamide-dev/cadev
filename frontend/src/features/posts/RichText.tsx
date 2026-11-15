import { Link } from 'react-router-dom';
import { CodeBlock } from './CodeBlock';

// Liens détectés automatiquement (http://, https://, www.), sans la ponctuation qui les suit.
const URL_SOURCE = String.raw`(?:https?:\/\/|www\.)[^\s<>"]+[^\s<>".,;:!?)\]'»]`;
const URL_SPLIT = new RegExp(`(${URL_SOURCE})`, 'g');
const INLINE_SPLIT = new RegExp(`(\`[^\`\\n]+\`|@[a-zA-Z0-9_]{3,20}|${URL_SOURCE})`, 'g');
const IS_URL = /^(https?:\/\/|www\.)/;

export function ExternalLink({ url }: { url: string }) {
  const href = url.startsWith('http') ? url : `https://${url}`;
  const label = url.replace(/^https?:\/\/(www\.)?/, '');
  return (
    <a href={href} target="_blank" rel="noopener noreferrer nofollow" className="link-accent" onClick={(event) => event.stopPropagation()}>
      {label.length > 48 ? `${label.slice(0, 45)}…` : label}
    </a>
  );
}

// Texte simple (bio, messages) : seuls les liens deviennent cliquables.
export function Linkify({ text }: { text: string }) {
  return <>{text.split(URL_SPLIT).map((part, i) => (IS_URL.test(part) ? <ExternalLink key={i} url={part} /> : part))}</>;
}

export function firstUrl(text: string): string | null {
  const match = text.match(new RegExp(URL_SOURCE));
  return match ? (match[0].startsWith('http') ? match[0] : `https://${match[0]}`) : null;
}

// Texte d'une publication : blocs ```code```, `extraits`, @mentions et liens mis en valeur.
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/```([\w-]*)\n?([\s\S]*?)```/g);
  if (blocks.length === 1) return <Inline text={text} />;
  return (
    <div className="stack-s">
      {blocks.map((block, i) => {
        if (i % 3 === 0) return block.trim() && <Inline key={i} text={block.trim()} />;
        if (i % 3 === 1) return null;
        const language = blocks[i - 1]?.trim();
        return <CodeBlock key={i} code={block.trimEnd()} language={language || undefined} />;
      })}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(INLINE_SPLIT);
  return (
    <p className="post-text">
      {parts.map((part, i) =>
        !part ? null : IS_URL.test(part) ? (
          <ExternalLink key={i} url={part} />
        ) : part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
          <code key={i}>{part.slice(1, -1)}</code>
        ) : part.startsWith('@') ? (
          <Link key={i} to={`/u/${part.slice(1)}`} className="link-accent" onClick={(event) => event.stopPropagation()}>
            {part}
          </Link>
        ) : (
          part
        ),
      )}
    </p>
  );
}
