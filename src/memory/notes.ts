import type { CardRecord, NoteRecord } from './types';

const CLOZE_REGEX = /\{\{c(\d+)::([\s\S]*?)(?:::([\s\S]*?))?\}\}/g;

export function extractClozeIndices(text: string): number[] {
  const indices = new Set<number>();
  let match: RegExpExecArray | null;
  const rx = new RegExp(CLOZE_REGEX.source, 'g');
  while ((match = rx.exec(text)) !== null) {
    const idx = Number(match[1]);
    if (idx > 0) indices.add(idx);
  }
  return Array.from(indices).sort((a, b) => a - b);
}

export function renderClozeFront(text: string, activeIndex: number): string {
  return text.replace(new RegExp(CLOZE_REGEX.source, 'g'), (_full, idxStr, answer, hint) => {
    const idx = Number(idxStr);
    if (idx === activeIndex) {
      return hint ? `[${hint}]` : '[...]';
    }
    return answer;
  });
}

export function renderClozeBack(text: string, activeIndex: number, extraBack?: string): string {
  const revealed = text.replace(new RegExp(CLOZE_REGEX.source, 'g'), (_full, idxStr, answer) => {
    const idx = Number(idxStr);
    if (idx === activeIndex) {
      return `**${answer}**`;
    }
    return answer;
  });
  return extraBack && extraBack.trim() ? `${revealed}\n\n${extraBack.trim()}` : revealed;
}

export function buildCardsFromNote(note: NoteRecord, nowIso = new Date().toISOString()): CardRecord[] {
  const base = {
    noteId: note.id,
    deck: note.deck || 'Default',
    tags: [...note.tags],
    state: 'new' as const,
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
    createdAt: nowIso,
    updatedAt: nowIso
  };

  if (note.noteType === 'basic') {
    return [
      {
        ...base,
        id: `${note.id}::0`,
        ord: 0,
        front: note.front,
        back: note.back
      }
    ];
  }

  if (note.noteType === 'basic_reversed') {
    return [
      {
        ...base,
        id: `${note.id}::0`,
        ord: 0,
        front: note.front,
        back: note.back
      },
      {
        ...base,
        id: `${note.id}::1`,
        ord: 1,
        front: note.back,
        back: note.front
      }
    ];
  }

  // Cloze note
  const indices = extractClozeIndices(note.front);
  if (indices.length === 0) {
    return [
      {
        ...base,
        id: `${note.id}::0`,
        ord: 0,
        front: note.front,
        back: note.back
      }
    ];
  }

  return indices.map((cIdx, ord) => ({
    ...base,
    id: `${note.id}::${ord}`,
    ord,
    front: renderClozeFront(note.front, cIdx),
    back: renderClozeBack(note.front, cIdx, note.back)
  }));
}
