interface Props {
  verdict: { model?: string | null; is_correct?: boolean | null; is_abstain?: boolean | null } | null;
}

export default function VerdictBadge({ verdict }: Props) {
  if (!verdict) return <span className="verdict none">Not yet tested</span>;
  if (verdict.is_abstain) return <span className="verdict abstain">— Abstained · {verdict.model}</span>;
  if (verdict.is_correct) return <span className="verdict ok">✓ Correct · {verdict.model}</span>;
  return <span className="verdict bad">✕ Incorrect · {verdict.model}</span>;
}
