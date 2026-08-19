# AdvVQA Light Table

Desktop-only versioning viewer for AdvVQA authoring sessions. Shows how each
question — its images, clues, and model verdicts — changed over time, with a
single timeline scrubber that drives every subpart at once.

Companion frontend to [AdvVQA_Interface](https://github.com/atreydesai/AdvVQA_Interface);
it shares that project's FastAPI backend (`/api/versioning/*` endpoints) and
Firestore data.

## Views

- **Regular** — one subpart large, with the clue text, the model verdict at the
  current playhead position, and a git-style diff between the first authored
  and final text.
- **Broad** — every subpart's image on screen at once, all driven by the same
  scrubber, for judging the effect of repositioning/cropping across the whole
  question.

Keyboard: `←`/`→` step the timeline, `⇧←`/`⇧→` jump between milestones (when the
playhead is focused), `1–9` select subparts.

## Data sources

| On the timeline | Backing data |
|---|---|
| Image revisions (blue) | each slot's append-only `edit_stack` — every upload is a new immutable GCS object |
| Clue changes (purple) | `authoring_events` (`slot_upserted`, `question_added`, reorder/delete) |
| Model runs (amber) | `authoring_vlm_runs` |
| Milestones (black) | `authoring_events` session lifecycle events |
| First/final text diff | `authored_snapshot` (fallback: the `session_completed` event payload) |

## Caching

- Question index and per-session history are cached in IndexedDB
  (stale-while-revalidate: cached copy renders instantly, network refreshes it).
- Every image revision URL is immutable, so all revisions are prefetched when a
  question opens and the browser cache makes scrubbing instant.

## Development

```bash
npm install
npm run dev          # http://localhost:5175, proxies /api to localhost:8000
```

Run the AdvVQA_Interface backend locally on port 8000 (or set
`VITE_API_BASE_URL`). Sign in with an editor account — the API is gated by the
same editor allowlist as the review panel.

## Deploy

Firebase Hosting site `advvqa-light-table` in project `advvqa-firebase`, with
`/api/**` rewritten to the `advvqa` Cloud Run service (same-origin, no CORS).

One-time setup:

```bash
firebase hosting:sites:create advvqa-light-table --project advvqa-firebase
```

Then:

```bash
npm run deploy       # builds and deploys hosting:lighttable
```

The backend must be redeployed from AdvVQA_Interface once the
`/api/versioning/*` router is merged there.

## Design

The visual language ("Light Table", Apple HIG-based, light theme, desktop ≥1280px)
is documented in `docs/STYLE_GUIDE.html`.
