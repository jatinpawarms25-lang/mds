import type { CardRecord, NoteRecord, NoteType } from '../memory/types';

// Pure TypeScript ZIP (Store method + CRC32) for .apkg round-trip packaging
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

interface ZipEntryInput {
  name: string;
  data: Uint8Array;
}

function buildZip(entries: ZipEntryInput[]): Uint8Array {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true); // Store (no compression)
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);
    lv.setUint32(22, size, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localChunks.push(localHeader, entry.data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, size, true);
    cv.setUint32(24, size, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralChunks.push(centralHeader);
    offset += localHeader.length + size;
  }

  const centralSize = centralChunks.reduce((a, b) => a + b.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalLen = offset + centralSize + eocd.length;
  const out = new Uint8Array(totalLen);
  let pos = 0;
  for (const c of localChunks) {
    out.set(c, pos);
    pos += c.length;
  }
  for (const c of centralChunks) {
    out.set(c, pos);
    pos += c.length;
  }
  out.set(eocd, pos);
  return out;
}

function readZip(bytes: Uint8Array): Map<string, Uint8Array> {
  const decoder = new TextDecoder();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map<string, Uint8Array>();
  let pos = 0;

  while (pos + 30 <= bytes.length) {
    const sig = view.getUint32(pos, true);
    if (sig !== 0x04034b50) break;
    const method = view.getUint16(pos + 8, true);
    if (method !== 0) {
      throw new Error(`Unsupported ZIP compression method ${method}; expected Store (0)`);
    }
    const expectedCrc = view.getUint32(pos + 14, true);
    const compSize = view.getUint32(pos + 18, true);
    const nameLen = view.getUint16(pos + 26, true);
    const extraLen = view.getUint16(pos + 28, true);
    const nameStart = pos + 30;
    const dataStart = nameStart + nameLen + extraLen;
    const dataEnd = dataStart + compSize;

    const name = decoder.decode(bytes.subarray(nameStart, nameStart + nameLen));
    const data = bytes.subarray(dataStart, dataEnd);
    if (crc32(data) !== expectedCrc) {
      throw new Error(`CRC32 mismatch for ${name}`);
    }
    files.set(name, data);
    pos = dataEnd;
  }

  return files;
}

export interface ApkgPayload {
  schema: 'mds-os-apkg-v1';
  exportedAt: string;
  notes: Array<{
    id: string;
    deck: string;
    noteType: NoteType;
    front: string;
    back: string;
    tags: string[];
    sourceRef?: string;
  }>;
  cards: CardRecord[];
}

export function exportNotesToApkgZip(notes: NoteRecord[], cards: CardRecord[]): Uint8Array {
  const encoder = new TextEncoder();
  const payload: ApkgPayload = {
    schema: 'mds-os-apkg-v1',
    exportedAt: new Date().toISOString(),
    notes: notes.map((n) => ({
      id: n.id,
      deck: n.deck,
      noteType: n.noteType,
      front: n.front,
      back: n.back,
      tags: n.tags,
      sourceRef: n.sourceRef
    })),
    cards
  };
  return buildZip([
    { name: 'collection.mds.json', data: encoder.encode(JSON.stringify(payload)) },
    { name: 'media', data: encoder.encode('{}') }
  ]);
}

export function importNotesFromApkgZip(zipBytes: Uint8Array): ApkgPayload {
  const files = readZip(zipBytes);
  const col = files.get('collection.mds.json');
  if (!col) {
    throw new Error('Missing collection.mds.json in .apkg archive');
  }
  const parsed = JSON.parse(new TextDecoder().decode(col)) as ApkgPayload;
  if (parsed.schema !== 'mds-os-apkg-v1' || !Array.isArray(parsed.notes)) {
    throw new Error('Invalid .apkg payload schema');
  }
  return parsed;
}
