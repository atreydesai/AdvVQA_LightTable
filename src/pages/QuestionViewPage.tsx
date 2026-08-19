import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import TimelineScrubber from '../components/TimelineScrubber';
import VerdictBadge from '../components/VerdictBadge';
import DiffView from '../components/DiffView';
import { getSessionHistory, prefetchImages } from '../services/versioning';
import type { SessionHistory, Slot, TimelineKind } from '../types';
import { contentSlots, filterTimeline, slotLabel, stateAt } from '../utils/timeline';
import type { SlotVisualState } from '../utils/timeline';

type ViewMode = 'regular' | 'broad';

export default function QuestionViewPage() {
  const { sessionId = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const view: ViewMode = params.get('view') === 'broad' ? 'broad' : 'regular';

  const [history, setHistory] = useState<SessionHistory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hidden, setHidden] = useState<Set<TimelineKind>>(new Set());
  const [index, setIndex] = useState<number | null>(null); // null = latest
  const [scrubbing, setScrubbing] = useState(false);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    const { cachedPromise, fresh } = getSessionHistory(sessionId);
    cachedPromise.then((cached) => {
      if (alive && cached) setHistory((h) => h ?? cached);
    });
    fresh
      .then((data) => {
        if (alive) setHistory(data);
      })
      .catch(() => {
        if (alive) setError('Could not load this question.');
      });
    return () => {
      alive = false;
    };
  }, [sessionId]);

  // Warm the browser cache with every image revision the slider can reach.
  useEffect(() => {
    if (!history) return;
    prefetchImages(history.timeline.filter((e) => e.kind === 'image').map((e) => e.image_url));
    prefetchImages([history.session.source_image?.url]);
  }, [history]);

  const entries = useMemo(
    () => (history ? filterTimeline(history.timeline, hidden) : []),
    [history, hidden],
  );
  const clampedIndex = index === null ? entries.length - 1 : Math.max(0, Math.min(entries.length - 1, index));
  const entry = entries[clampedIndex] ?? null;
  const atLatest = clampedIndex === entries.length - 1;

  const slotStates = useMemo(
    () => (history ? stateAt(history, atLatest ? null : entry) : new Map()),
    [history, entry, atLatest],
  );

  const slots = history ? contentSlots(history.session.slots) : [];
  const active = activeSlot !== null ? slots.find((s) => s.slot_index === activeSlot) ?? slots[0] : slots[0];

  const handleChange = useCallback(
    (i: number, isScrubbing: boolean) => {
      setIndex(i);
      setScrubbing(isScrubbing);
    },
    [],
  );

  const toggleKind = (kind: TimelineKind) => {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
    setIndex(null); // re-anchor at latest after a filter change
  };

  // Global keyboard: arrows step time, digits pick subparts.
  const entriesRef = useRef(entries.length);
  entriesRef.current = entries.length;
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const target = ev.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') {
        ev.preventDefault();
        const delta = ev.key === 'ArrowLeft' ? -1 : 1;
        setScrubbing(false);
        setIndex((cur) => {
          const base = cur === null ? entriesRef.current - 1 : cur;
          return Math.max(0, Math.min(entriesRef.current - 1, base + delta));
        });
      } else if (/^[1-9]$/.test(ev.key)) {
        const pos = Number(ev.key) - 1;
        setActiveSlot((_) => {
          const s = contentSlots(historyRef.current?.session.slots ?? [])[pos];
          return s ? s.slot_index : _;
        });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const historyRef = useRef(history);
  historyRef.current = history;

  if (error) {
    return (
      <div className="page">
        <p style={{ color: 'var(--bad)' }}>{error}</p>
        <Link to="/">← Back to questions</Link>
      </div>
    );
  }
  if (!history) {
    return (
      <div className="page">
        <p className="muted">Loading question history…</p>
      </div>
    );
  }

  const session = history.session;
  const firstState = history.first_state;
  const firstSlotText = (slot: Slot) =>
    firstState?.slots.find((s) => s.slot_index === slot.slot_index)?.text_clue ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 52px)' }}>
      <div className="page" style={{ flex: 1, paddingBottom: 24 }}>
        {/* header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <Link to="/" className="small">
            ◂ Questions
          </Link>
          <span className="mono small faint">{session.session_id.slice(0, 8)}</span>
          <span className="status-pill plain">{session.question_type ?? 'standard'}</span>
          <span
            className={`status-pill ${session.edit_state === 'finalized' ? 'finalized' : session.status ?? 'plain'}`}
          >
            {session.edit_state === 'finalized' ? 'finalized' : session.status}
          </span>
          {session.username && <span className="small muted">by {session.username}</span>}
          <div className="spacer" style={{ flex: 1 }} />
          <div className="seg">
            <button
              className={view === 'regular' ? 'on' : ''}
              onClick={() => setParams({ view: 'regular' }, { replace: true })}
            >
              Regular
            </button>
            <button
              className={view === 'broad' ? 'on' : ''}
              onClick={() => setParams({ view: 'broad' }, { replace: true })}
            >
              Broad
            </button>
          </div>
        </div>

        {/* answer line */}
        <div style={{ marginBottom: 18 }}>
          <span className="label">Answer</span>{' '}
          <strong style={{ fontSize: 17 }}>{session.answer || '—'}</strong>
          {session.question && (
            <span className="muted" style={{ marginLeft: 12 }}>
              {session.question}
            </span>
          )}
        </div>

        {view === 'regular' ? (
          <RegularView
            slots={slots}
            session={session}
            active={active}
            setActiveSlot={setActiveSlot}
            slotStates={slotStates}
            scrubbing={scrubbing}
            firstSlotText={firstSlotText}
            firstQuestion={firstState?.question ?? null}
            hasFirstState={Boolean(firstState)}
          />
        ) : (
          <BroadView
            slots={slots}
            session={session}
            slotStates={slotStates}
            scrubbing={scrubbing}
            setActiveSlot={(i) => {
              setActiveSlot(i);
              setParams({ view: 'regular' }, { replace: true });
            }}
          />
        )}
      </div>

      <TimelineScrubber
        entries={entries}
        index={clampedIndex}
        onChange={handleChange}
        hidden={hidden}
        onToggleKind={toggleKind}
      />
    </div>
  );
}

