import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_IMAGE_LIBRARY } from '../imageLibrary';
import { buildImageOcclusionCards, normalizeMask, validatePublishableImage } from '../imageOcclusion';

describe('Phase 4 Real Image Library & Rule R1/R2 Constraints', () => {
  it('verifies all 22 baseline images carry licence, author, creditLine, and sourcePageUrl', () => {
    expect(DEFAULT_IMAGE_LIBRARY.length).toBe(22);
    for (const img of DEFAULT_IMAGE_LIBRARY) {
      const check = validatePublishableImage({
        aiGenerated: false,
        licence: img.licence,
        author: img.author,
        creditLine: img.creditLine,
        sourcePageUrl: img.sourcePageUrl,
        citation: img.sourceName
      });
      expect(check.ok).toBe(true);
    }
  });

  it('rejects aiGenerated=true or missing attribution fields', () => {
    const badAi = validatePublishableImage({
      aiGenerated: true,
      licence: 'CC BY 4.0',
      author: 'Test',
      creditLine: 'Test',
      sourcePageUrl: 'https://example.com',
      citation: 'Ref'
    });
    expect(badAi.ok).toBe(false);
    expect(badAi.errors[0]).toContain('Rule R1');

    const badAttr = validatePublishableImage({ aiGenerated: false, licence: '' });
    expect(badAttr.ok).toBe(false);
    expect(badAttr.errors.length).toBeGreaterThanOrEqual(4);
  });

  it('enforces ai_generated = false and published_requires_attribution in SQL migration', () => {
    const sql = fs.readFileSync(
      path.join(process.cwd(), 'supabase', 'migrations', '002_image_library.sql'),
      'utf8'
    );
    expect(sql).toContain('CHECK (ai_generated = false)');
    expect(sql).toContain('published_requires_attribution');
    expect(sql).toContain('occlusion_masks JSONB');
  });

  it('normalizes occlusion coordinates and creates non-destructive image cards', () => {
    const clamped = normalizeMask({ id: 'm1', label: 'Lesion', x: 90, y: 90, w: 30, h: 30 });
    expect(clamped.x + clamped.w).toBeLessThanOrEqual(100);
    expect(clamped.y + clamped.h).toBeLessThanOrEqual(100);

    const { note, cards } = buildImageOcclusionCards(
      DEFAULT_IMAGE_LIBRARY[0],
      [{ id: 'm1', label: 'Soap-bubble radiolucency', x: 20, y: 30, w: 25, h: 20 }],
      'img-note-1'
    );
    expect(note.tags).toContain('image-occlusion');
    expect(cards).toHaveLength(1);
    expect(cards[0].occlusionMasks).toHaveLength(1);
    expect(cards[0].imageUrl).toContain('wikimedia.org');
  });
});
