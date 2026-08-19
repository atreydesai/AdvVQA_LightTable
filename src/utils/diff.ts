export type DiffOp = { kind: 'same' | 'add' | 'del'; text: string };

/** Word-level diff via LCS. Clue texts are short, so O(n·m) is fine. */
export function wordDiff(a: string, b: string): DiffOp[] {
  const aw = tokenize(a);
  const bw = tokenize(b);
  const n = aw.length;
  const m = bw.length;

  const lcs: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = aw[i] === bw[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const ops: DiffOp[] = [];
  let i = 0;
  let j = 0;
  const push = (kind: DiffOp['kind'], text: string) => {
    const last = ops[ops.length - 1];
    if (last && last.kind === kind) last.text += text;
    else ops.push({ kind, text });
  };
  while (i < n && j < m) {
    if (aw[i] === bw[j]) {
      push('same', aw[i]);
      i++;
      j++;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      push('del', aw[i]);
      i++;
    } else {
      push('add', bw[j]);
      j++;
    }
  }
  while (i < n) {
    push('del', aw[i]);
    i++;
  }
  while (j < m) {
    push('add', bw[j]);
    j++;
  }
  return ops;
}

function tokenize(s: string): string[] {
  // words plus their trailing whitespace, so joins reconstruct the original
  return (s || '').match(/\S+\s*/g) ?? [];
}

export function hasChanges(ops: DiffOp[]): boolean {
  return ops.some((op) => op.kind !== 'same');
}