/* ---------------- regular view ---------------- */

function RegularView(props: {
  slots: Slot[];
  session: SessionHistory['session'];
  active: Slot | undefined;
  setActiveSlot: (i: number) => void;
  slotStates: Map<number, SlotVisualState>;
  scrubbing: boolean;
  firstSlotText: (slot: Slot) => string | null;
  firstQuestion: string | null;
  hasFirstState: boolean;
}) {
  const { slots, session, active, setActiveSlot, slotStates, scrubbing, firstSlotText, hasFirstState } = props;
  const st = active ? slotStates.get(active.slot_index) : undefined;

  return (
    <>
      <div className="seg" role="tablist" style={{ marginBottom: 16 }}>
        {slots.map((slot) => {
          const s = slotStates.get(slot.slot_index);
          const dotClass = !s?.verdict
            ? 'none'
            : s.verdict.is_abstain
              ? 'abstain'
              : s.verdict.is_correct
                ? 'ok'
                : 'bad';
          return (
            <button
              key={slot.slot_index}
              role="tab"
              aria-selected={active?.slot_index === slot.slot_index}
              className={active?.slot_index === slot.slot_index ? 'on' : ''}
              onClick={() => setActiveSlot(slot.slot_index)}
            >
              <i className={`dot ${dotClass}`} />
              {slotLabel(slot, session.slots, session.question_type)}
            </button>
          );
        })}
      </div>

      {active && (
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20, alignItems: 'start' }}>
          <div>
            <div
              className={`frame${scrubbing ? '' : ' animate'}`}
              style={{ minHeight: 420, maxHeight: 'calc(100vh - 380px)' }}
            >
              {st?.imageUrl ? (
                <img key={st.imageUrl} src={st.imageUrl} alt={`Subpart ${active.slot_index} at current time`} />
              ) : (
                <span className="empty">No image yet at this point in time</span>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, alignItems: 'center' }}>
              <span className={`rev-chip${st?.justChanged ? ' changed' : ''}`}>
                {st && st.totalRevisions > 0 ? `rev ${st.revision}/${st.totalRevisions}` : 'no revisions'}
              </span>
              <VerdictBadge verdict={st?.verdict ?? null} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="panel" style={{ padding: '14px 16px' }}>
              <div className="label" style={{ marginBottom: 6 }}>
                Clue (final)
              </div>
              <div>{active.text_clue || <span className="faint">No clue text.</span>}</div>
              {active.answer && (
                <div className="small muted" style={{ marginTop: 8 }}>
                  Part answer: <strong>{active.answer}</strong>
                </div>
              )}
            </div>

            <DiffView
              title={`Clue · ${slotLabel(active, session.slots, session.question_type)}`}
              first={hasFirstState ? (firstSlotText(active) ?? '') : active.text_clue}
              final={active.text_clue ?? ''}
            />
            {!hasFirstState && (
              <p className="faint small">
                No authored snapshot exists for this question (it was never edited after submission), so first and
                final text are identical.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ---------------- broad view ---------------- */

function BroadView(props: {
  slots: Slot[];
  session: SessionHistory['session'];
  slotStates: Map<number, SlotVisualState>;
  scrubbing: boolean;
  setActiveSlot: (i: number) => void;
}) {
  const { slots, session, slotStates, scrubbing, setActiveSlot } = props;
  const cols = Math.min(Math.max(slots.length, 2), 5);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 16 }}>
      {slots.map((slot) => {
        const st = slotStates.get(slot.slot_index);
        const dotClass = !st?.verdict
          ? 'none'
          : st.verdict.is_abstain
            ? 'abstain'
            : st.verdict.is_correct
              ? 'ok'
              : 'bad';
        return (
          <div key={slot.slot_index} className="panel" style={{ overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                borderBottom: '1px solid var(--hairline)',
              }}
            >
              <button
                onClick={() => setActiveSlot(slot.slot_index)}
                style={{ border: 'none', background: 'none', fontWeight: 600, fontSize: 13, padding: 0 }}
                title="Open in regular view"
              >
                <i className={`dot ${dotClass}`} style={{ marginRight: 6 }} />
                {slotLabel(slot, session.slots, session.question_type)}
              </button>
              <span className={`rev-chip${st?.justChanged ? ' changed' : ''}`}>
                {st && st.totalRevisions > 0 ? `rev ${st.revision}/${st.totalRevisions}` : '—'}
              </span>
            </div>
            <div
              className={`frame${scrubbing ? '' : ' animate'}`}
              style={{ border: 'none', borderRadius: 0, minHeight: 220, maxHeight: 320 }}
              title={slot.text_clue ?? undefined}
            >
              {st?.imageUrl ? (
                <img key={st.imageUrl} src={st.imageUrl} alt={`Subpart ${slot.slot_index} at current time`} />
              ) : (
                <span className="empty">No image yet</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
