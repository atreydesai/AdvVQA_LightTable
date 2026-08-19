import { useCallback, useEffect, useRef, useState } from 'react';
import type { TimelineEntry, TimelineKind } from '../types';
import { formatTime } from '../utils/timeline';

interface Props {
  entries: TimelineEntry[]; // already filtered
  index: number; // position within `entries`
  onChange: (index: number, scrubbing: boolean) => void;
  hidden: Set<TimelineKind>;
  onToggleKind: (kind: TimelineKind) => void;
}

const KIND_LABEL: Record<TimelineKind, string> = {
  image: 'Image revisions',
  text: 'Clue changes',
  vlm: 'Model runs',
  milestone: 'Milestones',
};

export default function TimelineScrubber({ entries, index, onChange, hidden, onToggleKind }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const n = entries.length;
  const clamped = Math.max(0, Math.min(n - 1, index));
  const pct = n > 1 ? (clamped / (n - 1)) * 100 : 100;
  const entry = entries[clamped] ?? null;
  const indexRef = useRef(clamped);
  indexRef.current = clamped;

  const posFromClient = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || n < 2) return 0;
      const r = el.getBoundingClientRect();
      return Math.round(((clientX - r.left) / r.width) * (n - 1));
    },
    [n],
  );

  useEffect(() => {
    if (!dragging) return;
    const move = (ev: PointerEvent) => onChange(posFromClient(ev.clientX), true);
    const up = () => {
      setDragging(false);
      onChange(indexRef.current, false); // settle: re-enable crossfade
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
  }, [dragging, onChange, posFromClient]);

  const step = (delta: number) => onChange(clamped + delta, false);

  const onKeyDown = (ev: React.KeyboardEvent) => {
    if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      if (ev.shiftKey) onChange(prevMilestone(entries, clamped), false);
      else step(-1);
    } else if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      if (ev.shiftKey) onChange(nextMilestone(entries, clamped), false);
      else step(1);
    } else if (ev.key === 'Home') {
      ev.preventDefault();
      onChange(0, false);
    } else if (ev.key === 'End') {
      ev.preventDefault();
      onChange(n - 1, false);
    }
  };

  // The whole zone is draggable: press anywhere jumps there and starts a drag.
  const startDrag = (ev: React.PointerEvent) => {
    ev.preventDefault();
    onChange(posFromClient(ev.clientX), true);
    setDragging(true);
  };

  return (
    <div className="scrubber">
      <div className="track-zone" onPointerDown={startDrag}>
        <div className="track" ref={trackRef}>
          <div className="track-fill" style={{ width: `${pct}%` }} />
          {entries.map((e, i) => (
            <button
              key={`${e.t}-${i}`}
              className={`tmark m-${e.kind}`}
              style={{ left: n > 1 ? `${(i / (n - 1)) * 100}%` : '100%' }}
              title={`${e.label} · ${formatTime(e.t)}`}
              aria-label={e.label}
              tabIndex={-1}
            />
          ))}
          <button
            className="playhead"
            style={{ left: `${pct}%` }}
            role="slider"
            aria-label="Timeline position"
            aria-valuemin={0}
            aria-valuemax={Math.max(0, n - 1)}
            aria-valuenow={clamped}
            aria-valuetext={entry?.label}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
      <div className="readout">
        <span style={{ display: 'inline-flex', alignItems: 'center' }}>
          <span className="steps">
            <button
              className="step-btn"
              onClick={() => step(-1)}
              disabled={clamped <= 0}
              title="Step back (←)"
              aria-label="Step back"
            >
              ‹
            </button>
            <button
              className="step-btn"
              onClick={() => step(1)}
              disabled={clamped >= n - 1}
              title="Step forward (→)"
              aria-label="Step forward"
            >
              ›
            </button>
          </span>
          <span className="evt">
            {entry ? entry.label : 'No events'}
            {entry?.slot_index != null && <span className="faint"> · subpart {entry.slot_index}</span>}
            {entry?.username && <span className="faint"> · {entry.username}</span>}
          </span>
        </span>
        <div className="filters">
          {(Object.keys(KIND_LABEL) as TimelineKind[]).map((kind) => (
            <label key={kind}>
              <input type="checkbox" checked={!hidden.has(kind)} onChange={() => onToggleKind(kind)} />
              <i
                className={`legend-swatch${kind === 'milestone' ? ' sq' : ''}`}
                style={{ background: `var(--mark-${kind})` }}
              />
              {KIND_LABEL[kind]}
            </label>
          ))}
        </div>
        <span className="time">
          {entry ? formatTime(entry.t) : ''} · {n === 0 ? 0 : clamped + 1}/{n}
        </span>
      </div>
    </div>
  );
}

function prevMilestone(entries: TimelineEntry[], from: number): number {
  for (let i = from - 1; i >= 0; i--) if (entries[i].kind === 'milestone') return i;
  return 0;
}

function nextMilestone(entries: TimelineEntry[], from: number): number {
  for (let i = from + 1; i < entries.length; i++) if (entries[i].kind === 'milestone') return i;
  return entries.length - 1;
}
