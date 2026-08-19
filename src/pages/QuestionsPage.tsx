import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestions, getQuestionsCached } from '../services/versioning';
import type { QuestionRow } from '../types';
import { formatTime } from '../utils/timeline';

type SortKey = 'session_id' | 'question_type' | 'username' | 'status' | 'slot_count' | 'image_revisions' | 'last_updated';

export default function QuestionsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<QuestionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('last_updated');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  useEffect(() => {
    let alive = true;
    getQuestionsCached().then((cached) => {
      if (alive && cached && rows === null) setRows(cached);
    });
    getQuestions()
      .fresh.then((fresh) => {
        if (alive) setRows(fresh);
      })
      .catch(() => {
        if (alive) setError('Could not load the question index.');
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visible = useMemo(() => {
    let out = rows ?? [];
    if (typeFilter !== 'all') out = out.filter((r) => r.question_type === typeFilter);
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      out = out.filter((r) =>
        [r.question, r.answer, r.username, r.image_title, r.session_id, r.packet_name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)),
      );
    }
    const dir = sortDir;
    out = [...out].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
    return out;
  }, [rows, search, typeFilter, sortKey, sortDir]);

  const clickSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(key === 'last_updated' || key === 'image_revisions' ? -1 : 1);
    }
  };

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === 1 ? ' ↑' : ' ↓') : '');

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <input
          placeholder="Search question, answer, author, packet, id…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            font: 'inherit',
            fontSize: 13,
            padding: '6px 12px',
            border: '1px solid var(--hairline-strong)',
            borderRadius: 7,
            width: 380,
            background: 'var(--panel)',
          }}
        />
        <div className="seg">
          {['all', 'tossup', 'bonus', 'standard'].map((t) => (
            <button key={t} className={typeFilter === t ? 'on' : ''} onClick={() => setTypeFilter(t)}>
              {t === 'all' ? 'All' : t[0].toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <span className="faint small">{rows ? `${visible.length} of ${rows.length}` : 'Loading…'}</span>
      </div>

      {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}

      <div className="panel" style={{ overflow: 'hidden' }}>
        <table className="qtable">
          <thead>
            <tr>
              <th onClick={() => clickSort('session_id')}>ID{arrow('session_id')}</th>
              <th onClick={() => clickSort('question_type')}>Type{arrow('question_type')}</th>
              <th>Question / answer</th>
              <th onClick={() => clickSort('username')}>Author{arrow('username')}</th>
              <th onClick={() => clickSort('status')}>Status{arrow('status')}</th>
              <th onClick={() => clickSort('slot_count')}>Parts{arrow('slot_count')}</th>
              <th onClick={() => clickSort('image_revisions')}>Img revs{arrow('image_revisions')}</th>
              <th onClick={() => clickSort('last_updated')}>Last activity{arrow('last_updated')}</th>
            </tr>
          </thead>
          <tbody>
            {(visible ?? []).map((r) => (
              <tr key={r.session_id} onClick={() => navigate(`/q/${r.session_id}`)}>
                <td className="mono small">{r.session_id.slice(0, 8)}</td>
                <td>
                  <span className="status-pill plain">{r.question_type}</span>
                </td>
                <td className="q-ellipsis">
                  {r.answer ? <strong>{r.answer}</strong> : <span className="faint">—</span>}
                  {r.question ? <span className="muted"> · {r.question}</span> : null}
                </td>
                <td className="small">{r.username ?? '—'}</td>
                <td>
                  <span className={`status-pill ${r.edit_state === 'finalized' ? 'finalized' : r.status ?? 'plain'}`}>
                    {r.edit_state === 'finalized' ? 'finalized' : r.status ?? '—'}
                  </span>
                </td>
                <td className="mono small">{r.slot_count}</td>
                <td className="mono small">{r.image_revisions}</td>
                <td className="mono small">{formatTime(r.last_updated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows && visible.length === 0 && (
          <p className="muted" style={{ padding: 20 }}>
            No questions match.
          </p>
        )}
      </div>
    </div>
  );
}
