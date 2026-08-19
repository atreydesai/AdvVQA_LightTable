export type SlotKind = 'main' | 'reveal' | 'question';

export interface SlotImage {
  url?: string | null;
  storage_path?: string | null;
  uploaded_at?: string | null;
}

export interface EditStackEntry {
  edit_type?: string | null;
  params?: Record<string, unknown>;
  storage_path?: string | null;
  url?: string | null;
  timestamp?: string | null;
}

export interface VlmRun {
  model?: string | null;
  is_correct?: boolean | null;
  is_abstain?: boolean | null;
  answer_text?: string | null;
  created_at?: string | null;
}

export interface Slot {
  slot_id?: string;
  slot_index: number;
  text_clue?: string | null;
  answer?: string | null;
  image?: SlotImage | null;
  edit_stack: EditStackEntry[];
  save_status: string;
  slot_kind?: SlotKind | null;
  subq_group?: number | null;
  latest_vlm_run?: VlmRun | null;
  preview_image_url?: string | null;
}

export interface SessionDetail {
  session_id: string;
  image_id: string;
  user_id?: string;
  username?: string;
  status: string;
  question_type?: string;
  question?: string | null;
  answer?: string | null;
  slots: Slot[];
  source_image?: { id: string; url: string; title?: string; category?: string } | null;
  review_status?: string | null;
  edit_state?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  last_updated?: string | null;
  finalized_at?: string | null;
}

export type TimelineKind = 'image' | 'text' | 'vlm' | 'milestone';

export interface TimelineEntry {
  t: string;
  kind: TimelineKind;
  label: string;
  slot_index?: number | null;
  slot_id?: string | null;
  edit_type?: string | null;
  image_url?: string | null;
  revision?: number;
  event_type?: string | null;
  username?: string | null;
  model?: string | null;
  is_correct?: boolean | null;
  is_abstain?: boolean | null;
  answer_text?: string | null;
  buzz_point?: number | null;
  buzz_status?: string | null;
}

export interface FirstStateSlot {
  slot_index?: number | null;
  slot_id?: string | null;
  slot_kind?: SlotKind | null;
  subq_group?: number | null;
  text_clue?: string | null;
  answer?: string | null;
  image_url?: string | null;
}

export interface FirstState {
  source: 'authored_snapshot' | 'session_completed';
  snapshot_at?: string | null;
  question?: string | null;
  answer?: string | null;
  slots: FirstStateSlot[];
}

export interface SessionHistory {
  session: SessionDetail;
  timeline: TimelineEntry[];
  first_state: FirstState | null;
}

export interface QuestionRow {
  session_id: string;
  question_type: string;
  status?: string | null;
  review_status?: string | null;
  edit_state?: string | null;
  username?: string | null;
  question?: string | null;
  answer?: string | null;
  image_title?: string | null;
  slot_count: number;
  image_revisions: number;
  has_snapshot: boolean;
  packet_name?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  last_updated?: string | null;
}
