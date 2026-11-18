import { useMemo, useState, type FormEvent } from 'react';
import { CONCEPTS_SEED } from '../data/conceptsSeed';
import { DEFAULT_IMAGE_LIBRARY, type ImageEntry } from '../data/imageLibrary';
import {
  buildImageOcclusionCards,
  validatePublishableImage,
  type ImageCandidate,
  type OcclusionMask
} from '../data/imageOcclusion';
import { checkLicenceGate } from '../data/licenceGate';
import { useSyncCollection } from '../hooks/useSyncStore';
import type { CardRecord, NoteRecord } from '../memory/types';
import { generateUuid, syncEngine } from '../sync/syncEngine';

export default function ImageAtlasScreen() {
  const { items: userImages, putItem: putUserImage } = useSyncCollection<ImageCandidate>('user_images');
  const { putItem: putNote } = useSyncCollection<NoteRecord>('notes');
  const { putItem: putCard } = useSyncCollection<CardRecord>('cards');

  const [zoomImg, setZoomImg] = useState<ImageEntry | null>(null);
  const [zoom, setZoom] = useState(1);
  const [masks, setMasks] = useState<OcclusionMask[]>([
    { id: 'm1', label: 'Key feature', x: 30, y: 30, w: 30, h: 25 }
  ]);
  const [maskMsg, setMaskMsg] = useState('');

  // Candidate submission (Rule R3: stays candidate until student approves)
  const [showAdd, setShowAdd] = useState(false);
  const [cTitle, setCTitle] = useState('');
  const [cDiagnosis, setCDiagnosis] = useState('');
  const [cSubject, setCSubject] = useState('Oral Medicine & Radiology');
  const [cImageUrl, setCImageUrl] = useState('');
  const [cSourceUrl, setCSourceUrl] = useState('');
  const [cLicence, setCLicence] = useState('');
  const [cAuthor, setCAuthor] = useState('');
  const [cCredit, setCCredit] = useState('');
  const [cCitation, setCCitation] = useState('');
  const [candMsg, setCandMsg] = useState('');

  // Drill state
  const [drillQs, setDrillQs] = useState<Array<{ img: ImageEntry; options: string[]; correctIdx: number }>>([]);
  const [drillIdx, setDrillIdx] = useState(0);
  const [drillAns, setDrillAns] = useState<number | null>(null);
  const [drillScore, setDrillScore] = useState(0);

  const publishedLibrary = useMemo<ImageEntry[]>(() => {
    const approvedUser = userImages.filter((u) => u.data.status === 'published').map((u) => u.data);
    return [...DEFAULT_IMAGE_LIBRARY, ...approvedUser];
  }, [userImages]);

  const candidates = useMemo(() => userImages.filter((u) => u.data.status === 'candidate'), [userImages]);

  const startDrill = () => {
    const pool = [...publishedLibrary].sort(() => 0.5 - Math.random()).slice(0, 15);
    const qs = pool.map((img) => {
      const distractors = publishedLibrary
        .filter((i) => i.id !== img.id)
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

  const handleSubmitCandidate = async (e: FormEvent) => {
    e.preventDefault();
    const id = `cand_${generateUuid()}`;
    const entry: ImageCandidate = {
      id,
      title: cTitle.trim(),
      diagnosis: cDiagnosis.trim(),
      subject: cSubject,
      type: 'radiograph',
      keyFeatures: [],
      lookAlikes: '',
      sourceName: cCitation.trim() || 'User Verified Source',
      sourcePageUrl: cSourceUrl.trim(),
      imageUrl: cImageUrl.trim(),
      imageFile: cImageUrl.trim(),
      licence: cLicence.trim(),
      author: cAuthor.trim(),
      creditLine: cCredit.trim(),
      citation: cCitation.trim(),
      dateVerified: new Date().toISOString().slice(0, 10),
      status: 'candidate',
      aiGenerated: false,
      isPlaceholder: false
    };
    await putUserImage(id, entry);
    setCandMsg('Saved as Candidate (Rule R3). Review attribution below to Publish.');
    setCTitle('');
    setCDiagnosis('');
    setCImageUrl('');
    setCSourceUrl('');
    setCLicence('');
    setCAuthor('');
    setCCredit('');
    setCCitation('');
  };

  const handleApproveCandidate = async (item: ImageCandidate) => {
    const licCheck = checkLicenceGate(item.licence);
    if (!licCheck.allowed) {
      setCandMsg(`Cannot publish (Rule R11 Licence Gate): ${licCheck.reason || 'unsupported licence'}`);
      return;
    }
    const check = validatePublishableImage({
      aiGenerated: item.aiGenerated,
      licence: item.licence,
      author: item.author,
      creditLine: item.creditLine,
      sourcePageUrl: item.sourcePageUrl,
      citation: item.citation
    });
    if (!check.ok) {
      setCandMsg(`Cannot publish (Rule R2): ${check.errors.join(', ')}`);
      return;
    }
    await putUserImage(item.id, { ...item, status: 'published' });
    setCandMsg(`Published "${item.title}" to Image Atlas.`);
  };

  const conceptCoverage = useMemo(() => {
    return CONCEPTS_SEED.map((c) => {
      const count = publishedLibrary.filter(
        (img) =>
          img.diagnosis.toLowerCase().includes(c.name.split('(')[0].trim().toLowerCase()) ||
          c.aliases.some((a) => img.title.toLowerCase().includes(a.toLowerCase()))
      ).length;
      return { ...c, count };
    });
  }, [publishedLibrary]);

  const handleCreateOcclusionCards = async () => {
    if (!zoomImg) return;
    const noteId = generateUuid();
    const { note, cards } = buildImageOcclusionCards(zoomImg, masks, noteId);
    await putNote(note.id, note);
    for (const c of cards) {
      await putCard(c.id, c);
    }
    setMaskMsg(`Created ${cards.length} non-destructive occlusion flashcard(s) in Memory (FSRS).`);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Real Medical Image Atlas</h1>
          <p className="text-xs text-slate-400 mt-1">
            Rules R1 & R2 enforced: zero AI images, non-destructive occlusion coordinates, full attribution required.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAdd((v) => !v)} className="px-4 py-2.5 rounded-2xl bg-white/10 text-white font-bold text-xs apple-press">
            {showAdd ? 'Hide Add Form' : '+ Add Real Image'}
          </button>
          <button onClick={startDrill} className="px-4 py-2.5 rounded-2xl bg-sky-500 text-white font-bold text-xs apple-press">
            Start 15-Image Diagnosis Drill
          </button>
        </div>
      </div>

      {candMsg && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 flex justify-between">
          <span>{candMsg}</span>
          <button onClick={() => setCandMsg('')} className="font-bold">Dismiss</button>
        </div>
      )}

      {showAdd && (
        <form onSubmit={(e) => void handleSubmitCandidate(e)} className="glass-card rounded-3xl p-5 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-white">Submit Real Image Candidate (Rule R3)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input required value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Title" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
            <input required value={cDiagnosis} onChange={(e) => setCDiagnosis(e.target.value)} placeholder="Diagnosis" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
            <input value={cSubject} onChange={(e) => setCSubject(e.target.value)} placeholder="Subject" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
            <input required value={cImageUrl} onChange={(e) => setCImageUrl(e.target.value)} placeholder="Direct Image URL" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
            <input required value={cSourceUrl} onChange={(e) => setCSourceUrl(e.target.value)} placeholder="Source Page URL" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
            <input required value={cLicence} onChange={(e) => setCLicence(e.target.value)} placeholder="Licence (e.g. CC BY 4.0)" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
            <input required value={cAuthor} onChange={(e) => setCAuthor(e.target.value)} placeholder="Author" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
            <input required value={cCredit} onChange={(e) => setCCredit(e.target.value)} placeholder="Credit Line" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
            <input required value={cCitation} onChange={(e) => setCCitation(e.target.value)} placeholder="Citation / Journal" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white" />
          </div>
          <button type="submit" className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold">
            Save as Candidate
          </button>
        </form>
      )}

      {candidates.length > 0 && (
        <div className="glass-card rounded-3xl p-5 space-y-3 text-xs border border-amber-500/30">
          <h3 className="text-sm font-bold text-amber-300">Candidate Approval Queue ({candidates.length})</h3>
          {candidates.map((c) => (
            <div key={c.id} className="p-3 rounded-2xl bg-black/30 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-bold text-white">{c.data.title} - {c.data.diagnosis}</div>
                <div className="text-slate-400">{c.data.creditLine} | {c.data.licence}</div>
              </div>
              <button onClick={() => void handleApproveCandidate(c.data)} className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-bold">
                Approve & Publish
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="glass-card rounded-3xl p-5 space-y-3 text-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-white">Appendix B Concept Coverage Matrix ({conceptCoverage.filter((c) => c.count > 0).length} / {conceptCoverage.length} covered)</h3>
          <span className="text-[11px] text-slate-400">Green = has verified image, Slate = gap to fill</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {conceptCoverage.map((c) => (
            <span
              key={c.id}
              title={c.reviewedKeyFeatures}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                c.count > 0
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                  : 'bg-white/5 border-white/10 text-slate-400'
              }`}
            >
              {c.name.split('(')[0].trim()} ({c.count})
            </span>
          ))}
        </div>
      </div>

      {drillQs.length > 0 && (
        <div className="glass-card rounded-3xl p-6 space-y-4 border border-sky-500/40">
          <div className="flex justify-between text-xs font-bold text-sky-400 num-tabular">
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
            <div className="space-y-1 text-center">
              <img
                src={drillQs[drillIdx].img.imageUrl || drillQs[drillIdx].img.imageFile}
                alt={drillQs[drillIdx].img.title}
                className="max-h-72 mx-auto rounded-2xl bg-black object-contain"
              />
              <div className="text-[10px] text-slate-400">
                {drillQs[drillIdx].img.creditLine} ({drillQs[drillIdx].img.licence})
              </div>
            </div>
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
        {publishedLibrary.map((img) => (
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
                  setMaskMsg('');
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

      {/* Zoom & Non-Destructive Occlusion Overlay Editor Modal */}
      {zoomImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={() => setZoomImg(null)}>
          <div className="max-w-3xl w-full glass-card rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">{zoomImg.title}</h3>
              <button onClick={() => setZoomImg(null)} className="px-3 py-1 rounded-full bg-white/10 text-xs text-white">Close</button>
            </div>

            <div className="relative max-h-80 overflow-hidden bg-black rounded-2xl flex items-center justify-center mx-auto">
              <div className="relative inline-block" style={{ transform: `scale(${zoom})` }}>
                <img src={zoomImg.imageUrl || zoomImg.imageFile} alt={zoomImg.diagnosis} className="max-h-80 object-contain block" />
                {masks.map((m) => (
                  <div
                    key={m.id}
                    style={{ left: `${m.x}%`, top: `${m.y}%`, width: `${m.w}%`, height: `${m.h}%` }}
                    className="absolute bg-sky-500/75 border-2 border-white rounded flex items-center justify-center text-[10px] font-bold text-white"
                  >
                    {m.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 text-xs">
              <div className="flex gap-2 items-center">
                <button onClick={() => setZoom((z) => Math.max(1, z - 0.25))} className="px-3 py-1 rounded bg-white/10 text-white">- Zoom</button>
                <span className="text-slate-300 font-mono num-tabular">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="px-3 py-1 rounded bg-white/10 text-white">+ Zoom</button>
              </div>
              <span className="text-slate-400">{zoomImg.creditLine}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <strong className="text-white">Image-Occlusion Mask Overlays (Coordinates Only)</strong>
                <button
                  onClick={() => setMasks((p) => [...p, { id: `m${p.length + 1}`, label: `Region ${p.length + 1}`, x: 15 + (p.length * 10) % 50, y: 20, w: 25, h: 20 }])}
                  className="px-2.5 py-1 rounded-lg bg-white/10 text-sky-300 font-bold"
                >
                  + Add Mask Box
                </button>
              </div>
              {masks.map((m, idx) => (
                <div key={m.id} className="grid grid-cols-6 gap-2 items-center">
                  <input value={m.label} onChange={(e) => setMasks((p) => p.map((x, i) => (i === idx ? { ...x, label: e.target.value } : x)))} className="col-span-2 bg-white/5 border border-white/10 rounded-lg p-1.5 text-white" />
                  <input type="number" min={0} max={90} value={m.x} onChange={(e) => setMasks((p) => p.map((x, i) => (i === idx ? { ...x, x: Number(e.target.value) } : x)))} className="bg-white/5 border border-white/10 rounded-lg p-1.5 text-white" />
                  <input type="number" min={0} max={90} value={m.y} onChange={(e) => setMasks((p) => p.map((x, i) => (i === idx ? { ...x, y: Number(e.target.value) } : x)))} className="bg-white/5 border border-white/10 rounded-lg p-1.5 text-white" />
                  <input type="number" min={5} max={95} value={m.w} onChange={(e) => setMasks((p) => p.map((x, i) => (i === idx ? { ...x, w: Number(e.target.value) } : x)))} className="bg-white/5 border border-white/10 rounded-lg p-1.5 text-white" />
                  <button onClick={() => setMasks((p) => p.filter((_, i) => i !== idx))} className="text-rose-400 font-bold">Remove</button>
                </div>
              ))}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button onClick={() => void handleCreateOcclusionCards()} className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold">
                  Create Occlusion Flashcard (FSRS)
                </button>
                {maskMsg && <span className="text-emerald-300 font-semibold">{maskMsg}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
