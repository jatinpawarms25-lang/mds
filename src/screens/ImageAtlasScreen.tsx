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
import {
  EXPANDED_OPEN_SOURCE_DENTAL_LIBRARY,
  searchOpenSourceMedicalImages
} from '../data/openSourceImages';
import { useSyncCollection } from '../hooks/useSyncStore';
import type { CardRecord, NoteRecord } from '../memory/types';
import { generateUuid, syncEngine } from '../sync/syncEngine';
import { soundFX } from '../utils/audio';
import { triggerHaptic } from '../utils/haptics';

type AtlasTab = 'all' | 'radiograph' | 'histopathology' | 'clinical' | 'live_finder' | 'drill';

const SEARCH_PRESETS = [
  'Ameloblastoma',
  'Dentigerous cyst',
  'Keratocyst',
  'Pleomorphic adenoma',
  'Adenoid cystic',
  'Oral lichen planus',
  'Leukoplakia',
  'Pemphigus vulgaris',
  'Fibrous dysplasia',
  'Taurodontism',
  'Le Fort fracture'
];

export default function ImageAtlasScreen() {
  const { items: userImages, putItem: putUserImage } = useSyncCollection<ImageCandidate>('user_images');
  const { putItem: putNote } = useSyncCollection<NoteRecord>('notes');
  const { putItem: putCard } = useSyncCollection<CardRecord>('cards');

  const [activeTab, setActiveTab] = useState<AtlasTab>('all');
  const [zoomImg, setZoomImg] = useState<ImageEntry | null>(null);
  const [zoom, setZoom] = useState(1);
  const [masks, setMasks] = useState<OcclusionMask[]>([
    { id: 'm1', label: 'Key feature', x: 30, y: 30, w: 30, h: 25 }
  ]);
  const [maskMsg, setMaskMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // Live Open-Source Search State
  const [liveQuery, setLiveQuery] = useState('');
  const [liveResults, setLiveResults] = useState<ImageEntry[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);

  // Candidate submission
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
    return [...DEFAULT_IMAGE_LIBRARY, ...EXPANDED_OPEN_SOURCE_DENTAL_LIBRARY, ...approvedUser];
  }, [userImages]);

  const candidates = useMemo(() => userImages.filter((u) => u.data.status === 'candidate'), [userImages]);

  const displayedImages = useMemo(() => {
    if (activeTab === 'radiograph') return publishedLibrary.filter((img) => img.type === 'radiograph');
    if (activeTab === 'histopathology') return publishedLibrary.filter((img) => img.type === 'histopathology');
    if (activeTab === 'clinical') return publishedLibrary.filter((img) => img.type === 'clinical');
    return publishedLibrary;
  }, [publishedLibrary, activeTab]);

  const handleLiveSearch = async (term?: string) => {
    const q = term !== undefined ? term : liveQuery;
    if (!q.trim()) return;
    setLiveLoading(true);
    soundFX.playTap();
    const results = await searchOpenSourceMedicalImages({ query: q, limit: 16 });
    setLiveResults(results);
    setLiveLoading(false);
    if (results.length > 0) {
      soundFX.playChime();
    }
  };

  const handleSaveToAtlas = async (img: ImageEntry) => {
    soundFX.playChime();
    triggerHaptic('success');
    const id = `user_${generateUuid()}`;
    await putUserImage(id, {
      ...img,
      id,
      citation: img.sourceName || img.creditLine,
      status: 'published',
      aiGenerated: false
    });
    setToastMsg(`Saved "${img.title}" to your permanent Atlas!`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handleQuickFlashcard = async (img: ImageEntry) => {
    soundFX.playChime();
    triggerHaptic('success');
    const noteId = generateUuid();
    const { note, cards } = buildImageOcclusionCards(
      img,
      [{ id: 'm1', label: img.diagnosis, x: 25, y: 25, w: 50, h: 40 }],
      noteId
    );
    await putNote(note.id, note);
    for (const c of cards) {
      await putCard(c.id, c);
    }
    setToastMsg(`Created FSRS Flashcard for "${img.diagnosis}"!`);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const startDrill = () => {
    soundFX.playTap();
    setActiveTab('drill');
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
    soundFX.playChime();
    const id = generateUuid();
    await syncEngine.putRecordLocal('image_drills', id, {
      id,
      date: new Date().toISOString().slice(0, 10),
      score: drillScore,
      total: drillQs.length * 4
    });
    setDrillQs([]);
    setActiveTab('all');
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
    soundFX.playChime();
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto fluid-screen">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-emerald-500 text-white font-bold text-xs shadow-2xl flex items-center gap-2">
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Open-Source Dental Image Atlas</h1>
          <p className="text-xs text-slate-400 mt-1">
            Unlimited open-source medical &amp; dental diagnosis images from Wikimedia Commons, NIH &amp; peer-reviewed archives.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="px-3.5 py-2 rounded-xl bg-white/10 text-white font-bold text-xs apple-press min-h-[44px]"
          >
            {showAdd ? 'Hide Custom Add' : '+ Add Image URL'}
          </button>
          <button
            type="button"
            onClick={startDrill}
            className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs apple-press min-h-[44px]"
          >
            15-Image Diagnosis Drill
          </button>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {([
          ['all', `All Verified Atlas (${publishedLibrary.length})`],
          ['radiograph', 'Radiographs (OPG / CBCT)'],
          ['histopathology', 'Histopathology Slides'],
          ['clinical', 'Clinical Lesions'],
          ['live_finder', 'Unlimited Open-Source Finder']
        ] as const).map(([tabKey, label]) => (
          <button
            key={tabKey}
            type="button"
            onClick={() => {
              soundFX.playTap();
              setActiveTab(tabKey);
            }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] ${
              activeTab === tabKey
                ? 'bg-sky-500 text-white shadow-sm'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {candMsg && (
        <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 flex justify-between">
          <span>{candMsg}</span>
          <button type="button" onClick={() => setCandMsg('')} className="font-bold">Dismiss</button>
        </div>
      )}

      {showAdd && (
        <form onSubmit={(e) => void handleSubmitCandidate(e)} className="glass-card rounded-3xl p-5 space-y-3 text-xs">
          <h3 className="text-sm font-bold text-white">Submit Real Image Candidate (Rule R3)</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input required value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="Title" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]" />
            <input required value={cDiagnosis} onChange={(e) => setCDiagnosis(e.target.value)} placeholder="Diagnosis" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]" />
            <input value={cSubject} onChange={(e) => setCSubject(e.target.value)} placeholder="Subject" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]" />
            <input required value={cImageUrl} onChange={(e) => setCImageUrl(e.target.value)} placeholder="Direct Image URL" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]" />
            <input required value={cSourceUrl} onChange={(e) => setCSourceUrl(e.target.value)} placeholder="Source Page URL" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]" />
            <input required value={cLicence} onChange={(e) => setCLicence(e.target.value)} placeholder="Licence (e.g. CC BY 4.0)" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]" />
            <input required value={cAuthor} onChange={(e) => setCAuthor(e.target.value)} placeholder="Author" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]" />
            <input required value={cCredit} onChange={(e) => setCCredit(e.target.value)} placeholder="Credit Line" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]" />
            <input required value={cCitation} onChange={(e) => setCCitation(e.target.value)} placeholder="Citation / Journal" className="bg-white/5 border border-white/10 rounded-xl p-2.5 text-white min-h-[44px]" />
          </div>
          <button type="submit" className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold min-h-[44px]">
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
              <button type="button" onClick={() => void handleApproveCandidate(c.data)} className="px-3 py-1.5 rounded-xl bg-emerald-500 text-white font-bold">
                Approve &amp; Publish
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tab: Unlimited Open-Source Live Finder */}
      {activeTab === 'live_finder' && (
        <div className="space-y-6">
          <div className="glass-card rounded-2xl sm:rounded-3xl p-5 sm:p-6 space-y-4 border border-sky-400/30">
            <div className="border-b border-white/10 pb-3">
              <h2 className="text-base font-extrabold text-white">Live Open-Source Dental Image Search</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Search Wikimedia Commons and open medical repositories dynamically for any diagnosis, pathology, or surgical condition.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={liveQuery}
                onChange={(e) => setLiveQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleLiveSearch(); }}
                placeholder="Search any diagnosis (e.g. Dentigerous cyst, Pleomorphic adenoma, Lichen planus)..."
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-sky-400 min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => void handleLiveSearch()}
                disabled={liveLoading}
                className="px-6 py-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm shrink-0 min-h-[44px] apple-press"
              >
                {liveLoading ? 'Searching...' : 'Search'}
              </button>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">High-Yield Preset Searches:</span>
              <div className="flex flex-wrap gap-1.5">
                {SEARCH_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setLiveQuery(preset);
                      void handleLiveSearch(preset);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/15 text-sky-300 border border-white/10 transition-colors"
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Live Search Results */}
          {liveResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">
                  Search Results ({liveResults.length} Open-Source Images)
                </h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {liveResults.map((img) => (
                  <div key={img.id} className="glass-card rounded-2xl sm:rounded-3xl p-4 space-y-3 border border-white/10 flex flex-col justify-between">
                    <div className="space-y-3">
                      <button
                        type="button"
                        onClick={() => {
                          setZoomImg(img);
                          setZoom(1);
                          setMaskMsg('');
                        }}
                        className="w-full h-44 bg-black/60 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 cursor-zoom-in"
                      >
                        <img
                          src={img.imageUrl}
                          alt={img.diagnosis}
                          loading="lazy"
                          className="max-h-44 object-contain"
                        />
                      </button>
                      <div>
                        <span className="text-[10px] font-bold text-sky-400 uppercase">{img.subject}</span>
                        <h4 className="text-xs font-bold text-white mt-0.5 line-clamp-2">{img.title}</h4>
                      </div>
                      <div className="text-[10px] text-slate-400 space-y-0.5">
                        <div><strong>Licence:</strong> {img.licence}</div>
                        <div><strong>Author:</strong> {img.author}</div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/10 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void handleSaveToAtlas(img)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold hover:bg-emerald-500/30 min-h-[36px]"
                      >
                        + Add to My Atlas
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleQuickFlashcard(img)}
                        className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] font-bold hover:bg-sky-500/30 min-h-[36px]"
                      >
                        + Make Flashcard
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setZoomImg(img);
                          setZoom(1);
                          setMaskMsg('');
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white/10 text-white text-[10px] font-bold hover:bg-white/15 min-h-[36px]"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab: Standard Atlas View */}
      {activeTab !== 'live_finder' && activeTab !== 'drill' && (
        <div className="space-y-6">
          <div className="glass-card rounded-3xl p-5 space-y-3 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white">
                Core NEET-MDS Concept Coverage ({conceptCoverage.filter((c) => c.count > 0).length} / {conceptCoverage.length} covered)
              </h3>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {displayedImages.map((img) => (
              <div key={img.id} className="glass-card rounded-3xl p-4 space-y-3 flex flex-col justify-between">
                <div>
                  {img.isPlaceholder || (!img.imageUrl && !img.imageFile) ? (
                    <div className="w-full h-44 bg-white/[0.04] rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-white/10 space-y-2">
                      <span className="text-xs font-bold text-amber-300">Linked External Case</span>
                      <a href={img.placeholderSourceUrl || img.sourcePageUrl} target="_blank" rel="noreferrer" className="text-xs text-sky-400 underline font-bold">
                        View Original at Source
                      </a>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setZoomImg(img);
                        setZoom(1);
                        setMaskMsg('');
                      }}
                      className="w-full h-44 bg-black/60 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 cursor-zoom-in"
                    >
                      <img src={img.imageUrl || img.imageFile} alt={img.diagnosis} loading="lazy" className="max-h-44 object-contain" />
                    </button>
                  )}
                  <div className="mt-3">
                    <span className="text-[10px] font-bold text-sky-400 uppercase">{img.subject}</span>
                    <h3 className="text-xs font-bold text-white mt-0.5">{img.title}</h3>
                    <p className="text-[11px] text-emerald-400 font-semibold">{img.diagnosis}</p>
                  </div>
                  <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 space-y-1 mt-2">
                    <div><strong>Source:</strong> {img.sourceName} ({img.licence})</div>
                    <div><strong>Credit:</strong> {img.creditLine}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void handleQuickFlashcard(img)}
                    className="w-full py-1.5 rounded-xl bg-sky-500/20 text-sky-300 border border-sky-400/30 text-[10px] font-bold hover:bg-sky-500/30 min-h-[36px]"
                  >
                    + FSRS Flashcard
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Drill Active */}
      {drillQs.length > 0 && activeTab === 'drill' && (
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
                type="button"
                onClick={() => {
                  if (drillAns !== null) return;
                  setDrillAns(oIdx);
                  const isCorrect = oIdx === drillQs[drillIdx].correctIdx;
                  if (isCorrect) soundFX.playChime();
                  else soundFX.playTap();
                  setDrillScore((s) => s + (isCorrect ? 4 : -1));
                }}
                className={`p-3 rounded-xl border text-left min-h-[44px] ${
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
              type="button"
              onClick={() => {
                soundFX.playTap();
                if (drillIdx + 1 < drillQs.length) {
                  setDrillIdx((i) => i + 1);
                  setDrillAns(null);
                } else {
                  void finishDrill();
                }
              }}
              className="px-4 py-2 rounded-xl bg-sky-500 text-white text-xs font-bold min-h-[44px]"
            >
              {drillIdx + 1 < drillQs.length ? 'Next Image' : 'Finish & Save Drill'}
            </button>
          )}
        </div>
      )}

      {/* Zoom & Non-Destructive Occlusion Overlay Editor Modal */}
      {zoomImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={() => setZoomImg(null)}>
          <div className="max-w-3xl w-full glass-card rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold text-white">{zoomImg.title}</h3>
                <p className="text-xs text-emerald-300 font-semibold">{zoomImg.diagnosis}</p>
              </div>
              <button type="button" onClick={() => setZoomImg(null)} className="px-3 py-1 rounded-full bg-white/10 text-xs text-white">Close</button>
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
                <button type="button" onClick={() => setZoom((z) => Math.max(1, z - 0.25))} className="px-3 py-1 rounded bg-white/10 text-white">- Zoom</button>
                <span className="text-slate-300 font-mono num-tabular">{Math.round(zoom * 100)}%</span>
                <button type="button" onClick={() => setZoom((z) => Math.min(3, z + 0.25))} className="px-3 py-1 rounded bg-white/10 text-white">+ Zoom</button>
                <button type="button" onClick={() => setZoom(1)} className="px-2.5 py-1 rounded bg-white/5 text-slate-400">Reset</button>
              </div>
              <span className="text-slate-400">{zoomImg.creditLine}</span>
            </div>

            <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <strong className="text-white">Image-Occlusion Mask Overlays (Coordinates Only)</strong>
                <button
                  type="button"
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
                  <button type="button" onClick={() => setMasks((p) => p.filter((_, i) => i !== idx))} className="text-rose-400 font-bold">Remove</button>
                </div>
              ))}
              <div className="pt-2 flex items-center justify-between gap-3">
                <button type="button" onClick={() => void handleCreateOcclusionCards()} className="px-4 py-2 rounded-xl bg-sky-500 text-white font-bold">
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
