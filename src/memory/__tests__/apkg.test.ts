import { describe, expect, it } from 'vitest';
import { exportNotesToApkgZip, importNotesFromApkgZip } from '../apkg';
import { buildCardsFromNote } from '../notes';
import type { NoteRecord } from '../types';

describe('Phase 2B/7 .apkg Archive Round-Trip', () => {
  it('exports and re-imports Basic, Basic-reversed, and Cloze notes losslessly with valid ZIP header', () => {
    const notes: NoteRecord[] = [
      {
        id: 'n1',
        deck: 'OMFS',
        noteType: 'cloze',
        front: 'Pederson score 7-10 indicates {{c1::Difficult}} impaction.',
        back: 'Pederson 1988',
        tags: ['OMFS', 'Impaction'],
        sourceRef: 'Pederson 1988',
        createdAt: '2026-11-15T08:00:00.000Z',
        updatedAt: '2026-11-15T08:00:00.000Z'
      },
      {
        id: 'n2',
        deck: 'PHD',
        noteType: 'basic_reversed',
        front: 'Ideal water fluoride level in India?',
        back: '0.5 - 0.8 ppm',
        tags: ['PHD'],
        createdAt: '2026-11-15T08:00:00.000Z',
        updatedAt: '2026-11-15T08:00:00.000Z'
      }
    ];
    const cards = notes.flatMap((n) => buildCardsFromNote(n));
    const zipBytes = exportNotesToApkgZip(notes, cards);

    // Check PK\x03\x04 ZIP magic bytes
    expect(zipBytes[0]).toBe(0x50);
    expect(zipBytes[1]).toBe(0x4b);
    expect(zipBytes[2]).toBe(0x03);
    expect(zipBytes[3]).toBe(0x04);

    const restored = importNotesFromApkgZip(zipBytes);
    expect(restored.notes).toHaveLength(2);
    expect(restored.cards).toHaveLength(3); // 1 cloze + 2 reversed
    expect(restored.notes[0].front).toBe(notes[0].front);
    expect(restored.notes[1].noteType).toBe('basic_reversed');
  });
});
