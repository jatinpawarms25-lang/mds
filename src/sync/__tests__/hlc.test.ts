import { describe, expect, it } from 'vitest';
import { compareHlc, isClockTooFarAhead, packHlc, receiveHlc, tickHlc, unpackHlc } from '../hlc';

describe('Hybrid Logical Clock (HLC)', () => {
  it('ticks monotonically even when physical clock moves backwards', () => {
    let h = { ms: 1700000000000, counter: 0, nodeId: 'mac' };
    const h1 = packHlc(h);
    h = tickHlc(h, 1699999999000);
    const h2 = packHlc(h);
    expect(compareHlc(h2, h1)).toBeGreaterThan(0);
    expect(unpackHlc(h2).counter).toBe(1);
  });

  it('rejects clocks more than 5 minutes ahead of server time', () => {
    const serverNow = 1700000000000;
    const fourMinAhead = packHlc({ ms: serverNow + 4 * 60 * 1000, counter: 0, nodeId: 'devA' });
    const sixMinAhead = packHlc({ ms: serverNow + 6 * 60 * 1000, counter: 0, nodeId: 'devA' });
    expect(isClockTooFarAhead(fourMinAhead, serverNow)).toBe(false);
    expect(isClockTooFarAhead(sixMinAhead, serverNow)).toBe(true);
  });

  it('bounds local clock on receiveHlc if remote clock is >5 min ahead', () => {
    const now = 1700000000000;
    const local = { ms: now, counter: 2, nodeId: 'mac' };
    const skewedRemote = packHlc({ ms: now + 60 * 60 * 1000, counter: 5, nodeId: 'phone' });
    const next = receiveHlc(local, skewedRemote, now);
    expect(next.ms).toBe(now);
    expect(next.counter).toBe(3);
  });
});
