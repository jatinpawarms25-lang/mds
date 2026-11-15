export interface HlcState {
  ms: number;
  counter: number;
  nodeId: string;
}

const MAX_CLOCK_DRIFT_MS = 5 * 60 * 1000; // 5 minutes

export function padMs(ms: number): string {
  const clamped = Math.max(0, Math.floor(ms));
  return String(clamped).padStart(15, '0');
}

export function padCounter(counter: number): string {
  const clamped = Math.max(0, Math.min(0xffff, Math.floor(counter)));
  return clamped.toString(16).padStart(4, '0');
}

export function packHlc(state: HlcState): string {
  return `${padMs(state.ms)}:${padCounter(state.counter)}:${state.nodeId}`;
}

export function unpackHlc(hlc: string): HlcState {
  const parts = String(hlc || '').split(':');
  const ms = Number(parts[0]);
  const counter = Number.parseInt(parts[1] || '0', 16);
  const nodeId = parts.slice(2).join(':') || 'unknown';
  return {
    ms: Number.isFinite(ms) ? ms : 0,
    counter: Number.isFinite(counter) ? counter : 0,
    nodeId
  };
}

export function compareHlc(a: string, b: string): number {
  if (a === b) return 0;
  return a > b ? 1 : -1;
}

export function isClockTooFarAhead(hlc: string, referenceMs: number = Date.now()): boolean {
  const parsed = unpackHlc(hlc);
  return parsed.ms > referenceMs + MAX_CLOCK_DRIFT_MS;
}

export function tickHlc(prev: HlcState, physicalNowMs: number = Date.now()): HlcState {
  const nextMs = Math.max(prev.ms, physicalNowMs);
  const counter = nextMs === prev.ms ? prev.counter + 1 : 0;
  return {
    ms: nextMs,
    counter,
    nodeId: prev.nodeId
  };
}

export function receiveHlc(
  local: HlcState,
  remoteHlc: string,
  physicalNowMs: number = Date.now()
): HlcState {
  const remote = unpackHlc(remoteHlc);
  // Ignore skewed remote clocks >5 min ahead of local physical time
  if (remote.ms > physicalNowMs + MAX_CLOCK_DRIFT_MS) {
    return tickHlc(local, physicalNowMs);
  }
  const maxMs = Math.max(local.ms, remote.ms, physicalNowMs);

  let counter = 0;
  if (maxMs === local.ms && maxMs === remote.ms) {
    counter = Math.max(local.counter, remote.counter) + 1;
  } else if (maxMs === local.ms) {
    counter = local.counter + 1;
  } else if (maxMs === remote.ms) {
    counter = remote.counter + 1;
  }

  return {
    ms: maxMs,
    counter,
    nodeId: local.nodeId
  };
}
