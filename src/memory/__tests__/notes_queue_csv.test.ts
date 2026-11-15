import { describe, expect, it } from 'vitest';
import { exportNotesToCsv, importNotesFromCsv } from '../csv';
import { DEFAULT_DECK_OPTIONS } from '../fsrs';
import { buildCardsFromNote } from '../notes';
import { buildDailyQueue, burySiblingsAfterReview } from '../queue';
import type { NoteRecord } from '../types';

describe('Notes, Queue, Sibling Burying & CSV Round-Trip', () => {
  it('generates 1 card for basic, 2 siblings for basic_reversed, and N cards for cloze', () => {
    const basic: NoteRecord = {
      id: 'n1',
      deck: 'Anatomy',
      noteType: 'basic',
      front: 'Nerve in Pterygoid canal?',
      back: 'Vidian nerve',
      tags: ['Anatomy'],
      createdAt: '2026-11-15T08:00:00.000Z',
      updatedAt: '2026-11-15T08:00:00.000Z'
    };
    expect(buildCardsFromNote(basic)).toHaveLength(1);

    const rev: NoteRecord = { ...basic, id: 'n2', noteType: 'basic_reversed' };
    const revCards = buildCardsFromNote(rev);
    expect(revCards).toHaveLength(2);
    expect(revCards[1].front).toBe('Vidian nerve');

    const cloze: NoteRecord = {
      ...basic,
      id: 'n3',
      noteType: 'cloze',
      front: '{{c1::Ameloblastoma}} shows {{c2::soap bubble::radiograph}} appearance.',
      back: 'Shafer p. 268'
    };
    const clozeCards = buildCardsFromNote(cloze);
    expect(clozeCards).toHaveLength(2);
    expect(clozeCards[0].front).toContain('[...]');
    expect(clozeCards[1].front).toContain('[radiograph]');
    expect(clozeCards[1].back).toContain('**soap bubble**');
  });

  it('buries new/review siblings after review and never buries learning cards', () => {
    const now = new Date('2026-11-15T08:00:00.000Z');
    const note: NoteRecord = {
      id: 'n4',
      deck: 'OMFS',
      noteType: 'basic_reversed',
      front: 'A',
      back: 'B',
      tags: [],
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };
    const cards = buildCardsFromNote(note, now.toISOString());
    const buried = burySiblingsAfterReview(cards[0], cards, now, DEFAULT_DECK_OPTIONS);
    expect(buried).toHaveLength(1);
    expect(buried[0].id).toBe('n4::1');
    expect(buried[0].buriedUntil).toBe('2026-11-15');

    const updatedCards = [cards[0], buried[0]];
    const queue = buildDailyQueue(updatedCards, now, DEFAULT_DECK_OPTIONS);
    expect(queue.buriedCount).toBe(1);
    expect(queue.ordered.map((c) => c.id)).toEqual(['n4::0']);
  });

  it('round-trips notes through CSV export and import without data loss', () => {
    const notes: NoteRecord[] = [
      {
        id: 'csv1',
        deck: 'Dental Materials',
        noteType: 'cloze',
        front: 'Gypsum Type IV W/P ratio is {{c1::0.22 - 0.24}}.',
        back: 'Phillips, 12th ed.',
        tags: ['Materials', 'Volatile'],
        sourceRef: 'Phillips p. 185',
        createdAt: '2026-11-15T08:00:00.000Z',
        updatedAt: '2026-11-15T08:00:00.000Z'
      }
    ];
    const csv = exportNotesToCsv(notes);
    const parsed = importNotesFromCsv(csv);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].noteType).toBe('cloze');
    expect(parsed[0].deck).toBe('Dental Materials');
    expect(parsed[0].front).toBe(notes[0].front);
    expect(parsed[0].tags).toEqual(['Materials', 'Volatile']);
    expect(parsed[0].sourceRef).toBe('Phillips p. 185');
  });
});
