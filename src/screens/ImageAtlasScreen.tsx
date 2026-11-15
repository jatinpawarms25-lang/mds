import { useState } from 'react';
import { DEFAULT_IMAGE_LIBRARY, type ImageEntry } from '../data/imageLibrary';
import { generateUuid, syncEngine } from '../sync/syncEngine';

export default function ImageAtlasScreen() {
  const [zoomImg, setZoomImg] = useState<ImageEntry | null>(null);
  const [zoom, setZoom] = useState(1);
  const [drillQs, setDrillQs] = useState<Array<{ img: ImageEntry; options: string[]; correctIdx: number }>>([]);
  const [drillIdx, setDrillIdx] = useState(0);
  const [drillAns, setDrillAns] = useState<number | null>(null);
  const [drillScore, setDrillScore] = useState(0);

  const startDrill = () => {
    const pool = [...DEFAULT_IMAGE_LIBRARY].sort(() => 0.5 - Math.random()).slice(0, 15);
    const qs = pool.map((img) => {
      const distractors = DEFAULT_IMAGE_LIBRARY.filter((i) => i.id !== img.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map((i) => i.diagnosis);
      const options = [img.diagnosis, ...distractors].sort(() => 0.5 - Math.random());
      return { img, options, correctIdx: options.indexOf(img.diagnosis) };
    });
    setDrillQs(qs);
    setDrillIdx(0);
    setDrillAns(null);
    setDrillScore(0);
  };

  const finishDrill = async () => {
    const id = generateUuid();
    await syncEngine.putRecordLocal('image_drills', id, {
      id,
      date: new Date().toISOString().slice(0, 10),
      score: drillScore,
      total: drillQs.length * 4
    });
    setDrillQs([]);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Real Medical Image Atlas</h1>
          <p className="text-xs text-slate-400 mt-1">Zero AI-generated images. Every entry carries licence, author, credit, and source URL.</p>
        </div>
        <button onClick={startDrill} className="px-4 py-2.5 rounded-2xl bg-sky-500 text-white font-bold text-xs apple-press">
          Start 15-Image Diagnosis Drill
        </button>
      </div>

      {drillQs.length > 0 && (
        <div className="glass-card rounded-3xl p-6 space-y-4 border border-sky-500/40">
          <div className="flex justify-between text-xs font-bold text-sky-400">
            <span>Image {drillIdx + 1} / {drillQs.length}</span>
            <span>Score: {drillScore}</span>
          </div>
          {drillQs[drillIdx].img.isPlaceholder ? (
            <div className="p-6 rounded-2xl bg-white/[0.04] text-center text-xs">
              <p className="text-amber-300 font-bold mb-2">Linked External Case</p>
              <a href={drillQs[drillIdx].img.sourcePageUrl} target="_blank" rel="noreferrer" className="text-sky-400 underline">
                View Original at Source
              </a>
            </div>
          ) : (
            <img
              src={drillQs[drillIdx].img.imageUrl || drillQs[drillIdx].img.imageFile}
              alt={drillQs[drillIdx].img.title}
              className="max-h-72 mx-auto rounded-2xl bg-black object-contain"
            />
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            {drillQs[drillIdx].options.map((opt, oIdx) => (
              <button
                key={oIdx}
                onClick={() => {
                  if (drillAns !== null) return;
                  setDrillAns(oIdx);
                  setDrillScore((s) => s + (oIdx === drillQs[drillIdx].correctIdx ? 4 : -1));
                }}
                className={`p-3 rounded-xl border text-left ${
                  drillAns !== null && oIdx === drillQs[drillIdx].correctIdx
                    ? 'bg-emerald-500/25 border-emerald-400 text-white font-bold'
                    : drillAns === oIdx
                      ? 'bg-rose-500/25 border-rose-400 text-white'
                      : 'bg-white/[0.03] border-white/10 text-slate-200'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
          {drillAns !== null && (
            <button
              onClick={() => {
                if (drillIdx + 1 < drillQs.length) {
                  setDrillIdx((i) => i + 1);
                  setDrillAns(null);
                } else {
                  void finishDrill();
                }
              }}
              className="px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold"
            >
              {drillIdx + 1 < drillQs.length ? 'Next Image' : 'Finish & Save Drill'}
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {DEFAULT_IMAGE_LIBRARY.map((img) => (
          <div key={img.id} className="glass-card rounded-3xl p-4 space-y-3">
            {img.isPlaceholder || (!img.imageUrl && !img.imageFile) ? (
              <div className="w-full h-44 bg-white/[0.04] rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-white/10 space-y-2">
                <span className="text-xs font-bold text-amber-300">Linked External Case</span>
                <a href={img.placeholderSourceUrl || img.sourcePageUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-400 underline font-bold">
                  View Original at Source
                </a>
              </div>
            ) : (
              <button
                onClick={() => {
                  setZoomImg(img);
                  setZoom(1);
                }}
                className="w-full h-44 bg-black/60 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10"
              >
                <img src={img.imageUrl || img.imageFile} alt={img.diagnosis} loading="lazy" className="max-h-44 object-contain" />
              </button>
            )}
            <div>
              <span className="text-[10px] font-bold text-sky-400 uppercase">{img.subject}</span>
              <h3 className="text-xs font-bold text-white mt-0.5">{img.title}</h3>
              <p className="text-[11px] text-emerald-400 font-semibold">{img.diagnosis}</p>
            </div>
            <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 space-y-1">
              <div><strong>Source:</strong> {img.sourceName} ({img.licence})</div>
              <div><strong>Credit:</strong> {img.creditLine}</div>
              <a href={img.sourcePageUrl} target="_blank" rel="noreferrer" className="text-sky-400 underline block">
                View Source Page
              </a>
            </div>
          </div>
        ))}
      </div>

      {zoomImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={() => setZoomImg(null)}>
          <div className="max-w-3xl w-full glass-card rounded-3xl p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">{zoomImg.title}</h3>
              <button onClick={() => setZoomImg(null)} className="px-3 py-1 rounded-full bg-white/10 text-xs text-white">Close</button>
            </div>
            <div className="max-h-96 overflow-hidden bg-black rounded-2xl flex items-center justify-center">
              <img src={zoomImg.imageUrl || zoomImg.imageFile} alt={zoomImg.diagnosis} style={{ transform: `scale(${zoom})` }} className="max-h-96 object-contain" />
            </div>
            <div className="flex justify-between items-center text-xs">
              <div className="flex gap-2">
                <button onClick={() => setZoom((z) => Math.max(1, z - 0.25))} className="px-3 py-1 rounded bg-white/10 text-white">- Zoom</button>
                <span className="text-slate-300 font-mono">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="px-3 py-1 rounded bg-white/10 text-white">+ Zoom</button>
              </div>
              <span className="text-slate-400">{zoomImg.creditLine}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
