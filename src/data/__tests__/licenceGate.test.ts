import { describe, expect, it } from 'vitest';
import { CONCEPTS_SEED } from '../conceptsSeed';
import { checkLicenceGate } from '../licenceGate';

describe('Part 7 Visual Intelligence Concepts & Licence Gate (Rule R11)', () => {
  it('enforces Rule R11 licence gate accurately', () => {
    expect(checkLicenceGate('CC0 1.0').allowed).toBe(true);
    expect(checkLicenceGate('Public domain').allowed).toBe(true);
    expect(checkLicenceGate('CC BY 4.0')).toEqual({
      allowed: true,
      normalizedLicence: 'CC BY 4.0',
      nonCommercial: false
    });
    expect(checkLicenceGate('CC BY-SA 3.0').allowed).toBe(true);
    expect(checkLicenceGate('CC BY-NC-SA 4.0')).toEqual({
      allowed: true,
      normalizedLicence: 'CC BY-NC-SA 4.0',
      nonCommercial: true
    });

    expect(checkLicenceGate('CC BY-ND 4.0').allowed).toBe(false);
    expect(checkLicenceGate('CC BY-NC-ND 4.0').allowed).toBe(false);
    expect(checkLicenceGate('All rights reserved').allowed).toBe(false);
    expect(checkLicenceGate('').allowed).toBe(false);
  });

  it('seeds Appendix B concepts across >= 10 subjects with valid differentials', () => {
    expect(CONCEPTS_SEED.length).toBeGreaterThanOrEqual(30);
    const subjects = new Set(CONCEPTS_SEED.map((c) => c.subjectId));
    expect(subjects.size).toBeGreaterThanOrEqual(10);

    const ids = new Set(CONCEPTS_SEED.map((c) => c.id));
    for (const c of CONCEPTS_SEED) {
      for (const diff of c.differentials) {
        expect(ids.has(diff)).toBe(true);
      }
    }
  });
});
