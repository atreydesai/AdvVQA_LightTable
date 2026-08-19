import { MouseEvent, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getQuestions, getQuestionsCached } from '../services/versioning';
import type { QuestionRow } from '../types';

type SortKey = 'session_id' | 'question_type' | 'username' | 'status' | 'slot_count' | 'image_revisions' | 'last_updated';

const HIDDEN_KEY = 'lightTable.hiddenStatuses';
const TYPE_KEY = 'lightTable.typeFilter';

function loadHidden(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? '[]'));
  } catch {
    return new Set();
  }
}

/** The status shown in the table: finalized (post-edit) wins over raw status. */
function displayStatus(r: QuestionRow): string {
  return r.edit_state === 'finalized' ? 'finalized' : (r.status ?? 'unknown');
}

export default function QuestionsPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<QuestionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>(() => localStorage.getItem(TYPE_KEY) ?? 'all');
  const [hiddenStatuses, setHiddenStatuses] = useState<Set<string>>(loadHidden);
  const [sortKey, setSortKey] = useState<SortKey>('last_updated');
  const [sortDir, setSortDir] = useState<1 | -1>(-1);

  useEffect(() => {
    let alive = true;
    getQuestionsCached().then((cached) => {
      if (alive && cached) setRows((cur) => cur ?? cached);
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
  }, []);

  useEffect(() => {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hiddenStatuses]));
  }, [hiddenStatuses]);
  useEffect(() => {
    localStorage.setItem(TYPE_KEY, typeFilter);
  }, [typeFilter]);

  const statusCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows ?? []) {
      const s = displayStatus(r);
      counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const visible = useMemo(() => {
    let out = rows ?? [];
    if (typeFilter !== 'all') out = out.filter((r) => r.question_type === typeFilter);
    out = out.filter((r) => !hiddenStatuses.has(displayStatus(r)));
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      out = out.filter((r) =>
        [r.question, r.answer, r.username, r.image_title, r.session_id, r.packet_name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(needle)),
      );
    }
    const dir = sortDir;
    return [...out].sort((a, b) => {
      const av = a[sortKey] ?? '';
      const bv = b[sortKey] ?? '';
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, search, typeFilter, hiddenStatuses, sortKey, sortDir]);

  const clickSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      setSortDir(key === 'last_updated' || key === 'image_revisions' ? -1 : 1);
    }
  };

  const arrow = (key: SortKey) => (sortKey === key ? (sortDir === 1 ? ' ↑' : ' ↓') : '');

  const toggleStatus = (s: string) =>
    setHiddenStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const openRow = (ev: MouseEvent, id: string) => {
    const url = `/q/${id}`;
    if (ev.metaKey || ev.ctrlKey) window.open(url, '_blank');
    else navigate(url);
  };

  return (
    <div className="page" style={{ paddingBottom: 40 }}>
      <div className="toolbar">
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            className="search"
            placeholder="Search question, answer, author, packet, id…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          <span className="label">Status</span>
          {statusCounts.map(([s, count]) => (
            <button
              key={s}
              className={`chip${hiddenStatuses.has(s) ? ' off' : ''}`}
              onClick={() => toggleStatus(s)}
              title={hiddenStatuses.has(s) ? `Show ${s} questions` : `Hide ${s} questions`}
            >
              {s} <span className="mono">{count}</span>
            </button>
          ))}
          {hiddenStatuses.size > 0 && (
            <button className="chip clear" onClick={() => setHiddenStatuses(new Set())}>
              Clear all
            </button>
          )}
        </div>
      </div>

      {error && <p style={{ color: 'var(--bad)' }}>{error}</p>}

      <div className="panel table-panel">
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
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr
                key={r.session_id}
                onClick={(ev) => openRow(ev, r.session_id)}
                onAuxClick={(ev) => {
                  if (ev.button === 1) window.open(`/q/${r.session_id}`, '_blank');
                }}
              >
                <td className="mono small">
                  <a
                    href={`/q/${r.session_id}`}
                    onClick={(ev) => {
                      if (!ev.metaKey && !ev.ctrlKey) ev.preventDefault();
                      ev.stopPropagation();
                      openRow(ev, r.session_id);
                    }}
                    style={{ color: 'inherit' }}
                  >
                    {r.session_id.slice(0, 8)}
                  </a>
                </td>
                <td>
                  <span className="status-pill plain">{r.question_type}</span>
                </td>
                <td className="q-ellipsis">
                  {r.answer ? <strong>{r.answer}</strong> : <span className="faint">—</span>}
                  {r.question ? <span className="muted"> · {r.question}</span> : null}
                </td>
                <td className="small">{r.username ?? '—'}</td>
                <td>
                  <span className={`status-pill ${displayStatus(r)}`}>{displayStatus(r)}</span>
                </td>
                <td className="mono small">{r.slot_count}</td>
                <td className="mono small">{r.image_revisions}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows && visible.length === 0 && (
          <p className="muted" style={{ padding: 20 }}>
            No questions match the current filters.
          </p>
        )}
      </div>
    </div>
  );
}
