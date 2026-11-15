import type { CardRecord, NoteRecord } from '../memory/types';
import type { ImageEntry } from './imageLibrary';

export interface OcclusionMask {
  id: string;
  label: string;
  x: number; // percentage 0..100
  y: number; // percentage 0..100
  w: number; // percentage 1..100
  h: number; // percentage 1..100
}

export interface ImageCandidate extends ImageEntry {
  status: 'candidate' | 'published' | 'rejected';
  aiGenerated: false;
  citation: string;
  occlusionMasks?: OcclusionMask[];
}

export function validatePublishableImage(entry: {
  aiGenerated?: boolean;
  licence?: string;
  author?: string;
  creditLine?: string;
  sourcePageUrl?: string;
  citation?: string;
}): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (entry.aiGenerated === true) {
    errors.push('Rule R1 violation: aiGenerated must be false.');
  }
  if (!entry.licence?.trim()) errors.push('Missing licence');
  if (!entry.author?.trim()) errors.push('Missing author');
  if (!entry.creditLine?.trim()) errors.push('Missing creditLine');
  if (!entry.sourcePageUrl?.trim()) errors.push('Missing sourcePageUrl');
  if (!entry.citation?.trim()) errors.push('Missing citation');
  return { ok: errors.length === 0, errors };
}

export function normalizeMask(mask: OcclusionMask): OcclusionMask {
  const clampPct = (v: number, min: number, max: number) => Math.min(max, Math.max(min, Math.round(v * 10) / 10));
  const x = clampPct(mask.x, 0, 95);
  const y = clampPct(mask.y, 0, 95);
  const w = clampPct(mask.w, 4, 100 - x);
  const h = clampPct(mask.h, 4, 100 - y);
  return { ...mask, x, y, w, h };
}

export function buildImageOcclusionCards(
  entry: ImageEntry,
  masks: OcclusionMask[],
  noteId: string,
  nowIso = new Date().toISOString()
): { note: NoteRecord; cards: CardRecord[] } {
  const normalized = masks.map(normalizeMask);
  const imageUrl = entry.imageUrl || entry.imageFile || '';
  const note: NoteRecord = {
    id: noteId,
    deck: entry.subject || 'Image Atlas',
    noteType: 'basic',
    front: `Identify occluded region on: ${entry.title}`,
    back: `${entry.diagnosis}\n${entry.keyFeatures.slice(0, 2).join(' | ')}`,
    tags: [entry.subject, entry.type, 'image-occlusion'].filter(Boolean),
    sourceRef: `${entry.creditLine} (${entry.sourcePageUrl})`,
    createdAt: nowIso,
    updatedAt: nowIso
  };

  const cards: CardRecord[] = (normalized.length > 0 ? normalized : [{ id: 'full', label: entry.diagnosis, x: 25, y: 25, w: 50, h: 50 }]).map(
    (m, ord) => ({
      id: `${noteId}::${ord}`,
      noteId,
      deck: note.deck,
      ord,
      front: `Identify: ${m.label || entry.title} (${entry.type})`,
      back: `${entry.diagnosis} - ${m.label}\nCredit: ${entry.creditLine}`,
      tags: note.tags,
      state: 'new',
      stepIndex: 0,
      dueAt: nowIso,
      lastReviewAt: null,
      intervalDays: 0,
      easeFactor: 2.5,
      stability: 0,
      difficulty: 5,
      reps: 0,
      lapses: 0,
      suspended: false,
      buriedUntil: null,
      isLeech: false,
      imageUrl,
      imageCredit: entry.creditLine,
      occlusionMasks: normalized,
      activeMaskId: m.id,
      createdAt: nowIso,
      updatedAt: nowIso
    })
  );

  return { note, cards };
}
