import type { SyncSnapshotInfo } from '../sync/types';

interface Props {
  info: SyncSnapshotInfo | null;
  onClick: () => void;
}

export function SyncStatusChip({ info, onClick }: Props) {
  if (!info) {
    return (
      <button
        onClick={onClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold text-slate-300"
      >
        <span className="w-2 h-2 rounded-full bg-slate-400" />
        <span>Loading...</span>
      </button>
    );
  }

  const dotColor =
    info.status === 'synced'
      ? 'bg-emerald-400'
      : info.status === 'syncing'
        ? 'bg-sky-400 animate-pulse'
        : info.status === 'offline'
          ? 'bg-amber-400'
          : info.status === 'conflict'
            ? 'bg-orange-400'
            : info.status === 'error'
              ? 'bg-rose-500'
              : 'bg-slate-400';

  return (
    <button
      onClick={onClick}
      title={info.statusMessage}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-200 apple-press max-w-[220px] truncate"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
      <span className="truncate">{info.statusMessage}</span>
    </button>
  );
}
