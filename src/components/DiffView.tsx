import { wordDiff, hasChanges } from '../utils/diff';

interface Props {
  title: string;
  first?: string | null;
  final?: string | null;
}

/** Git-style first→final diff with word-level highlights. */
export default function DiffView({ title, first, final }: Props) {
  const a = first ?? '';
  const b = final ?? '';
  const ops = wordDiff(a, b);
  const changed = hasChanges(ops);

  return (
    <div className="diff">
      <div className="diff-head">
        <span>{title}</span>
        <span>{changed ? 'first authored → final' : 'unchanged'}</span>
      </div>
      {!a && !b ? (
        <div className="dline unchanged-note">No text recorded.</div>
      ) : !changed ? (
        <div className="dline">{b}</div>
      ) : (
        <>
          <div className="dline del">
            -{' '}
            {ops
              .filter((op) => op.kind !== 'add')
              .map((op, i) => (op.kind === 'del' ? <mark key={i}>{op.text}</mark> : <span key={i}>{op.text}</span>))}
          </div>
          <div className="dline add">
            +{' '}
            {ops
              .filter((op) => op.kind !== 'del')
              .map((op, i) => (op.kind === 'add' ? <mark key={i}>{op.text}</mark> : <span key={i}>{op.text}</span>))}
          </div>
        </>
      )}
    </div>
  );
}
