import type { NoteRecord, NoteType } from './types';

function escapeCsvCell(val: string): string {
  if (val.includes('"') || val.includes(',') || val.includes('\n') || val.includes('\r')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function exportNotesToCsv(notes: NoteRecord[]): string {
  const header = 'noteType,deck,front,back,tags,sourceRef';
  const rows = notes.map((n) =>
    [
      escapeCsvCell(n.noteType),
      escapeCsvCell(n.deck),
      escapeCsvCell(n.front),
      escapeCsvCell(n.back),
      escapeCsvCell(n.tags.join(';')),
      escapeCsvCell(n.sourceRef || '')
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' && next === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else if (ch === '\n' || ch === '\r') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

export interface ImportedCsvNote {
  noteType: NoteType;
  deck: string;
  front: string;
  back: string;
  tags: string[];
  sourceRef?: string;
}

export function importNotesFromCsv(csvText: string): ImportedCsvNote[] {
  const rows = parseCsvRows(csvText);
  if (rows.length === 0) return [];

  const firstLower = rows[0].map((c) => c.trim().toLowerCase());
  const hasHeader = firstLower.includes('front') || firstLower.includes('notetype');
  const dataRows = hasHeader ? rows.slice(1) : rows;

  const out: ImportedCsvNote[] = [];
  for (const r of dataRows) {
    if (hasHeader) {
      const idxType = firstLower.indexOf('notetype');
      const idxDeck = firstLower.indexOf('deck');
      const idxFront = firstLower.indexOf('front');
      const idxBack = firstLower.indexOf('back');
      const idxTags = firstLower.indexOf('tags');
      const idxRef = firstLower.indexOf('sourceref');

      const front = (r[idxFront] || '').trim();
      if (!front) continue;
      const rawType = (idxType >= 0 ? r[idxType] : 'basic').trim().toLowerCase();
      const noteType: NoteType =
        rawType === 'basic_reversed' || rawType === 'cloze' ? rawType : 'basic';
      out.push({
        noteType,
        deck: (idxDeck >= 0 && r[idxDeck] ? r[idxDeck] : 'Default').trim(),
        front,
        back: (idxBack >= 0 ? r[idxBack] || '' : '').trim(),
        tags: (idxTags >= 0 ? r[idxTags] || '' : '')
          .split(/[;,]/)
          .map((t) => t.trim())
          .filter(Boolean),
        sourceRef: idxRef >= 0 ? (r[idxRef] || '').trim() || undefined : undefined
      });
    } else {
      // Simple 2-column or 3-column CSV (front, back, [tags])
      const front = (r[0] || '').trim();
      if (!front) continue;
      const autoCloze = /\{\{c\d+::/.test(front);
      out.push({
        noteType: autoCloze ? 'cloze' : 'basic',
        deck: 'Imported',
        front,
        back: (r[1] || '').trim(),
        tags: (r[2] || '')
          .split(/[;,]/)
          .map((t) => t.trim())
          .filter(Boolean)
      });
    }
  }
  return out;
}
