import type { TimelineEntry } from '../types';
import { formatTime } from '../utils/timeline';

/** Expandable trace of the latest model run at the current playhead. */
export default function ModelTrace({ run }: { run: TimelineEntry | null }) {
  if (!run) return null;
  return (
    <details className="trace">
      <summary>
        Model trace · {run.model}
        <span className="faint"> · {formatTime(run.t)}</span>
      </summary>
      <div className="trace-body">
        <TraceRow label="Answer" value={run.answer_text} />
        {run.normalized_answer && run.normalized_answer !== run.answer_text && (
          <TraceRow label="Normalized" value={run.normalized_answer} />
        )}
        <TraceRow label="Decision" value={run.decision} />
        {run.confidence != null && <TraceRow label="Confidence" value={String(run.confidence)} />}
        {run.reasoning && <TraceRow label="Reasoning" value={run.reasoning} block />}
        {run.response_text && run.response_text !== run.reasoning && (
          <TraceRow label="Full response" value={run.response_text} block />
        )}
        {run.error && <TraceRow label="Error" value={run.error} block />}
        <div className="trace-meta">
          {run.latency_ms != null && <span>{run.latency_ms} ms</span>}
          {run.prompt_version && <span>prompt {run.prompt_version}</span>}
          {run.status && <span>{run.status}</span>}
        </div>
      </div>
    </details>
  );
}

function TraceRow({ label, value, block }: { label: string; value?: string | null; block?: boolean }) {
  if (!value) return null;
  return (
    <div className={block ? 'trace-row block' : 'trace-row'}>
      <span className="label">{label}</span>
      <span className="trace-val">{value}</span>
    </div>
  );
}
