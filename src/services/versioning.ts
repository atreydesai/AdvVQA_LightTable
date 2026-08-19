import localforage from 'localforage';
import api from '../lib/api';
import type { QuestionRow, SessionHistory } from '../types';

/**
 * Caching strategy (this app is read-heavy and image-heavy):
 *  - Question index: in-memory + IndexedDB, stale-while-revalidate.
 *  - Session history: IndexedDB keyed by session id; served instantly if
 *    present, then revalidated against the network in the background.
 *  - Images: every revision URL is immutable (each upload creates a new GCS
 *    object), so once prefetched the browser cache holds them forever.
 */

const store = localforage.createInstance({ name: 'advvqa-light-table', storeName: 'cache' });

const memory = new Map<string, unknown>();

interface CachedEnvelope<T> {
  savedAt: number;
  data: T;
}

async function readCache<T>(key: string): Promise<T | null> {
  if (memory.has(key)) return memory.get(key) as T;
  try {
    const env = (await store.getItem(key)) as CachedEnvelope<T> | null;
    if (env) {
      memory.set(key, env.data);
      return env.data;
    }
  } catch {
    /* cache is best-effort */
  }
  return null;
}

async function writeCache<T>(key: string, data: T) {
  memory.set(key, data);
  try {
    await store.setItem(key, { savedAt: Date.now(), data });
  } catch {
    /* cache is best-effort */
  }
}

export interface SWR<T> {
  cached: T | null;
  fresh: Promise<T>;
}

export function getQuestions(): SWR<QuestionRow[]> {
  const key = 'questions-index';
  const fresh = api.get('/api/versioning/questions').then(({ data }) => {
    const rows = data.questions as QuestionRow[];
    void writeCache(key, rows);
    return rows;
  });
  return { cached: null, fresh } as SWR<QuestionRow[]> & { cachedPromise?: unknown };
}

export async function getQuestionsCached(): Promise<QuestionRow[] | null> {
  return readCache<QuestionRow[]>('questions-index');
}

export function getSessionHistory(sessionId: string): {
  cachedPromise: Promise<SessionHistory | null>;
  fresh: Promise<SessionHistory>;
} {
  const key = `history:${sessionId}`;
  const cachedPromise = readCache<SessionHistory>(key);
  const fresh = api.get(`/api/versioning/sessions/${sessionId}`).then(({ data }) => {
    void writeCache(key, data as SessionHistory);
    return data as SessionHistory;
  });
  return { cachedPromise, fresh };
}

/** Prefetch and decode every image revision so scrubbing never flashes. */
const prefetched = new Set<string>();

export function prefetchImages(urls: Array<string | null | undefined>) {
  for (const url of urls) {
    if (!url || prefetched.has(url)) continue;
    prefetched.add(url);
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
  }
}
