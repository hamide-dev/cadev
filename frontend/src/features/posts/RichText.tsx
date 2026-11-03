import { Link } from 'react-router-dom';

// Texte d'une publication : blocs ```code```, `extraits` et @mentions mis en valeur.
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/```[\w-]*\n?([\s\S]*?)```/g);
  if (blocks.length === 1) return <Inline text={text} />;
  return (
    <div className="stack-s">
      {blocks.map((block, i) => (i % 2 ? <pre key={i} className="code">{block.trimEnd()}</pre> : block.trim() && <Inline key={i} text={block.trim()} />))}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  const parts = text.split(/(`[^`\n]+`|@[a-zA-Z0-9_]{3,20})/g);
  return (
    <p className="post-text">
      {parts.map((part, i) =>
        part.startsWith('`') && part.endsWith('`') && part.length > 2 ? (
          <code key={i}>{part.slice(1, -1)}</code>
        ) : part.startsWith('@') ? (
          <Link key={i} to={`/u/${part.slice(1)}`} className="link-accent">
            {part}
          </Link>
        ) : (
          part
        ),
      )}
    </p>
  );
}
