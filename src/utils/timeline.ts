import type { SessionHistory, Slot, TimelineEntry, TimelineKind } from '../types';

/** Content slots = everything except the bonus stem pseudo-slot. */
export function contentSlots(slots: Slot[]): Slot[] {
  return slots.filter((s) => s.slot_kind !== 'question');
}

/** Hard / Mid / Easy labels for tossups; grouped labels for bonuses. */
export function slotLabel(slot: Slot, all: Slot[], questionType?: string): string {
  if (questionType === 'bonus') {
    const kind = slot.slot_kind === 'question' ? 'Stem' : slot.slot_kind === 'reveal' ? 'Reveal' : 'Part';
    return slot.subq_group != null && slot.subq_group > 0 ? `Q${slot.subq_group} ${kind}` : kind;
  }
  const content = contentSlots(all);
  const pos = content.findIndex((s) => s.slot_index === slot.slot_index);
  const total = content.length;
  if (total <= 1) return 'Clue';
  if (pos === 0) return 'Hard';
  if (pos === total - 1) return 'Easy';
  return total === 3 ? 'Mid' : `Mid ${pos}`;
}

export interface SlotVisualState {
  imageUrl: string | null;
  revision: number;
  totalRevisions: number;
  /** true when the current timeline entry is this slot's revision */
  justChanged: boolean;
  verdict: { model?: string | null; is_correct?: boolean | null; is_abstain?: boolean | null } | null;
  /** full timeline entry of the latest model run at/before t, trace included */
  lastRun: TimelineEntry | null;
}

/**
 * State of every slot at timeline position `idx` (an index into the FULL
 * unfiltered timeline). Comparison is by timestamp so mark filtering in the UI
 * never changes what "at this moment" means.
 */
export function stateAt(history: SessionHistory, entry: TimelineEntry | null): Map<number, SlotVisualState> {
  const t = entry?.t ?? '￿'; // no entry -> latest state
  const result = new Map<number, SlotVisualState>();

  for (const slot of history.session.slots) {
    const revisions = history.timeline.filter(
      (e) => e.kind === 'image' && e.slot_index === slot.slot_index,
    );
    let imageUrl: string | null = null;
    let revision = 0;
    let justChanged = false;
    for (const rev of revisions) {
      if (rev.t <= t) {
        imageUrl = rev.image_url ?? null;
        revision += 1;
        justChanged = entry != null && rev.t === entry.t && entry.kind === 'image' && entry.slot_index === slot.slot_index;
      }
    }

    let verdict: SlotVisualState['verdict'] = null;
    let lastRun: TimelineEntry | null = null;
    for (const run of history.timeline) {
      if (run.kind === 'vlm' && run.slot_index === slot.slot_index && run.t <= t && run.model) {
        verdict = { model: run.model, is_correct: run.is_correct, is_abstain: run.is_abstain };
        lastRun = run;
      }
    }

    result.set(slot.slot_index, {
      imageUrl,
      revision,
      totalRevisions: revisions.length,
      justChanged,
      verdict,
      lastRun,
    });
  }
  return result;
}

export function filterTimeline(timeline: TimelineEntry[], hidden: Set<TimelineKind>): TimelineEntry[] {
  return timeline.filter((e) => !hidden.has(e.kind));
}

export function formatTime(iso?: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z');
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
