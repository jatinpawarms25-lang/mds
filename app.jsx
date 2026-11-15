// ==============================================================================
// NEET-MDS Top-10 Planner (MDS OS) - Universal Apple Workstation
// Target: AIR 1-10 - Target Branch: OMFS - Real Cloud Sync & CBT Engine
// Strict ASCII Quotes Only - Zero AI Images - Realtime Supabase
// ==============================================================================

const { useState, useEffect, useMemo, useRef } = React;

// Access global preloaded data stores
const DEFAULT_CONTENT = window.DEFAULT_CONTENT_PACK || {};
const DEFAULT_IMAGES = window.DEFAULT_IMAGE_LIBRARY || [];
const STUDY_WEEKS = window.STUDY_PLAN_WEEKS || [];
const HIDDEN_RULES = window.HIDDEN_RULES_DATA || [];
const CHECKLISTS = window.MASTER_CHECKLISTS || [];

// 16 Government AIQ Dental Colleges Data (2025/2026 Baseline)
const GOVT_COLLEGES_DATA = [
  { id: 'c1', name: "King George's Medical University (KGMU), Lucknow", state: 'Uttar Pradesh', closingRank: 4, stipendMonthly: 105000, feeAnnual: 36000, bondYears: 2, seats: 5 },
  { id: 'c2', name: 'Institute of Medical Sciences (IMS), BHU, Varanasi', state: 'Uttar Pradesh (Central)', closingRank: 9, stipendMonthly: 110000, feeAnnual: 22000, bondYears: 0, seats: 4 },
  { id: 'c3', name: 'Govt Dental College, Rohtak (PGIDS)', state: 'Haryana', closingRank: 18, stipendMonthly: 72000, feeAnnual: 45000, bondYears: 1, seats: 6 },
  { id: 'c4', name: 'Lady Hardinge Medical College, New Delhi', state: 'Delhi (Central)', closingRank: 24, stipendMonthly: 120000, feeAnnual: 18000, bondYears: 0, seats: 3 },
  { id: 'c5', name: 'SCB Dental College, Cuttack', state: 'Odisha', closingRank: 39, stipendMonthly: 70000, feeAnnual: 30000, bondYears: 1, seats: 4 },
  { id: 'c6', name: 'Dr. Ziauddin Ahmad Dental College, AMU, Aligarh', state: 'Uttar Pradesh (Central)', closingRank: 51, stipendMonthly: 98000, feeAnnual: 25000, bondYears: 0, seats: 4 },
  { id: 'c7', name: 'Govt Dental College, Mumbai', state: 'Maharashtra', closingRank: 54, stipendMonthly: 78000, feeAnnual: 55000, bondYears: 1, seats: 5 },
  { id: 'c8', name: 'Govt Dental College, Jaipur', state: 'Rajasthan', closingRank: 58, stipendMonthly: 75000, feeAnnual: 35000, bondYears: 2, seats: 4 },
  { id: 'c9', name: 'Govt Dental College, Raipur', state: 'Chhattisgarh', closingRank: 75, stipendMonthly: 68000, feeAnnual: 28000, bondYears: 2, seats: 3 },
  { id: 'c10', name: 'Govt Dental College, Hyderabad', state: 'Telangana', closingRank: 77, stipendMonthly: 70000, feeAnnual: 32000, bondYears: 1, seats: 4 },
  { id: 'c11', name: 'Govt Dental College, Aurangabad', state: 'Maharashtra', closingRank: 78, stipendMonthly: 78000, feeAnnual: 55000, bondYears: 1, seats: 4 },
  { id: 'c12', name: 'Govt Dental College, Thiruvananthapuram', state: 'Kerala', closingRank: 80, stipendMonthly: 72000, feeAnnual: 40000, bondYears: 1, seats: 4 },
  { id: 'c13', name: 'Tamil Nadu Govt Dental College, Chennai', state: 'Tamil Nadu', closingRank: 93, stipendMonthly: 68000, feeAnnual: 35000, bondYears: 2, seats: 5 },
  { id: 'c14', name: 'Govt Dental College, Jamnagar', state: 'Gujarat', closingRank: 115, stipendMonthly: 84000, feeAnnual: 25000, bondYears: 1, seats: 3 },
  { id: 'c15', name: 'Goa Dental College, Bambolim', state: 'Goa', closingRank: 131, stipendMonthly: 80000, feeAnnual: 48000, bondYears: 1, seats: 3 },
  { id: 'c16', name: 'Govt Dental College, Kadapa (Last Listed Govt)', state: 'Andhra Pradesh', closingRank: 156, stipendMonthly: 65000, feeAnnual: 30000, bondYears: 1, seats: 3 },
  { id: 'c17', name: 'MAIDS New Delhi (Directional Baseline)', state: 'Delhi', closingRank: 1, stipendMonthly: 125000, feeAnnual: 16000, bondYears: 0, seats: 2 }
];

// High-Yield Mixed Question Pool for Daily Diagnostic Quiz
const DAILY_QUIZ_POOL = [
  { id: 'dq1', subject: 'Public Health Dentistry', question: 'The black band of the CPI (WHO) periodontal probe spans which range?', options: ['2.5-4.5 mm', '3.5-5.5 mm', '4.5-6.5 mm', '5.5-7.5 mm'], correct: 1, explanation: 'Volatile Sheet: The WHO CPI probe features a 0.5 mm spherical ball tip and a prominent black calibration band spanning 3.5 to 5.5 mm.' },
  { id: 'dq2', subject: 'Public Health Dentistry', question: 'In CPI (Community Periodontal Index) scoring, Code 3 represents:', options: ['Bleeding on probing', 'Calculus present', 'Pocket depth of 4-5 mm', 'Pocket depth of 6 mm or more'], correct: 2, explanation: 'Volatile Sheet: CPI scoring criteria: Code 0 = healthy; 1 = bleeding; 2 = calculus/defective restoration; 3 = pocket 4-5 mm (gingival margin within black band); 4 = pocket 6 mm or more.' },
  { id: 'dq3', subject: 'Public Health Dentistry', question: 'The DMFT (Decayed, Missing, Filled Teeth) index was introduced by:', options: ['Klein, Palmer & Knutson (1938)', 'Greene & Vermillion (1960)', 'Loe & Silness (1963)', 'Russell (1956)'], correct: 0, explanation: 'Volatile Sheet: Klein, Palmer & Knutson introduced the DMFT index in 1938. It is irreversible and cumulative, with a maximum score of 32 (or 28 excluding third molars).' },
  { id: 'dq4', subject: 'Public Health Dentistry', question: 'Dean\'s Fluorosis Index is scored on which teeth?', options: ['All teeth present', 'The two most affected teeth', 'Six specific Ramfjord index teeth', 'The single most severely affected tooth'], correct: 1, explanation: 'Volatile Sheet: Dean\'s Fluorosis Index (1934, revised 1942) classifies severity across 6 categories (normal to severe) based on the two most affected teeth.' },
  { id: 'dq5', subject: 'Public Health Dentistry', question: 'The Probably Toxic Dose (PTD) of elemental fluoride is defined as:', options: ['1 mg/kg', '5 mg/kg', '16 mg/kg', '32 mg/kg'], correct: 1, explanation: 'Volatile Sheet: Whitford defined PTD as 5 mg F/kg. In contrast, Safely Tolerated Dose (STD) is 8-16 mg/kg (CLD/4), and Certainly Lethal Dose (CLD) is 32-64 mg/kg.' },
  { id: 'dq6', subject: 'Public Health Dentistry', question: 'The Nalgonda defluoridation technique utilizes which chemical combination?', options: ['Alum + lime + bleaching powder', 'Activated alumina alone', 'Reverse osmosis membrane filtration', 'Lime + sodium carbonate only'], correct: 0, explanation: 'Volatile Sheet: The classic Nalgonda defluoridation technique sequentially adds alum (coagulant), lime (accelerator/alkalizer), and bleaching powder (disinfection).' },
  { id: 'dq7', subject: 'Public Health Dentistry', question: 'The optimum fluoride concentration in drinking water under the Galagan formula is:', options: ['0.2-0.5 ppm', '0.7-1.2 ppm', '1.5-2.0 ppm', '2.5-3.0 ppm'], correct: 1, explanation: 'Volatile Sheet: The temperature-dependent optimum fluoride level in drinking water is 0.7 to 1.2 ppm (Galagan formula; 1.2 ppm in cold climates, 0.7 ppm in hot climates; WHO standard 1.0 ppm).' },
  { id: 'dq8', subject: 'General Human Physiology & Biochemistry', question: 'In competitive enzyme inhibition, how do Km and Vmax change?', options: ['Km decreases, Vmax unchanged', 'Km increases (apparent lower affinity), Vmax unchanged', 'Km unchanged, Vmax decreases', 'Both Km and Vmax increase'], correct: 1, explanation: 'Volatile Sheet: Competitive inhibitors compete for the substrate-binding active site, increasing Km (lower affinity) while Vmax remains unchanged at saturating substrate.' },
  { id: 'dq9', subject: 'General Human Physiology & Biochemistry', question: 'The committed, rate-limiting enzyme of glycolysis is:', options: ['Hexokinase', 'Phosphofructokinase-1 (PFK-1)', 'Pyruvate kinase', 'Lactate dehydrogenase'], correct: 1, explanation: 'Volatile Sheet: PFK-1 is the key rate-limiting pacemaker of glycolysis. In the TCA cycle, it is isocitrate dehydrogenase; in the urea cycle, it is CPS-I.' },
  { id: 'dq10', subject: 'General Human Physiology & Biochemistry', question: 'Which blood coagulation factors are strictly dependent on Vitamin K for gamma-carboxylation?', options: ['Factors I, V, VIII, and XIII', 'Factors II, VII, IX, and X', 'Factors II, III, V, and VII', 'Factors V, VIII, IX, and XI'], correct: 1, explanation: 'Volatile Sheet: Vitamin K acts as an essential cofactor for gamma-glutamyl carboxylase on Factors II (prothrombin), VII, IX, and X, plus Proteins C and S.' },
  { id: 'dq11', subject: 'General Human Physiology & Biochemistry', question: 'Post-translational hydroxylation of proline and lysine residues in collagen biosynthesis requires:', options: ['Vitamin K and Copper', 'Vitamin C (Ascorbic acid) and Ferrous iron (Fe2+)', 'Vitamin D and Calcium', 'Vitamin B6 and Zinc'], correct: 1, explanation: 'Volatile Sheet: Prolyl and lysyl hydroxylases require Vitamin C (maintains iron in Fe2+ state) and molecular oxygen. Subsequent extracellular cross-linking requires lysyl oxidase with Copper (Cu).' },
  { id: 'dq12', subject: 'General Human Physiology & Biochemistry', question: 'The rate-limiting enzyme in hepatic cholesterol biosynthesis is:', options: ['HMG-CoA synthase', 'HMG-CoA reductase', 'Squalene monooxygenase', 'Acetyl-CoA carboxylase'], correct: 1, explanation: 'Volatile Sheet: HMG-CoA reductase catalyzes the conversion of HMG-CoA to mevalonate and represents the principal target for statin pharmacotherapy.' },
  { id: 'dq13', subject: 'General Human Physiology & Biochemistry', question: 'Which coenzyme is mandatory for transamination and decarboxylation of amino acids?', options: ['Thiamine pyrophosphate (TPP)', 'Pyridoxal phosphate (Vitamin B6)', 'Nicotinamide adenine dinucleotide (NAD+)', 'Flavin adenine dinucleotide (FAD)'], correct: 1, explanation: 'Volatile Sheet: Pyridoxal phosphate (PLP), derived from Vitamin B6, serves as the prosthetic coenzyme for transaminases (AST, ALT).' },
  { id: 'dq14', subject: 'Dental Materials', question: 'The gamma-2 phase of set dental amalgam is chemically composed of:', options: ['Ag3Sn (Gamma)', 'Ag2Hg3 (Gamma-1)', 'Sn7-8Hg (Gamma-2)', 'Cu6Sn5 (Eta-prime)'], correct: 2, explanation: 'Volatile Sheet: The gamma-2 phase (Sn7-8Hg) is the weakest, softest, and most corrosion-prone component. High-copper amalgam (>6% Cu) completely eliminates it via eta-prime (Cu6Sn5) formation.' },
  { id: 'dq15', subject: 'Dental Materials', question: 'An amalgam alloy is officially designated as high copper when its copper content exceeds:', options: ['2% by weight', '6% by weight', '15% by weight', '30% by weight'], correct: 1, explanation: 'Volatile Sheet: Traditional low-copper amalgam has <6% Cu. High-copper amalgam contains >6% Cu (typically 9% to 30%), preventing gamma-2 phase crystallization.' },
  { id: 'dq16', subject: 'Dental Materials', question: 'The recommended Water-to-Powder (W:P) ratio for Type III Dental Stone is:', options: ['0.50-0.75', '0.45-0.50', '0.28-0.30', '0.18-0.22'], correct: 2, explanation: 'Volatile Sheet: Craig & Phillips norms: Type I impression plaster 0.50-0.75; Type II model plaster 0.45-0.50; Type III dental stone 0.28-0.30; Type IV die stone 0.22-0.24; Type V 0.18-0.22.' },
  { id: 'dq17', subject: 'Dental Materials', question: 'The theoretical stoichiometric gauging water required to react with 100 g of calcium sulfate hemihydrate is:', options: ['10.0 ml', '18.6 ml', '25.0 ml', '32.0 ml'], correct: 1, explanation: 'Volatile Sheet: Chemically, only 18.6 ml of water is needed per 100 g of hemihydrate to convert it to dihydrate. Any excess water added for workability produces residual voids and lowers compressive strength.' },
  { id: 'dq18', subject: 'Oral & Maxillofacial Surgery (OMFS)', question: 'The maximum recommended dose of 2% Lidocaine WITHOUT a vasoconstrictor in a healthy adult is:', options: ['3.3 mg/kg, max 200 mg', '4.4 mg/kg, absolute max 300 mg', '7.0 mg/kg, absolute max 500 mg', '10.0 mg/kg, max 600 mg'], correct: 1, explanation: 'Volatile Sheet: Malamed local anaesthetic norms: Lidocaine plain = 4.4 mg/kg (absolute ceiling 300 mg). With adrenaline = 7 mg/kg (absolute ceiling 500 mg).' },
  { id: 'dq19', subject: 'Oral & Maxillofacial Surgery (OMFS)', question: 'The dissociation constant (pKa) of Lidocaine is:', options: ['6.5', '7.4', '7.9', '8.1'], correct: 2, explanation: 'Volatile Sheet: Lidocaine has a pKa of 7.9. In inflamed acidic tissue (pH 5-6), fewer uncharged lipophilic base molecules are available to penetrate the nerve membrane, causing local anaesthetic failure.' },
  { id: 'dq20', subject: 'Oral & Maxillofacial Surgery (OMFS)', question: 'Which local anaesthetic molecule possesses an amide linkage but also contains an ester group on its thiophene ring?', options: ['Lidocaine', 'Articaine', 'Bupivacaine', 'Mepivacaine'], correct: 1, explanation: 'Volatile Sheet: Articaine is uniquely formulated with a thiophene ring containing an ester side chain, enabling rapid clearance and inactivation by plasma pseudocholinesterase.' },
  { id: 'dq21', subject: 'Oral & Maxillofacial Surgery (OMFS)', question: 'The maximum allowable adrenaline dose per appointment for a patient with ischemic cardiac disease / angina is:', options: ['200 ug (0.2 mg)', '100 ug (0.1 mg)', '40 ug (0.04 mg; approx 2 cartridges of 1:100,000)', '500 ug (0.5 mg)'], correct: 2, explanation: 'Volatile Sheet: For severe cardiac patients, the adrenaline ceiling is 40 ug (0.04 mg), roughly equivalent to 2 cartridges of 1:100,000 (20 ug each) or 4 cartridges of 1:200,000 (10 ug each). Healthy adult ceiling is 200 ug.' },
  { id: 'dq22', subject: 'Oral & Maxillofacial Surgery (OMFS)', question: 'A standard 1.8 ml dental cartridge of 4% Articaine contains how many milligrams of active drug?', options: ['36 mg', '54 mg', '72 mg', '90 mg'], correct: 2, explanation: 'Volatile Sheet: A 4% concentration equals 40 mg/ml. For a 1.8 ml cartridge: 40 mg/ml * 1.8 ml = 72 mg of Articaine.' },
  { id: 'dq23', subject: 'Orthodontics & Dentofacial Orthopaedics', question: 'In Steiner Cephalometric Analysis, the normal Caucasian mean value for the SNA angle is:', options: ['78 deg +- 2 deg', '80 deg +- 2 deg', '82 deg +- 2 deg', '84 deg +- 2 deg'], correct: 2, explanation: 'Volatile Sheet: Steiner cephalometric norms: SNA = 82 deg +- 2 deg (maxillary anteroposterior position relative to cranial base); SNB = 80 deg +- 2 deg; ANB = 2 deg +- 2 deg.' },
  { id: 'dq24', subject: 'Orthodontics & Dentofacial Orthopaedics', question: 'An ANB angle of 2 degrees to 4 degrees indicates which skeletal relationship?', options: ['Skeletal Class III', 'Skeletal Class I', 'Severe Skeletal Class II', 'Bimaxillary protrusion only'], correct: 1, explanation: 'Volatile Sheet: In Steiner analysis, an ANB angle of 2 deg (range 2-4 deg) represents a normal Class I skeletal relationship. ANB >4 deg indicates Class II, while ANB <2 deg indicates Class III.' },
  { id: 'dq25', subject: 'Orthodontics & Dentofacial Orthopaedics', question: 'In Downs Cephalometric Analysis, the mean value for the Y-axis (growth vector) is:', options: ['49.4 deg', '54.4 deg', '59.4 deg', '64.4 deg'], correct: 2, explanation: 'Volatile Sheet: Downs Y-axis norm is 59.4 deg (angle between sella-gnathion and Frankfort horizontal plane). Values >59.4 deg indicate vertical growth tendency.' },
  { id: 'dq26', subject: 'Dental Anatomy & Histology', question: 'The typical chronological sequence of eruption for primary (deciduous) dentition is:', options: ['A-B-C-D-E', 'A-B-D-C-E (Central, Lateral, First Molar, Canine, Second Molar)', 'A-D-B-C-E', 'B-A-D-C-E'], correct: 1, explanation: 'Volatile Sheet: Deciduous teeth erupt in the sequence A-B-D-C-E: Central incisors (6-7m), Lateral incisors (7-8m), First molars (12-15m), Canines (18-20m), Second molars (24-30m).' },
  { id: 'dq27', subject: 'Dental Anatomy & Histology', question: 'According to Logan & Kronfeld chronology, which permanent tooth initiates calcification at birth?', options: ['Mandibular Central Incisor', 'Permanent First Molar', 'Maxillary Canine', 'Permanent First Premolar'], correct: 1, explanation: 'Volatile Sheet: The permanent first molar begins calcification at birth and erupts at approximately 6 years of age. Its root completion occurs around 9-10 years of age.' },
  { id: 'dq28', subject: 'Dental Anatomy & Histology', question: 'In the mandibular permanent dentition eruption sequence (6-1-2-3-4-5-7-8), which tooth erupts immediately after the lateral incisor?', options: ['Permanent Canine (Tooth 3)', 'First Premolar (Tooth 4)', 'Second Premolar (Tooth 5)', 'Second Molar (Tooth 7)'], correct: 0, explanation: 'Volatile Sheet: In the mandible, the permanent canine erupts BEFORE the premolars (sequence: 6-1-2-3-4-5-7-8). In the maxilla, the first premolar erupts before the canine (sequence: 6-1-2-4-3-5-7-8).' },
  { id: 'dq29', subject: 'Periodontology', question: 'Russell\'s Periodontal Index (PI) was formulated in which year?', options: ['1956', '1959', '1960', '1963'], correct: 0, explanation: 'Volatile Sheet: Chronology of periodontal indices: Russell\'s Periodontal Index (1956); Ramfjord Periodontal Disease Index PDI (1959); OHI-S (1960); Gingival Index (1963).' },
  { id: 'dq30', subject: 'Periodontology', question: 'The Gingival Index (GI) was introduced by which investigators?', options: ['Greene & Vermillion (1960)', 'Loe & Silness (1963)', 'Russell (1956)', 'Ramfjord (1959)'], correct: 1, explanation: 'Volatile Sheet: The Gingival Index was established by Loe & Silness in 1963 using index teeth 16, 12, 24, 36, 32, 44. The Plaque Index (PI) was established by Silness & Loe in 1964.' }
];

// Sample Practice Questions for Timed CBT Mock Simulator (100 in Part A, 140 in Part B)
const CBT_PART_A_MOCK_QUESTIONS = [
  { id: 'ca1', num: 1, subject: 'General Anatomy', q: 'Which foramen transmits the mandibular nerve (CN V3)?', options: ['Foramen rotundum', 'Foramen ovale', 'Foramen spinosum', 'Jugular foramen'], correct: 1 },
  { id: 'ca2', num: 2, subject: 'General Anatomy', q: 'The muscle of mastication that depresses and protrudes the mandible is:', options: ['Masseter', 'Temporalis', 'Lateral pterygoid', 'Medial pterygoid'], correct: 2 },
  { id: 'ca3', num: 3, subject: 'Physiology & Biochemistry', q: 'Which vitamin is essential for gamma-carboxylation of clotting factors II, VII, IX, and X?', options: ['Vitamin A', 'Vitamin C', 'Vitamin K', 'Vitamin E'], correct: 2 },
  { id: 'ca4', num: 4, subject: 'Physiology & Biochemistry', q: 'Normal cardiac output at rest in a healthy adult is approximately:', options: ['2.5 L/min', '5.0 L/min', '8.5 L/min', '12.0 L/min'], correct: 1 },
  { id: 'ca5', num: 5, subject: 'Pharmacology', q: 'Adrenaline maximum recommended dose in a cardiac patient undergoing dental extraction is:', options: ['0.2 mg', '0.04 mg (approx 2 cartridges of 1:100,000)', '0.1 mg', '0.5 mg'], correct: 1 },
  { id: 'ca6', num: 6, subject: 'General Medicine', q: 'First-line antimicrobial prophylaxis for infective endocarditis in a non-allergic patient is:', options: ['Oral Amoxicillin 2g 30-60 min before procedure', 'Intravenous Vancomycin 1g', 'Oral Clindamycin 600mg', 'Oral Erythromycin 500mg'], correct: 0 },
  { id: 'ca7', num: 7, subject: 'General Surgery', q: 'In traumatology, the Parkland formula for burn resuscitation calculates fluid requirements as:', options: ['2 ml * kg * %TBSA in 24 hours', '4 ml * kg * %TBSA (half in first 8 hours, half in next 16 hours)', '6 ml * kg * %TBSA', '8 ml * kg * %TBSA'], correct: 1 }
];

const CBT_PART_B_MOCK_QUESTIONS = [
  { id: 'cb1', num: 101, subject: 'Dental Materials', q: 'The gauging water requirement for setting of dental plaster (hemihydrate) is:', options: ['10.5 ml per 100g', '18.6 ml per 100g', '28.0 ml per 100g', '45.0 ml per 100g'], correct: 1 },
  { id: 'cb2', num: 102, subject: 'Oral Pathology', q: 'Corrugated parakeratinized stratified squamous epithelium with palisaded basal layer is characteristic of:', options: ['Ameloblastoma', 'Odontogenic Keratocyst (OKC)', 'Radicular cyst', 'Dentigerous cyst'], correct: 1 },
  { id: 'cb3', num: 103, subject: 'Oral Medicine & Radiology', q: 'A sunburst appearance on an intraoral or occlusal radiograph is classic for:', options: ['Osteosarcoma', 'Fibrous dysplasia', 'Ameloblastoma', 'Paget disease'], correct: 0 },
  { id: 'cb4', num: 104, subject: 'OMFS', q: 'Bilateral submandibular, sublingual, and submental space infection with wooden induration and airway compromise is:', options: ['Canine space abscess', 'Ludwig angina', 'Pterygomandibular space infection', 'Buccal cellulitis'], correct: 1 },
  { id: 'cb5', num: 105, subject: 'OMFS', q: 'Guerin sign (ecchymosis in the region of the greater palatine foramen) is diagnostic of:', options: ['Mandibular body fracture', 'Le Fort I maxillary fracture', 'ZMC tripod fracture', 'Nasal bone fracture'], correct: 1 },
  { id: 'cb6', num: 106, subject: 'Orthodontics', q: 'Steiner cephalometric analysis normal value for ANB angle (indicating Class I skeletal relation) is:', options: ['-2 degrees', '0 degrees', '2 degrees (range 2-4 degrees)', '8 degrees'], correct: 2 },
  { id: 'cb7', num: 107, subject: 'Periodontology', q: 'Which Gracey curette is designed specifically for scaling mesial surfaces of posterior teeth?', options: ['Gracey 1/2', 'Gracey 7/8', 'Gracey 11/12', 'Gracey 13/14'], correct: 2 }
];
function App() {
  // Navigation & Layout State
  const [currentView, setCurrentView] = useState('dashboard');
  const [themeMode, setThemeMode] = useState(() => {
    try { return localStorage.getItem('mds_theme_mode') || 'system'; } catch(e) { return 'system'; }
  });
  const [scrollTop, setScrollTop] = useState(0);

  // Filter & Interactive Module States
  const [searchQuery, setSearchQuery] = useState('');
  const [partFilter, setPartFilter] = useState('ALL');
  const [ibqFilter, setIbqFilter] = useState('All');
  const [revealedIbqs, setRevealedIbqs] = useState({});
  const [pedAngulation, setPedAngulation] = useState(1);
  const [pedDepth, setPedDepth] = useState(2);
  const [pedRamus, setPedRamus] = useState(3);
  const [collegeSearch, setCollegeSearch] = useState('');
  const [collegeSortBy, setCollegeSortBy] = useState('rank');
  const [targetRankInput, setTargetRankInput] = useState(10);
  const [predScoreInput, setPredScoreInput] = useState(786);
  const [errFilterReason, setErrFilterReason] = useState('ALL');
  const [pendingPackDiff, setPendingPackDiff] = useState(null);
  const [previousContentPack, setPreviousContentPack] = useState(null);
  const isApplyingRemoteRef = useRef(false);

  useEffect(() => {
    window.__setMdsView = setCurrentView;
    return () => { delete window.__setMdsView; };
  }, []);

  // Theme Management (Light / Dark / System)
  useEffect(() => {
    function applyTheme() {
      let active = themeMode;
      if (active === 'system') {
        active = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.setAttribute('data-theme', active);
    }
    applyTheme();
    localStorage.setItem('mds_theme_mode', themeMode);
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => { if (themeMode === 'system') applyTheme(); };
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [themeMode]);

  // Section 3A: Real Cloud Sync Engine Integration
  const [syncState, setSyncState] = useState(() => {
    if (typeof window !== 'undefined' && window.SyncEngine) {
      return {
        status: window.SyncEngine.getStatus().status,
        statusMessage: window.SyncEngine.getStatus().message,
        user: window.SyncEngine.getUser(),
        deviceName: window.SyncEngine.getDeviceName(),
        lastSyncedAt: window.SyncEngine.getLastSyncedAt(),
        conflicts: window.SyncEngine.getConflicts(),
        snapshots: window.SyncEngine.getSnapshots(),
        isConfigured: !!(window.SyncEngine.getSavedConfig().url && window.SyncEngine.getSavedConfig().anonKey)
      };
    }
    return {
      status: 'signed_out',
      statusMessage: 'Offline local mode',
      user: null,
      deviceName: 'MacBook Air',
      lastSyncedAt: null,
      conflicts: [],
      snapshots: [],
      isConfigured: false
    };
  });

  const [supabaseUrlInput, setSupabaseUrlInput] = useState(() => {
    return (typeof window !== 'undefined' && window.SyncEngine) ? window.SyncEngine.getSavedConfig().url : '';
  });
  const [supabaseKeyInput, setSupabaseKeyInput] = useState(() => {
    return (typeof window !== 'undefined' && window.SyncEngine) ? window.SyncEngine.getSavedConfig().anonKey : '';
  });
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState('magic'); // 'magic' | 'password'
  const [customDeviceName, setCustomDeviceName] = useState(() => {
    return (typeof window !== 'undefined' && window.SyncEngine) ? window.SyncEngine.getDeviceName() : 'MacBook Air';
  });
  const [deleteCloudConfirm, setDeleteCloudConfirm] = useState('');
  const [syncTestReport, setSyncTestReport] = useState(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [syncConflictsState, setSyncConflictsState] = useState([]);

  // Data Store 1: userProgress (Initialized from SyncEngine Local Doc)
  const [localProgressDoc, setLocalProgressDocState] = useState(() => {
    return (typeof window !== 'undefined' && window.SyncEngine) ?
      window.SyncEngine.getLocalProgressDoc() :
      { userSettings: {}, dailyRoutines: {}, planChecklist: {}, subjectProgress: {}, mockScores: [], errorLog: [], omfsChecklist: {}, hiddenRulesChecked: {}, masterChecklistsChecked: {}, collegeShortlist: [], counsellingTracker: {}, documentsChecklist: {}, imageDrillHistory: [], dailyQuizHistory: [], syncConflicts: [] };
  });

  // Extracted React states for immediate reactive binding (Rule R4: no personal defaults in code)
  const [userSettings, setUserSettings] = useState(() => {
    const s = localProgressDoc.userSettings || {};
    return {
      examDate: (s.examDate && s.examDate.value !== undefined) ? s.examDate.value : '',
      internshipDate: (s.internshipDate && s.internshipDate.value !== undefined) ? s.internshipDate.value : '',
      stateName: (s.stateName && s.stateName.value !== undefined) ? s.stateName.value : '',
      statePortalUrl: (s.statePortalUrl && s.statePortalUrl.value !== undefined) ? s.statePortalUrl.value : '',
      stateDomicileBasis: (s.stateDomicileBasis && s.stateDomicileBasis.value !== undefined) ? s.stateDomicileBasis.value : '',
      reservationCategory: (s.reservationCategory && s.reservationCategory.value !== undefined) ? s.reservationCategory.value : '',
      targetBranch: (s.targetBranch && s.targetBranch.value !== undefined) ? s.targetBranch.value : '',
      dailyHours: (s.dailyHours && s.dailyHours.value !== undefined) ? s.dailyHours.value : '',
      targetScore: (s.targetScore && s.targetScore.value !== undefined) ? s.targetScore.value : 790,
      coachingName: (s.coachingName && s.coachingName.value !== undefined) ? s.coachingName.value : 'Dr. Anchal Agarwal Classes',
      studySpine: (s.studySpine && s.studySpine.value !== undefined) ? s.studySpine.value : 'Dental Pulse, 18th edition 2025',
      contentUpdateUrl: (s.contentUpdateUrl && s.contentUpdateUrl.value !== undefined) ? s.contentUpdateUrl.value : '',
      soundEnabled: (s.soundEnabled && s.soundEnabled.value !== undefined) ? s.soundEnabled.value : true,
      dismissedWarning: (s.dismissedWarning && s.dismissedWarning.value !== undefined) ? s.dismissedWarning.value : false
    };
  });

  const [dailyRoutine, setDailyRoutine] = useState(() => {
    const todayKey = new Date().toISOString().split('T')[0];
    const day = (localProgressDoc.dailyRoutines && localProgressDoc.dailyRoutines[todayKey]) || {};
    return {
      theory: (day.theory && day.theory.value !== undefined) ? day.theory.value : false,
      mcqs: (day.mcqs && day.mcqs.value !== undefined) ? day.mcqs.value : false,
      second_subject: (day.second_subject && day.second_subject.value !== undefined) ? day.second_subject.value : false,
      image_drill: (day.image_drill && day.image_drill.value !== undefined) ? day.image_drill.value : false,
      spaced_recall: (day.spaced_recall && day.spaced_recall.value !== undefined) ? day.spaced_recall.value : false,
      questionsDone: (day.questionsDone && day.questionsDone.value !== undefined) ? day.questionsDone.value : 0
    };
  });

  const [streak, setStreak] = useState(() => {
    try { return parseInt(localStorage.getItem('mds_streak') || '1', 10); } catch(e) { return 1; }
  });

  const [planChecklist, setPlanChecklist] = useState(() => localProgressDoc.planChecklist || {});
  const [subjectProgress, setSubjectProgress] = useState(() => localProgressDoc.subjectProgress || {});
  const [mockScores, setMockScores] = useState(() => localProgressDoc.mockScores || [
    { id: 'm1', date: '2026-11-14', source: 'Ecdentistry Free Weekly Mock 15 (Baseline)', partA_C: 78, partA_W: 18, partA_U: 4, partB_C: 106, partB_W: 24, partB_U: 10, totalScore: 694, accuracy: 81.4, updatedAt: '2026-11-14T10:00:00Z', deletedAt: null },
    { id: 'm2', date: '2026-11-07', source: 'Diagnostic Combined Test 01', partA_C: 84, partA_W: 14, partA_U: 2, partB_C: 112, partB_W: 18, partB_U: 10, totalScore: 752, accuracy: 85.9, updatedAt: '2026-11-07T10:00:00Z', deletedAt: null }
  ]);
  const [errorLog, setErrorLog] = useState(() => localProgressDoc.errorLog || [
    { id: 'err_1', subject: 'General & Dental Pharmacology', topic: 'Epinephrine cardiac safety limit', whatWentWrong: 'Confused healthy vs cardiac adrenaline limits', reason: 'Silly Mistake', correctFact: 'Cardiac patient limit is 0.04 mg (approx 2 cartridges of 1:100k). Healthy limit is 0.2 mg.', reference: 'Malamed Handbook of Local Anesthesia', reviewDay: 2, isVolatile: false, date: '2026-11-15', updatedAt: '2026-11-15T09:00:00Z', deletedAt: null },
    { id: 'err_2', subject: 'Dental Materials', topic: 'High-copper amalgam phase elimination', whatWentWrong: 'Picked Gamma-1 instead of Gamma-2', reason: 'Knowledge Gap', correctFact: 'Gamma-2 (Sn7-8Hg) is the weakest, most corrosion-prone phase and is eliminated by the eta-prime (Cu6Sn5) phase in high-Cu (>6%) alloys.', reference: 'Phillips Science of Dental Materials', reviewDay: 7, isVolatile: false, date: '2026-11-14', updatedAt: '2026-11-14T09:00:00Z', deletedAt: null }
  ]);
  const [shakyCards, setShakyCards] = useState(() => localProgressDoc.shakyCards || {});
  const [omfsChecklist, setOmfsChecklist] = useState(() => localProgressDoc.omfsChecklist || {});
  const [hiddenRulesChecked, setHiddenRulesChecked] = useState(() => localProgressDoc.hiddenRulesChecked || {});
  const [masterChecklistsChecked, setMasterChecklistsChecked] = useState(() => localProgressDoc.masterChecklistsChecked || {});
  const [collegeShortlist, setCollegeShortlist] = useState(() => localProgressDoc.collegeShortlist || [
    { id: 'c1', name: "King George's Medical University (KGMU), Lucknow", priority: 1, notes: 'Target #1 for OMFS. Closing rank 4 in AIQ R1.' },
    { id: 'c2', name: 'Institute of Medical Sciences (IMS), BHU, Varanasi', priority: 2, notes: 'Central seat, zero bond, Rs 1.1L stipend.' }
  ]);
  const [counsellingTracker, setCounsellingTracker] = useState(() => localProgressDoc.counsellingTracker || {});
  const [documentsChecklist, setDocumentsChecklist] = useState(() => localProgressDoc.documentsChecklist || {});
  const [imageDrillHistory, setImageDrillHistory] = useState(() => localProgressDoc.imageDrillHistory || []);
  const [dailyQuizHistory, setDailyQuizHistory] = useState(() => localProgressDoc.dailyQuizHistory || []);

  // Data Store 2 & 3: contentPack and imageLibrary (Bundled Versioned Facts)
  const [contentPack, setContentPack] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mds_content_pack')) || DEFAULT_CONTENT; } catch(e) { return DEFAULT_CONTENT; }
  });
  const [imageLibrary, setImageLibrary] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mds_image_library')) || DEFAULT_IMAGES; } catch(e) { return DEFAULT_IMAGES; }
  });

  // Live Update Proxy Notices State (Fix 6)
  const [proxyCheckState, setProxyCheckState] = useState({
    checking: false,
    lastChecked: null,
    sources: {
      nbems: { name: 'NBEMS Official (NEET-MDS)', status: 'idle', statusText: 'Ready to check', notices: [] },
      mcc: { name: 'MCC MDS Counselling', status: 'idle', statusText: 'Ready to check', notices: [] },
      dci: { name: 'Dental Council of India', status: 'idle', statusText: 'Ready to check', notices: [] }
    }
  });

  // Timed CBT Simulator Engine State (Fix 7: Part A Lock)
  const [cbtActive, setCbtActive] = useState(false);
  const [cbtPart, setCbtPart] = useState('A'); // 'A' | 'B'
  const [cbtPartALocked, setCbtPartALocked] = useState(false);
  const [cbtTimerA, setCbtTimerA] = useState(75 * 60); // 75 minutes Part A strict
  const [cbtTimerB, setCbtTimerB] = useState(105 * 60); // 105 minutes Part B strict
  const [cbtRunning, setCbtRunning] = useState(false);
  const [cbtAnswers, setCbtAnswers] = useState({});
  const [cbtFlagged, setCbtFlagged] = useState({});
  const [cbtCurrentIndex, setCbtCurrentIndex] = useState(0);
  const [cbtCompleted, setCbtCompleted] = useState(false);
  const [cbtResultSummary, setCbtResultSummary] = useState(null);

  // Daily Quiz Modal State (Fix 7)
  const [showDailyQuizModal, setShowDailyQuizModal] = useState(false);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState(null);
  const [quizShowExplanation, setQuizShowExplanation] = useState(false);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  // Timed 15-Image Drill State
  const [drillActive, setDrillActive] = useState(false);
  const [drillIndex, setDrillIndex] = useState(0);
  const [drillScore, setDrillScore] = useState(0);
  const [drillQuestions, setDrillQuestions] = useState([]);
  const [drillTimer, setDrillTimer] = useState(45);
  const [drillCompleted, setDrillCompleted] = useState(false);
  const [drillSelectedAnswer, setDrillSelectedAnswer] = useState(null);

  // Zoom Lightbox State
  const [activeZoomImage, setActiveZoomImage] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  // Universal Modals & Sheets
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [cmdQuery, setCmdQuery] = useState('');
  const [showMoreSheet, setShowMoreSheet] = useState(false);
  const [showAddErrorModal, setShowAddErrorModal] = useState(false);

  // Calculator Form State
  const [calcSource, setCalcSource] = useState('Ecdentistry Free Weekly Mock');
  const [calcDate, setCalcDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [calcPartAC, setCalcPartAC] = useState(82);
  const [calcPartAW, setCalcPartAW] = useState(14);
  const [calcPartAU, setCalcPartAU] = useState(4);
  const [calcPartBC, setCalcPartBC] = useState(120);
  const [calcPartBW, setCalcPartBW] = useState(8);
  const [calcPartBU, setCalcPartBU] = useState(12);

  // Add Error Form State
  const [errSubject, setErrSubject] = useState('General & Dental Pharmacology');
  const [errTopic, setErrTopic] = useState('');
  const [errWhatWentWrong, setErrWhatWentWrong] = useState('');
  const [errReason, setErrReason] = useState('Knowledge Gap');
  const [errCorrectFact, setErrCorrectFact] = useState('');
  const [errReference, setErrReference] = useState('');

  // Audio & Haptic Feedback Engine
  const triggerHaptic = (ms = 10) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch(e) {}
    }
  };

  const playAppleClick = () => {
    if (!userSettings.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(820, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(340, ctx.currentTime + 0.032);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.032);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.035);
    } catch(e) {}
  };

  const playAppleChime = () => {
    if (!userSettings.soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);
        gain.gain.setValueAtTime(0.09, ctx.currentTime + idx * 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.08);
        osc.stop(ctx.currentTime + idx * 0.08 + 0.30);
      });
    } catch(e) {}
  };

  // Section 3A: Subscribe to Real Cloud Sync Engine
  useEffect(() => {
    if (typeof window === 'undefined' || !window.SyncEngine) return;
    const unsub = window.SyncEngine.subscribe(info => {
      setSyncState(info);
      setSyncConflictsState(info.conflicts || []);
      const localDoc = window.SyncEngine.getLocalProgressDoc();
      if (localDoc && localDoc.userSettings) {
        isApplyingRemoteRef.current = true;
        const s = localDoc.userSettings;
        setUserSettings(prev => ({
          ...prev,
          examDate: s.examDate?.value ?? prev.examDate,
          internshipDate: s.internshipDate?.value ?? prev.internshipDate,
          stateName: s.stateName?.value ?? prev.stateName,
          statePortalUrl: s.statePortalUrl?.value ?? prev.statePortalUrl,
          stateDomicileBasis: s.stateDomicileBasis?.value ?? prev.stateDomicileBasis,
          reservationCategory: s.reservationCategory?.value ?? prev.reservationCategory,
          targetBranch: s.targetBranch?.value ?? prev.targetBranch,
          dailyHours: s.dailyHours?.value ?? prev.dailyHours,
          targetScore: s.targetScore?.value ?? prev.targetScore,
          coachingName: s.coachingName?.value ?? prev.coachingName,
          studySpine: s.studySpine?.value ?? prev.studySpine,
          contentUpdateUrl: s.contentUpdateUrl?.value ?? prev.contentUpdateUrl,
          dismissedWarning: s.dismissedWarning?.value ?? prev.dismissedWarning
        }));
        if (Array.isArray(localDoc.mockScores)) setMockScores(localDoc.mockScores);
        if (Array.isArray(localDoc.errorLog)) setErrorLog(localDoc.errorLog);
        if (localDoc.subjectProgress) setSubjectProgress(localDoc.subjectProgress);
        if (localDoc.planChecklist) setPlanChecklist(localDoc.planChecklist);
        if (localDoc.shakyCards) setShakyCards(localDoc.shakyCards);
        if (localDoc.omfsChecklist) setOmfsChecklist(localDoc.omfsChecklist);
        if (localDoc.hiddenRulesChecked) setHiddenRulesChecked(localDoc.hiddenRulesChecked);
        if (localDoc.masterChecklistsChecked) setMasterChecklistsChecked(localDoc.masterChecklistsChecked);
        if (Array.isArray(localDoc.collegeShortlist)) setCollegeShortlist(localDoc.collegeShortlist);
        if (localDoc.counsellingTracker) setCounsellingTracker(localDoc.counsellingTracker);
        if (localDoc.documentsChecklist) setDocumentsChecklist(localDoc.documentsChecklist);
        if (Array.isArray(localDoc.imageDrillHistory)) setImageDrillHistory(localDoc.imageDrillHistory);
        if (Array.isArray(localDoc.dailyQuizHistory)) setDailyQuizHistory(localDoc.dailyQuizHistory);
        setTimeout(() => { isApplyingRemoteRef.current = false; }, 0);
      }
    });
    return unsub;
  }, []);

  // Save Progress on state change with Isolated Field-Level Timestamps (Section 13.2 Fix)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.SyncEngine || isApplyingRemoteRef.current) return;
    const nowIso = new Date().toISOString();
    const todayKey = nowIso.split('T')[0];

    const fullDoc = window.SyncEngine.getLocalProgressDoc();
    if (!fullDoc.userSettings) fullDoc.userSettings = {};

    Object.keys(userSettings).forEach(k => {
      fullDoc.userSettings[k] = window.SyncEngine.updateScalarIfChanged(fullDoc.userSettings[k], userSettings[k], nowIso);
    });

    if (!fullDoc.dailyRoutines) fullDoc.dailyRoutines = {};
    if (!fullDoc.dailyRoutines[todayKey]) fullDoc.dailyRoutines[todayKey] = {};
    Object.keys(dailyRoutine).forEach(k => {
      fullDoc.dailyRoutines[todayKey][k] = window.SyncEngine.updateScalarIfChanged(fullDoc.dailyRoutines[todayKey][k], dailyRoutine[k], nowIso);
    });

    fullDoc.planChecklist = planChecklist;
    fullDoc.subjectProgress = subjectProgress;
    fullDoc.mockScores = mockScores;
    fullDoc.errorLog = errorLog;
    fullDoc.shakyCards = shakyCards;
    fullDoc.omfsChecklist = omfsChecklist;
    fullDoc.hiddenRulesChecked = hiddenRulesChecked;
    fullDoc.masterChecklistsChecked = masterChecklistsChecked;
    fullDoc.collegeShortlist = collegeShortlist;
    fullDoc.counsellingTracker = counsellingTracker;
    fullDoc.documentsChecklist = documentsChecklist;
    fullDoc.imageDrillHistory = imageDrillHistory;
    fullDoc.dailyQuizHistory = dailyQuizHistory;

    window.SyncEngine.saveLocalProgressDoc(fullDoc);
    window.SyncEngine.triggerSync();
  }, [userSettings, dailyRoutine, planChecklist, subjectProgress, mockScores, errorLog, shakyCards, omfsChecklist, hiddenRulesChecked, masterChecklistsChecked, collegeShortlist, counsellingTracker, documentsChecklist, imageDrillHistory, dailyQuizHistory]);

  // Timed CBT Simulator Interval Timer (Fix 7)
  useEffect(() => {
    let interval = null;
    if (cbtActive && cbtRunning && !cbtCompleted) {
      interval = setInterval(() => {
        if (cbtPart === 'A') {
          setCbtTimerA(prev => {
            if (prev <= 1) {
              // Part A time expired! Lock Part A permanently and switch to Part B
              setCbtPartALocked(true);
              setCbtPart('B');
              setCbtCurrentIndex(0);
              playAppleChime();
              alert(' Part A 75-Minute Time Limit Reached! Part A is now locked. Proceeding to Part B (105 Mins).');
              return 0;
            }
            return prev - 1;
          });
        } else {
          setCbtTimerB(prev => {
            if (prev <= 1) {
              handleFinishCbtTest();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [cbtActive, cbtRunning, cbtPart, cbtCompleted]);

  // 15-Image Drill Timer
  useEffect(() => {
    let interval = null;
    if (drillActive && !drillCompleted && drillTimer > 0) {
      interval = setInterval(() => {
        setDrillTimer(prev => {
          if (prev <= 1) {
            handleDrillNext();
            return 45;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [drillActive, drillCompleted, drillTimer]);

  // Days left to exam (Fix 5: No countdown if examDate not set)
  const daysLeft = useMemo(() => {
    if (!userSettings.examDate) return null;
    const target = new Date(userSettings.examDate + 'T09:00:00');
    if (isNaN(target.getTime())) return null;
    const diff = target - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [userSettings.examDate]);

  // Format Seconds to MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // =========================================================================
  // HANDLERS: TIMED CBT MOCK ENGINE (Part A 75-min Lock)
  // =========================================================================

  const handleStartCbtMock = () => {
    triggerHaptic(15);
    playAppleClick();
    setCbtActive(true);
    setCbtPart('A');
    setCbtPartALocked(false);
    setCbtTimerA(75 * 60);
    setCbtTimerB(105 * 60);
    setCbtRunning(true);
    setCbtAnswers({});
    setCbtFlagged({});
    setCbtCurrentIndex(0);
    setCbtCompleted(false);
    setCbtResultSummary(null);
  };

  const handleSelectCbtAnswer = (qId, optionIdx) => {
    if (cbtPart === 'A' && cbtPartALocked) return;
    triggerHaptic(8);
    playAppleClick();
    setCbtAnswers(prev => ({ ...prev, [qId]: optionIdx }));
  };

  const handleToggleCbtFlag = (qId) => {
    triggerHaptic(8);
    playAppleClick();
    setCbtFlagged(prev => ({ ...prev, [qId]: !prev[qId] }));
  };

  const handleLockPartA = () => {
    triggerHaptic(15);
    playAppleClick();
    if (confirm('Lock Part A now? You will NOT be able to return to Part A once Part B begins. Unused time does not carry over.')) {
      setCbtPartALocked(true);
      setCbtPart('B');
      setCbtCurrentIndex(0);
      playAppleChime();
    }
  };

  const handleFinishCbtTest = () => {
    triggerHaptic(18);
    playAppleClick();
    setCbtRunning(false);
    setCbtCompleted(true);

    // Calculate score
    let partAC = 0, partAW = 0, partAU = 0;
    CBT_PART_A_MOCK_QUESTIONS.forEach(q => {
      const ans = cbtAnswers[q.id];
      if (ans === undefined) partAU++;
      else if (ans === q.correct) partAC++;
      else partAW++;
    });

    let partBC = 0, partBW = 0, partBU = 0;
    CBT_PART_B_MOCK_QUESTIONS.forEach(q => {
      const ans = cbtAnswers[q.id];
      if (ans === undefined) partBU++;
      else if (ans === q.correct) partBC++;
      else partBW++;
    });

    const scaledAC = Math.round(partAC * (100 / Math.max(1, CBT_PART_A_MOCK_QUESTIONS.length)));
    const scaledAW = Math.round(partAW * (100 / Math.max(1, CBT_PART_A_MOCK_QUESTIONS.length)));
    const scaledAU = Math.max(0, 100 - scaledAC - scaledAW);

    const scaledBC = Math.round(partBC * (140 / Math.max(1, CBT_PART_B_MOCK_QUESTIONS.length)));
    const scaledBW = Math.round(partBW * (140 / Math.max(1, CBT_PART_B_MOCK_QUESTIONS.length)));
    const scaledBU = Math.max(0, 140 - scaledBC - scaledBW);

    const totalScore = (scaledAC + scaledBC) * 4 - (scaledAW + scaledBW);
    const attempted = scaledAC + scaledBC + scaledAW + scaledBW;
    const accuracy = attempted > 0 ? Math.round(((scaledAC + scaledBC) / attempted) * 1000) / 10 : 0;

    const newMockRecord = {
      id: 'm_' + Date.now(),
      date: new Date().toISOString().split('T')[0],
      source: 'Full 240-Q CBT National Mock Simulator',
      partA_C: scaledAC,
      partA_W: scaledAW,
      partA_U: scaledAU,
      partB_C: scaledBC,
      partB_W: scaledBW,
      partB_U: scaledBU,
      totalScore,
      accuracy,
      updatedAt: new Date().toISOString(),
      deletedAt: null
    };

    setMockScores(prev => [newMockRecord, ...prev]);
    setCbtResultSummary(newMockRecord);
    playAppleChime();
  };

  // =========================================================================
  // HANDLERS: DAILY MIXED-SUBJECT QUIZ (Fix 7)
  // =========================================================================

  const handleStartDailyQuiz = () => {
    triggerHaptic(12);
    playAppleClick();
    setQuizIndex(0);
    setQuizSelectedOption(null);
    setQuizShowExplanation(false);
    setQuizScore(0);
    setQuizFinished(false);
    setShowDailyQuizModal(true);
  };

  const handleQuizAnswer = (optIdx) => {
    if (quizShowExplanation) return;
    triggerHaptic(10);
    playAppleClick();
    setQuizSelectedOption(optIdx);
    setQuizShowExplanation(true);
    const q = DAILY_QUIZ_POOL[quizIndex];
    if (optIdx === q.correct) {
      setQuizScore(prev => prev + 4);
      playAppleClick();
    } else {
      setQuizScore(prev => prev - 1);
    }
  };

  const handleQuizNext = () => {
    triggerHaptic(10);
    playAppleClick();
    if (quizIndex + 1 < DAILY_QUIZ_POOL.length) {
      setQuizIndex(prev => prev + 1);
      setQuizSelectedOption(null);
      setQuizShowExplanation(false);
    } else {
      setQuizFinished(true);
      const quizRec = {
        id: 'dq_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        score: quizScore,
        totalQuestions: DAILY_QUIZ_POOL.length,
        updatedAt: new Date().toISOString()
      };
      setDailyQuizHistory(prev => [quizRec, ...prev]);
      playAppleChime();
    }
  };

  // =========================================================================
  // HANDLERS: 15-IMAGE TIMED DRILL (Fix 7)
  // =========================================================================

  const handleStart15ImageDrill = () => {
    triggerHaptic(14);
    playAppleClick();
    const shuffled = [...imageLibrary].sort(() => 0.5 - Math.random()).slice(0, 15);
    const questions = shuffled.map((img) => {
      const distractors = imageLibrary
        .filter(i => i.id !== img.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(i => i.diagnosis);
      const options = [img.diagnosis, ...distractors].sort(() => 0.5 - Math.random());
      return {
        image: img,
        options,
        correctIndex: options.indexOf(img.diagnosis)
      };
    });
    setDrillQuestions(questions);
    setDrillIndex(0);
    setDrillScore(0);
    setDrillTimer(45);
    setDrillActive(true);
    setDrillCompleted(false);
    setDrillSelectedAnswer(null);
  };

  const handleDrillAnswer = (optIdx) => {
    if (drillSelectedAnswer !== null) return;
    triggerHaptic(10);
    playAppleClick();
    setDrillSelectedAnswer(optIdx);
    const currQ = drillQuestions[drillIndex];
    if (optIdx === currQ.correctIndex) {
      setDrillScore(prev => prev + 4);
    } else {
      setDrillScore(prev => prev - 1);
    }
  };

  const handleDrillNext = () => {
    triggerHaptic(10);
    playAppleClick();
    if (drillIndex + 1 < drillQuestions.length) {
      setDrillIndex(prev => prev + 1);
      setDrillSelectedAnswer(null);
      setDrillTimer(45);
    } else {
      setDrillCompleted(true);
      setDrillActive(false);
      const rec = {
        id: 'idrill_' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        score: drillScore,
        total: 60,
        updatedAt: new Date().toISOString()
      };
      setImageDrillHistory(prev => [rec, ...prev]);
      playAppleChime();
    }
  };

  // =========================================================================
  // HANDLERS: LIVE UPDATE PROXY (Fix 6)
  // =========================================================================

  const handleCheckOfficialUpdates = async () => {
    triggerHaptic(12);
    playAppleClick();
    setProxyCheckState(prev => ({ ...prev, checking: true }));

    try {
      const res = await fetch('/api/update-proxy');
      if (res.ok) {
        const data = await res.json();
        setProxyCheckState({
          checking: false,
          lastChecked: data.lastChecked || new Date().toISOString(),
          sources: data.sources || prev.sources
        });
        playAppleChime();
      } else {
        throw new Error('HTTP ' + res.status);
      }
    } catch(err) {
      setProxyCheckState(prev => ({
        ...prev,
        checking: false,
        lastChecked: new Date().toISOString(),
        sources: {
          nbems: { name: 'NBEMS Official (NEET-MDS)', status: 'blocked', statusText: 'Manual check needed', details: 'Cloudflare bot verification active. Direct link available.', notices: [] },
          mcc: { name: 'MCC MDS Counselling', status: 'blocked', statusText: 'Manual check needed', details: 'Check official mcc.nic.in directly.', notices: [] },
          dci: { name: 'Dental Council of India', status: 'blocked', statusText: 'Manual check needed', details: 'Check official dciindia.gov.in directly.', notices: [] }
        }
      }));
    }
  };

  // =========================================================================
  // HANDLERS: SECTION 3A CLOUD SYNC & SETTINGS
  // =========================================================================

  const handleSaveSupabaseConfig = (e) => {
    if (e) e.preventDefault();
    triggerHaptic(12);
    playAppleClick();
    if (!supabaseUrlInput || !supabaseKeyInput) {
      alert('Please enter both Supabase Project URL and Public Anon Key.');
      return;
    }
    if (window.SyncEngine) {
      window.SyncEngine.saveConfig(supabaseUrlInput, supabaseKeyInput);
      alert('Supabase configuration saved! You can now sign in or create an account.');
    }
  };

  const handleClearSupabaseConfig = () => {
    triggerHaptic(12);
    playAppleClick();
    if (confirm('Disconnect Supabase cloud sync on this device?')) {
      if (window.SyncEngine) {
        window.SyncEngine.clearConfig();
        setSupabaseUrlInput('');
        setSupabaseKeyInput('');
      }
    }
  };

  const handleSendMagicLink = async (e) => {
    if (e) e.preventDefault();
    triggerHaptic(12);
    playAppleClick();
    if (!authEmail) {
      alert('Please enter your email address for the magic link.');
      return;
    }
    try {
      if (window.SyncEngine) {
        await window.SyncEngine.signInWithMagicLink(authEmail);
        alert('Magic link sent to ' + authEmail + '! Check your inbox to sign in automatically.');
      }
    } catch(err) {
      alert('Error sending magic link: ' + err.message);
    }
  };

  const handlePasswordSignIn = async (e) => {
    if (e) e.preventDefault();
    triggerHaptic(12);
    playAppleClick();
    if (!authEmail || !authPassword) {
      alert('Please enter both email and password.');
      return;
    }
    try {
      if (window.SyncEngine) {
        await window.SyncEngine.signInWithPassword(authEmail, authPassword);
        alert('Signed in successfully! Real-time cloud sync is active.');
      }
    } catch(err) {
      alert('Sign in failed: ' + err.message);
    }
  };

  const handlePasswordSignUp = async (e) => {
    if (e) e.preventDefault();
    triggerHaptic(12);
    playAppleClick();
    if (!authEmail || !authPassword) {
      alert('Please enter both email and password.');
      return;
    }
    try {
      if (window.SyncEngine) {
        await window.SyncEngine.signUpWithPassword(authEmail, authPassword);
        alert('Account created successfully! Signed in and initial progress synced.');
      }
    } catch(err) {
      alert('Sign up failed: ' + err.message);
    }
  };

  const handleSignOutUser = async () => {
    triggerHaptic(12);
    playAppleClick();
    if (confirm('Sign out of sync account? Your local study data will remain safe on this device.')) {
      if (window.SyncEngine) {
        await window.SyncEngine.signOut();
      }
    }
  };

  const handleManualSyncNow = async () => {
    triggerHaptic(15);
    playAppleClick();
    if (window.SyncEngine) {
      const res = await window.SyncEngine.syncNow();
      if (res.success) {
        playAppleChime();
        alert('Progress successfully synchronized with Supabase cloud!');
      } else {
        alert('Sync did not complete: ' + (res.error || res.reason));
      }
    }
  };

  const handleSaveDeviceName = (e) => {
    if (e) e.preventDefault();
    triggerHaptic(10);
    playAppleClick();
    if (window.SyncEngine) {
      window.SyncEngine.setDeviceName(customDeviceName);
      alert('Device name set to: ' + customDeviceName);
    }
  };

  const handleRollbackSnapshot = async (snapshotId) => {
    triggerHaptic(15);
    playAppleClick();
    if (confirm('Roll back to this cloud snapshot? Current local changes will be replaced and pushed to cloud.')) {
      try {
        if (window.SyncEngine) {
          const restored = await window.SyncEngine.rollbackToSnapshot(snapshotId);
          if (restored) {
            playAppleChime();
            alert('Rollback completed! Progress restored.');
            window.location.reload();
          }
        }
      } catch(err) {
        alert('Rollback error: ' + err.message);
      }
    }
  };

  const handleRestoreConflict = (conflictId) => {
    triggerHaptic(12);
    playAppleClick();
    if (confirm('Restore this conflicting version as the active record?')) {
      if (window.SyncEngine) {
        const ok = window.SyncEngine.restoreConflictVersion(conflictId);
        if (ok) {
          alert('Version restored and synchronized!');
        }
      }
    }
  };

  const handleDeleteCloudData = async () => {
    triggerHaptic(18);
    playAppleClick();
    if (deleteCloudConfirm !== 'DELETE CLOUD DATA') {
      alert('Please type "DELETE CLOUD DATA" exactly to confirm.');
      return;
    }
    try {
      if (window.SyncEngine) {
        await window.SyncEngine.deleteCloudData();
        setDeleteCloudConfirm('');
        alert('All cloud progress permanently deleted from Supabase. Your local device progress remains intact.');
      }
    } catch(err) {
      alert('Delete error: ' + err.message);
    }
  };

  const handleRunSyncDiagnostics = () => {
    triggerHaptic(12);
    playAppleClick();
    if (window.SyncEngine) {
      const results = window.SyncEngine.runSelfTests();
      setSyncTestReport(results);
      setShowTestModal(true);
    }
  };

  // College Shortlist Reordering (Fix 7)
  const handleMoveCollegeShortlist = (index, direction) => {
    triggerHaptic(8);
    playAppleClick();
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= collegeShortlist.length) return;
    const updated = [...collegeShortlist];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setCollegeShortlist(updated);
  };

  const handleAddCollegeToShortlist = (college) => {
    triggerHaptic(10);
    playAppleClick();
    const activeList = collegeShortlist.filter(c => !c.deletedAt);
    if (activeList.some(c => c.id === college.id)) {
      alert('College is already in your shortlist!');
      return;
    }
    const nowIso = new Date().toISOString();
    const newEntry = {
      id: college.id,
      name: college.name,
      priority: activeList.length + 1,
      notes: `AIQ Round 1 Closing Rank: ${college.closingRank}. Stipend: Rs ${college.stipendMonthly.toLocaleString()}/mo.`,
      updatedAt: nowIso,
      deletedAt: null
    };
    setCollegeShortlist(prev => [...prev.filter(c => c.id !== college.id), newEntry]);
  };

  const handleRemoveCollegeFromShortlist = (id) => {
    triggerHaptic(10);
    playAppleClick();
    const nowIso = new Date().toISOString();
    setCollegeShortlist(prev => prev.map(c => c.id === id ? { ...c, deletedAt: nowIso, updatedAt: nowIso, _deleted: true } : c));
  };

  const handleDeleteMockRecord = (id) => {
    triggerHaptic(10);
    playAppleClick();
    const nowIso = new Date().toISOString();
    setMockScores(prev => prev.map(m => m.id === id ? { ...m, deletedAt: nowIso, updatedAt: nowIso, _deleted: true } : m));
  };

  const handleDeleteErrorRecord = (id) => {
    triggerHaptic(10);
    playAppleClick();
    const nowIso = new Date().toISOString();
    setErrorLog(prev => prev.map(e => e.id === id ? { ...e, deletedAt: nowIso, updatedAt: nowIso, _deleted: true } : e));
  };

  const handleAdvanceErrorReview = (id) => {
    triggerHaptic(10);
    playAppleClick();
    const nowIso = new Date().toISOString();
    setErrorLog(prev => prev.map(e => {
      if (e.id !== id) return e;
      const curr = e.reviewDay || 2;
      const nextDay = curr === 2 ? 7 : curr === 7 ? 21 : 21;
      const isVolatile = curr >= 21 ? true : Boolean(e.isVolatile);
      return { ...e, reviewDay: nextDay, isVolatile, updatedAt: nowIso };
    }));
  };

  const handleLogCalculatedMock = () => {
    triggerHaptic(12);
    playAppleClick();
    const aC = Math.max(0, Math.min(100, Number(calcPartAC) || 0));
    const aW = Math.max(0, Math.min(100 - aC, Number(calcPartAW) || 0));
    const aU = Math.max(0, 100 - aC - aW);
    const bC = Math.max(0, Math.min(140, Number(calcPartBC) || 0));
    const bW = Math.max(0, Math.min(140 - bC, Number(calcPartBW) || 0));
    const bU = Math.max(0, 140 - bC - bW);
    const totalScore = (aC + bC) * 4 - (aW + bW);
    const att = aC + bC + aW + bW;
    const accuracy = att > 0 ? Math.round(((aC + bC) / att) * 1000) / 10 : 0;
    const nowIso = new Date().toISOString();
    const rec = {
      id: 'm_calc_' + Date.now(),
      date: calcDate || nowIso.slice(0, 10),
      source: calcSource || 'Ecdentistry Free Weekly Mock',
      partA_C: aC,
      partA_W: aW,
      partA_U: aU,
      partB_C: bC,
      partB_W: bW,
      partB_U: bU,
      totalScore,
      accuracy,
      updatedAt: nowIso,
      deletedAt: null
    };
    setMockScores(prev => [rec, ...prev]);
  };

  // Add Error Log Entry
  const handleSaveError = (e) => {
    e.preventDefault();
    triggerHaptic(12);
    playAppleClick();
    if (!errTopic || !errCorrectFact) {
      alert('Please enter Topic and Correct Fact.');
      return;
    }
    const newErr = {
      id: 'err_' + Date.now(),
      subject: errSubject,
      topic: errTopic,
      whatWentWrong: errWhatWentWrong,
      reason: errReason,
      correctFact: errCorrectFact,
      reference: errReference,
      reviewDay: 2,
      isVolatile: false,
      date: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
      deletedAt: null
    };
    setErrorLog(prev => [newErr, ...prev]);
    setShowAddErrorModal(false);
    setErrTopic('');
    setErrWhatWentWrong('');
    setErrCorrectFact('');
    setErrReference('');
    alert('Logged into Mistake Notebook for Spaced Review (+2, +7, +21 days)!');
  };

  // JSON Export / Import
  const handleExportJSON = () => {
    triggerHaptic(15);
    playAppleClick();
    const backup = {
      userProgress: window.SyncEngine ? window.SyncEngine.getLocalProgressDoc() : {},
      contentPackVersion: contentPack.version,
      imageLibraryVersion: '2026-11-15.1',
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NEET_MDS_Progress_Backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const imported = JSON.parse(evt.target.result);
        if (!imported.userProgress && !Array.isArray(imported.mocks) && !Array.isArray(imported.shortlist)) {
          alert('Invalid backup file. Expected MDS OS userProgress or Build A backup format.');
          return;
        }
        if (confirm('Import and merge backup records (mocks, errors, shortlist, counselling & state quota) into this device?')) {
          if (window.SyncEngine && window.SyncEngine.importBackupPayload) {
            const merged = window.SyncEngine.importBackupPayload(imported);
            setMockScores(merged.mockScores || []);
            setErrorLog(merged.errorLog || []);
            setCollegeShortlist(merged.collegeShortlist || []);
            setCounsellingTracker(merged.counsellingTracker || {});
            window.location.reload();
          }
        }
      } catch(err) {
        alert('Failed to parse JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleCopyBackupCode = () => {
    triggerHaptic(12);
    playAppleClick();
    const backup = window.SyncEngine ? window.SyncEngine.getLocalProgressDoc() : {};
    navigator.clipboard.writeText(JSON.stringify(backup));
    alert('Backup Code copied to clipboard!');
  };

  // Day routine completion percentage
  const dayRoutineCompletion = useMemo(() => {
    const blocks = [dailyRoutine.theory, dailyRoutine.mcqs, dailyRoutine.second_subject, dailyRoutine.image_drill, dailyRoutine.spaced_recall];
    const done = blocks.filter(Boolean).length;
    return Math.round((done / blocks.length) * 100);
  }, [dailyRoutine]);

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-100 select-none">

      {/* ========================================================================= */}
      {/* 1. DESKTOP SIDEBAR (macOS STYLE TRANSLUCENT MATERIAL) */}
      {/* ========================================================================= */}
      <aside className="hidden md:flex flex-col w-64 glass-sidebar p-4 space-y-6 shrink-0 z-30 overflow-y-auto">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/25 text-lg font-bold">
            MD
          </div>
          <div>
            <h1 className="font-extrabold text-sm tracking-tight text-white">MDS OS</h1>
            <p className="text-[10px] text-slate-400 font-medium">AIR 1-10 Workstation</p>
          </div>
        </div>

        <nav className="space-y-5 text-xs">
          {/* Daily Rhythm */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Daily Rhythm</span>
            {[
              { id: 'dashboard', label: 'Today', icon: '' },
              { id: 'daily_quiz', label: 'Daily Quiz', icon: '' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { triggerHaptic(8); playAppleClick(); setCurrentView(item.id); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left apple-press transition-all ${
                  currentView === item.id ? 'bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30 shadow-sm' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Core Prep */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Core Prep</span>
            {[
              { id: 'plan', label: '23-Week Plan', icon: '' },
              { id: 'curriculum', label: '17 Subjects', icon: '' },
              { id: 'cbt_mock', label: 'CBT Simulator', icon: '' },
              { id: 'error_log', label: 'Mistake Log', icon: '' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { triggerHaptic(8); playAppleClick(); setCurrentView(item.id); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left apple-press transition-all ${
                  currentView === item.id ? 'bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30 shadow-sm' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* High-Yield Vault */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">High-Yield Vault</span>
            {[
              { id: 'volatile_vault', label: 'Volatile Formulas', icon: '' },
              { id: 'ibq_spotter', label: 'Real Image Atlas', icon: '' },
              { id: 'omfs_deep_dive', label: 'OMFS Deep Dive', icon: '' },
              { id: 'colleges', label: 'Colleges & Shortlist', icon: '' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { triggerHaptic(8); playAppleClick(); setCurrentView(item.id); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left apple-press transition-all ${
                  currentView === item.id ? 'bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30 shadow-sm' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* Rules & Result Hub */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">Strategy & Result</span>
            {[
              { id: 'after_result', label: 'After the Result', icon: '' },
              { id: 'hidden_neglected', label: '16 Hidden Rules', icon: '' },
              { id: 'watchlists', label: 'Master Checklists', icon: '' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { triggerHaptic(8); playAppleClick(); setCurrentView(item.id); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left apple-press transition-all ${
                  currentView === item.id ? 'bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30 shadow-sm' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>

          {/* System */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2">System</span>
            {[
              { id: 'update_centre', label: 'Update Centre', icon: '' },
              { id: 'settings', label: 'Settings & Sync', icon: '' }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => { triggerHaptic(8); playAppleClick(); setCurrentView(item.id); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left apple-press transition-all ${
                  currentView === item.id ? 'bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30 shadow-sm' : 'text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}

            <a
              href="/download-report"
              download="MDS_OS_AI_Handover_Master_Report.pdf"
              onClick={() => { triggerHaptic(10); playAppleClick(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left apple-press transition-all bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/25 text-xs"
            >
              <span className="text-base"></span>
              <span>Download PDF</span>
            </a>
          </div>
        </nav>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MAIN APPLICATION CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden relative">

        {/* Translucent Top Header Bar */}
        <header className="glass-nav-bar px-4 md:px-6 py-2.5 flex items-center justify-between z-20 shrink-0">
          <div className="flex items-center gap-3">
            {/* Scrolled Compact Title */}
            <span className={`text-xs font-bold text-white transition-opacity duration-200 ${scrollTop > 24 ? 'opacity-100' : 'opacity-0'}`}>
              {currentView.toUpperCase().replace('_', ' ')}
            </span>

            {/* Official Date Status (Fix 5: No countdown if unannounced) */}
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {daysLeft !== null ? (
                <span className="text-sky-300 font-bold">{daysLeft} Days to Exam</span>
              ) : (
                <span className="text-slate-300 font-medium">NEET-MDS 2027 - not announced yet</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Section 3A: Real Cloud Sync Status Pill */}
            <button
              onClick={() => { triggerHaptic(10); playAppleClick(); setCurrentView('settings'); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs apple-press cursor-pointer"
              title="Click to manage Supabase Cloud Sync"
            >
              <span className={`w-2 h-2 rounded-full ${
                syncState.status === 'synced' ? 'bg-emerald-400' :
                syncState.status === 'syncing' ? 'bg-sky-400 animate-spin' :
                syncState.status === 'offline' ? 'bg-amber-400' :
                syncState.status === 'error' ? 'bg-rose-500' : 'bg-slate-400'
              }`}></span>
              <span className="text-[11px] font-semibold text-slate-200 hidden sm:inline">
                {syncState.status === 'synced' ? `Synced v (${syncState.deviceName})` :
                 syncState.status === 'syncing' ? 'Syncing...' :
                 syncState.status === 'offline' ? 'Offline' :
                 syncState.status === 'error' ? 'Sync Error' : 'Local Only'}
              </span>
            </button>

            {/* Theme Toggle (Light / Dark / System) */}
            <button
              onClick={() => {
                triggerHaptic(8);
                playAppleClick();
                setThemeMode(prev => prev === 'dark' ? 'light' : prev === 'light' ? 'system' : 'dark');
              }}
              className="p-1.5 px-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs apple-press"
              title={`Current Theme: ${themeMode}`}
            >
              {themeMode === 'light' ? ' Light' : themeMode === 'dark' ? ' Dark' : ' Auto'}
            </button>

            {/* Direct PDF Download Button */}
            <a
              href="/download-report"
              download="MDS_OS_AI_Handover_Master_Report.pdf"
              onClick={() => { triggerHaptic(12); playAppleClick(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-bold apple-press"
              title="Download Master AI Handover Report (PDF)"
            >
              <span></span>
              <span className="hidden sm:inline">Download PDF</span>
            </a>

            {/* Sound Toggle */}
            <button
              onClick={() => {
                triggerHaptic(8);
                setUserSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }));
              }}
              className="p-1.5 px-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs apple-press"
              title={userSettings.soundEnabled ? 'Apple Sounds Active' : 'Muted'}
            >
              {userSettings.soundEnabled ? '' : ''}
            </button>

            {/* Spotlight Command Palette (Cmd+K) */}
            <button
              onClick={() => { triggerHaptic(10); playAppleClick(); setShowCommandPalette(true); }}
              className="p-1.5 px-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-slate-300 apple-press"
              title="Spotlight Search (Cmd+K)"
            >
              <span> Cmd+K</span>
            </button>
          </div>
        </header>

        {/* Scrollable View Container (Tracks scrollTop for Large Title shrink) */}
        <div
          onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
          className="flex-1 overflow-y-auto p-4 md:p-6 pb-28 md:pb-8 space-y-6"
        >

          {/* ========================================================================= */}
          {/* VIEW 1: TODAY (DAILY STUDY COMMAND CENTER) */}
          {/* ========================================================================= */}
          {currentView === 'dashboard' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              {/* Large Title with Scroll Shrink */}
              <div className="stagger-1">
                <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight large-title">
                  Today
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Full-time 8-hour execution rhythm & baseline diagnostic tracker
                </p>
              </div>

              {/* Section 3A Calm Signed-Out Banner */}
              {syncState.status === 'signed_out' && (
                <div className="p-3.5 px-4 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-between gap-3 text-slate-300 stagger-2">
                  <div className="flex items-center gap-2.5 text-xs">
                    <span className="text-slate-400 text-base"></span>
                    <span>Not signed in - progress is only on this device. Sign in in Settings to sync.</span>
                  </div>
                  <button
                    onClick={() => { triggerHaptic(10); playAppleClick(); setCurrentView('settings'); }}
                    className="text-xs px-3 py-1 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-400 font-bold border border-sky-400/30 shrink-0"
                  >
                    Sign in to Sync
                  </button>
                </div>
              )}

              {/* Provisional Eligibility Warning (Dismissible) */}
              {!userSettings.dismissedWarning && (
                <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between gap-3 text-amber-200 stagger-2">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl"></span>
                    <div className="text-xs space-y-1">
                      <div className="font-bold text-amber-300">Eligibility Warning (Provisional Baseline)</div>
                      <p className="leading-relaxed">
                        Eligibility is provisional. NEET-MDS requires internship completion by the cut-off date in the official bulletin (31 May in the 2026 cycle). The 2027 bulletin is not out yet - check your early-May 2027 completion date against it the day it is published.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      triggerHaptic(10);
                      playAppleClick();
                      setUserSettings(prev => ({ ...prev, dismissedWarning: true }));
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Hero Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 stagger-3">
                <div className="glass-card rounded-2xl p-4">
                  <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">Target Benchmark</span>
                  <h3 className="text-3xl font-extrabold text-white mt-1">785 <span className="text-xs font-normal text-slate-400">/ 960</span></h3>
                  <p className="text-[11px] text-emerald-400 mt-1 font-semibold">202+ Correct - at most 22 Wrong</p>
                </div>

                <div className="glass-card rounded-2xl p-4">
                  <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Part A Lock Speed</span>
                  <h3 className="text-3xl font-extrabold text-white mt-1">45s <span className="text-xs font-normal text-slate-400">/ Question</span></h3>
                  <p className="text-[11px] text-slate-400 mt-1 font-medium">100 Qs in 75 Mins Strict</p>
                </div>

                <div className="glass-card rounded-2xl p-4">
                  <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Due Errors</span>
                  <h3 className="text-3xl font-extrabold text-white mt-1">{errorLog.length} <span className="text-xs font-normal text-slate-400">Mistakes</span></h3>
                  <p className="text-[11px] text-amber-300 mt-1 font-medium">+2, +7, +21 Days Spaced Review</p>
                </div>

                <div className="glass-card rounded-2xl p-4">
                  <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">Study Streak</span>
                  <h3 className="text-3xl font-extrabold text-white mt-1">{streak} <span className="text-xs font-normal text-slate-400">Days Active</span></h3>
                  <p className="text-[11px] text-emerald-300 mt-1 font-medium">8 Hours Full-Time Focus</p>
                </div>
              </div>

              {/* 8-Hour Execution Blocks & Daily Routine */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 stagger-4">
                <div className="lg:col-span-2 glass-card rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-white">8-Hour Daily Study Blocks</h2>
                      <p className="text-xs text-slate-400">Tap to check completed blocks (auto-syncs to Android)</p>
                    </div>
                    <div className="text-xs px-3 py-1 rounded-full bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30">
                      {dayRoutineCompletion}% Done
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[
                      { key: 'theory', hours: '2h', title: 'Morning Deep Theory & Synopsis', desc: 'Dental Pulse synopsis + Standard textbook anchors (Weak subjects first!)' },
                      { key: 'mcqs', hours: '2h', title: 'Timed MCQ Sprint (100-150 Qs)', desc: '45 seconds/Q pacing; solve without consulting answer keys' },
                      { key: 'second_subject', hours: '2h', title: 'Second Subject & Volatile Tables', desc: 'PHD indices, Dental Materials W/P ratios, Physiology enzymes' },
                      { key: 'image_drill', hours: '1h', title: 'Image Atlas & Radiograph Spotter', desc: 'OPG patterns, histopathology, Le Fort fracture lines' },
                      { key: 'spaced_recall', hours: '1h', title: 'Spaced Repetition & Mistake Autopsy', desc: 'Review mistakes logged at +2, +7, and +21 days' }
                    ].map(block => (
                      <div
                        key={block.key}
                        onClick={() => {
                          triggerHaptic(10);
                          playAppleClick();
                          setDailyRoutine(prev => ({ ...prev, [block.key]: !prev[block.key] }));
                        }}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          dailyRoutine[block.key] ? 'bg-emerald-500/10 border-emerald-500/30 text-white' : 'bg-white/[0.02] border-white/10 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${
                            dailyRoutine[block.key] ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'
                          }`}>
                            {dailyRoutine[block.key] ? 'v' : ''}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-2">
                              <span>{block.title}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">{block.hours}</span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">{block.desc}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Action Hub */}
                <div className="space-y-4">
                  <div className="glass-card rounded-3xl p-5 space-y-3">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Fast Practice Shortcuts</h3>
                    
                    <button
                      onClick={handleStartDailyQuiz}
                      className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs apple-press flex items-center justify-between shadow-lg shadow-sky-500/25"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg"></span>
                        <div className="text-left">
                          <div>Start Daily Mixed Quiz</div>
                          <div className="text-[10px] text-sky-100 font-normal">10 Questions (Weak subjects weighted)</div>
                        </div>
                      </div>
                      <span>&rarr;</span>
                    </button>

                    <button
                      onClick={handleStartCbtMock}
                      className="w-full py-3 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white font-bold text-xs apple-press flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg"></span>
                        <div className="text-left">
                          <div>National CBT Mock Simulator</div>
                          <div className="text-[10px] text-slate-400 font-normal">Strict Part A 75-Min Lock</div>
                        </div>
                      </div>
                      <span>&rarr;</span>
                    </button>

                    <button
                      onClick={handleStart15ImageDrill}
                      className="w-full py-3 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/10 border border-white/10 text-white font-bold text-xs apple-press flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg"></span>
                        <div className="text-left">
                          <div>15-Image Diagnosis Drill</div>
                          <div className="text-[10px] text-slate-400 font-normal">45s / Real Medical Radiograph</div>
                        </div>
                      </div>
                      <span>&rarr;</span>
                    </button>

                    <button
                      onClick={() => setShowAddErrorModal(true)}
                      className="w-full py-3 px-4 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold text-xs apple-press flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg"></span>
                        <div className="text-left">
                          <div>Log Mistake in Notebook</div>
                          <div className="text-[10px] text-amber-400/80 font-normal">Autopsy for spaced repetition</div>
                        </div>
                      </div>
                      <span>+</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: 23-WEEK STUDY ROADMAP */}
          {/* ========================================================================= */}
          {currentView === 'plan' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="stagger-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">23-Week Study Plan</h1>
                <p className="text-xs text-slate-400 mt-1">160 Days - 8 Hours/Day = 1,280 Focused Hours (Compress Phase 3, never Phase 1)</p>
              </div>

              <div className="space-y-4 stagger-2">
                {STUDY_WEEKS.map(week => (
                  <div key={week.week} className="glass-card rounded-3xl p-5 space-y-3">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-sky-400 px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/30">
                          Week {week.week}
                        </span>
                        <span className="text-xs font-bold text-white">Phase {week.phase}</span>
                      </div>

                      <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!(planChecklist[week.week] && planChecklist[week.week].value)}
                          onChange={() => {
                            triggerHaptic(10);
                            playAppleClick();
                            const nowVal = !!(planChecklist[week.week] && planChecklist[week.week].value);
                            setPlanChecklist(prev => ({
                              ...prev,
                              [week.week]: { value: !nowVal, updatedAt: new Date().toISOString() }
                            }));
                          }}
                          className="w-4 h-4 rounded text-sky-500"
                        />
                        <span>Completed</span>
                      </label>
                    </div>

                    <div className="text-xs space-y-1 text-slate-300">
                      <div><strong className="text-white">Subjects:</strong> {week.subjects}</div>
                      <div><strong className="text-white">Goal & Work:</strong> {week.goal}</div>
                      <div><strong className="text-white">Phase:</strong> {week.phaseName} ({week.title})</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 3: 17 SUBJECTS TRACKER */}
          {/* ========================================================================= */}
          {currentView === 'curriculum' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 stagger-1">
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">17 BDS Subjects</h1>
                  <p className="text-xs text-slate-400 mt-1">Every subject ~ 56 marks (14 Qs). No subject can be safely skipped.</p>
                </div>

                <div className="flex items-center gap-2">
                  {['ALL', 'A', 'B'].map(part => (
                    <button
                      key={part}
                      onClick={() => setPartFilter(part)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                        partFilter === part ? 'bg-sky-500 text-white border-sky-400' : 'bg-white/5 border-white/10 text-slate-300'
                      }`}
                    >
                      {part === 'ALL' ? 'All Subjects' : `Part ${part}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-2">
                {((contentPack.examPattern && contentPack.examPattern.subjectDistribution) || contentPack.subjectDistribution || [])
                  .filter(s => partFilter === 'ALL' || s.part === partFilter)
                  .map(subj => {
                    const prog = subjectProgress[subj.subject] || {};
                    const conf = (prog.confidence && prog.confidence.value !== undefined) ? prog.confidence.value : (subj.isWeak ? 45 : 75);
                    const mcqs = (prog.mcqsDone && prog.mcqsDone.value !== undefined) ? prog.mcqsDone.value : 0;

                    return (
                      <div key={subj.subject} className="glass-card rounded-3xl p-5 space-y-3">
                        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono">Part {subj.part}</span>
                              <h3 className="text-xs font-bold text-white">{subj.subject}</h3>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{subj.questions} Questions - {subj.marks} Marks</span>
                          </div>

                          {subj.isWeak && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                              Priority Focus
                            </span>
                          )}
                        </div>

                        {/* Confidence Slider */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Confidence</span>
                            <span className="font-bold text-sky-400">{conf}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={conf}
                            onChange={e => {
                              const val = parseInt(e.target.value, 10);
                              setSubjectProgress(prev => ({
                                ...prev,
                                [subj.subject]: {
                                  ...(prev[subj.subject] || {}),
                                  confidence: { value: val, updatedAt: new Date().toISOString() }
                                }
                              }));
                            }}
                            className="w-full accent-sky-500 cursor-pointer"
                          />
                        </div>

                        {/* MCQs Counter */}
                        <div className="flex items-center justify-between text-xs pt-1">
                          <span className="text-slate-400">MCQs Solved: <strong className="text-white">{mcqs}</strong></span>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                triggerHaptic(8);
                                playAppleClick();
                                setSubjectProgress(prev => ({
                                  ...prev,
                                  [subj.subject]: {
                                    ...(prev[subj.subject] || {}),
                                    mcqsDone: { value: Math.max(0, mcqs - 50), updatedAt: new Date().toISOString() }
                                  }
                                }));
                              }}
                              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white font-bold"
                            >
                              -50
                            </button>
                            <button
                              onClick={() => {
                                triggerHaptic(8);
                                playAppleClick();
                                setSubjectProgress(prev => ({
                                  ...prev,
                                  [subj.subject]: {
                                    ...(prev[subj.subject] || {}),
                                    mcqsDone: { value: mcqs + 50, updatedAt: new Date().toISOString() }
                                  }
                                }));
                              }}
                              className="px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold border border-sky-400/30"
                            >
                              +50
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 4: TIMED CBT MOCK SIMULATOR & CALCULATOR (Fix 7: Part A Lock) */}
          {/* ========================================================================= */}
          {currentView === 'cbt_mock' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="stagger-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">CBT Simulator & Mocks</h1>
                <p className="text-xs text-slate-400 mt-1">240 Questions CBT: Part A (100 Qs / 75m strict lock) + Part B (140 Qs / 105m). +4/-1 Scoring.</p>
              </div>

              {/* CBT Active Simulator Container */}
              {cbtActive && !cbtCompleted ? (
                <div className="glass-card rounded-3xl p-6 space-y-6 border border-sky-500/40 shadow-2xl stagger-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl"></span>
                      <div>
                        <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
                          {cbtPart === 'A' ? 'Section 1: Part A (General Sciences)' : 'Section 2: Part B (Clinical Dental Sciences)'}
                        </div>
                        <div className="text-sm font-extrabold text-white">
                          Question {cbtCurrentIndex + 1} of {cbtPart === 'A' ? CBT_PART_A_MOCK_QUESTIONS.length : CBT_PART_B_MOCK_QUESTIONS.length}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="p-2 px-3 rounded-xl bg-black/40 border border-white/10 font-mono text-base font-bold text-amber-300">
                         {cbtPart === 'A' ? formatTime(cbtTimerA) : formatTime(cbtTimerB)}
                      </div>

                      {cbtPart === 'A' ? (
                        <button
                          onClick={handleLockPartA}
                          className="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs apple-press shadow-md shadow-rose-500/20"
                        >
                           Lock Part A & Proceed
                        </button>
                      ) : (
                        <button
                          onClick={handleFinishCbtTest}
                          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-xs apple-press shadow-md shadow-emerald-500/20"
                        >
                          Finish & Submit CBT
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Display */}
                  {(() => {
                    const qList = cbtPart === 'A' ? CBT_PART_A_MOCK_QUESTIONS : CBT_PART_B_MOCK_QUESTIONS;
                    const q = qList[cbtCurrentIndex] || qList[0];
                    const selected = cbtAnswers[q.id];
                    const flagged = !!cbtFlagged[q.id];

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between text-xs text-slate-400">
                          <span>Subject: <strong className="text-white">{q.subject}</strong></span>
                          <button
                            onClick={() => handleToggleCbtFlag(q.id)}
                            className={`px-2.5 py-1 rounded-lg border font-bold text-[11px] ${
                              flagged ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-white/5 border-white/10 text-slate-400'
                            }`}
                          >
                            {flagged ? ' Flagged' : ' Flag for Review'}
                          </button>
                        </div>

                        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-sm font-semibold text-white leading-relaxed">
                          {q.num}. {q.q}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {q.options.map((opt, oIdx) => (
                            <button
                              key={oIdx}
                              onClick={() => handleSelectCbtAnswer(q.id, oIdx)}
                              className={`p-3.5 rounded-xl border text-left transition-all apple-press ${
                                selected === oIdx ? 'bg-sky-500/25 border-sky-400 text-white font-bold shadow-md shadow-sky-500/20' : 'bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/[0.05]'
                              }`}
                            >
                              <span className="font-mono text-sky-400 mr-2 font-bold">{String.fromCharCode(65 + oIdx)}.</span>
                              {opt}
                            </button>
                          ))}
                        </div>

                        {/* Navigation controls */}
                        <div className="flex items-center justify-between pt-2">
                          <button
                            onClick={() => setCbtCurrentIndex(prev => Math.max(0, prev - 1))}
                            disabled={cbtCurrentIndex === 0}
                            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-bold text-xs"
                          >
                            &larr; Previous Q
                          </button>
                          <button
                            onClick={() => setCbtCurrentIndex(prev => Math.min(qList.length - 1, prev + 1))}
                            disabled={cbtCurrentIndex === qList.length - 1}
                            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-40 text-white font-bold text-xs"
                          >
                            Next Q &rarr;
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : null}

              {/* CBT Completed Result Banner */}
              {cbtCompleted && cbtResultSummary && (
                <div className="p-6 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 text-white space-y-3 stagger-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-emerald-300">CBT Mock Test Submitted & Scored</h3>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500 text-white font-bold">Auto-Saved to Progress</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs pt-1">
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-slate-400 text-[10px]">Total Score</span>
                      <div className="text-2xl font-extrabold text-white">{cbtResultSummary.totalScore} / 960</div>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-slate-400 text-[10px]">Accuracy</span>
                      <div className="text-2xl font-extrabold text-sky-400">{cbtResultSummary.accuracy}%</div>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-slate-400 text-[10px]">Part A (Locked)</span>
                      <div className="text-lg font-bold text-white">+{cbtResultSummary.partA_C * 4 - cbtResultSummary.partA_W} ({cbtResultSummary.partA_C}C / {cbtResultSummary.partA_W}W)</div>
                    </div>
                    <div className="p-3 rounded-xl bg-black/40 border border-white/10">
                      <span className="text-slate-400 text-[10px]">Part B</span>
                      <div className="text-lg font-bold text-white">+{cbtResultSummary.partB_C * 4 - cbtResultSummary.partB_W} ({cbtResultSummary.partB_C}C / {cbtResultSummary.partB_W}W)</div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setCbtCompleted(false); setCbtActive(false); }}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs"
                  >
                    Close Result
                  </button>
                </div>
              )}

              {/* Start Simulator Button */}
              {!cbtActive && (
                <div className="glass-card rounded-3xl p-6 text-center space-y-3 stagger-2">
                  <div className="w-12 h-12 rounded-2xl bg-sky-500/20 text-sky-400 text-2xl flex items-center justify-center mx-auto">
                    
                  </div>
                  <h3 className="text-base font-bold text-white">Launch National Timed CBT Simulator</h3>
                  <p className="text-xs text-slate-300 max-w-md mx-auto">
                    Simulates the exact NBEMS interface. Part A locks permanently at 75 minutes. Unused time does not roll over.
                  </p>
                  <button
                    onClick={handleStartCbtMock}
                    className="py-3 px-6 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs apple-press shadow-lg shadow-sky-500/25"
                  >
                    Start 240-Q CBT Test Now
                  </button>
                </div>
              )}

              {/* Mock Score Calculator (+4 / -1 / 0) & Target Chart (765 / 790) */}
              <div className="glass-card rounded-3xl p-6 space-y-4 stagger-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">NBEMS Mock Score Calculator (+4 / -1 / 0)</h3>
                    <p className="text-xs text-slate-400">Benchmark check: 202 Correct & 22 Wrong (16 Unattempted) = 786 / 960. Guessing EV = 5p - 1.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Calculated Score: </span>
                    <strong className="text-lg font-extrabold text-emerald-400">
                      {((Number(calcPartAC)||0) + (Number(calcPartBC)||0)) * 4 - ((Number(calcPartAW)||0) + (Number(calcPartBW)||0))} / 960
                    </strong>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-6 gap-3 text-xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Source / Mock Name</label>
                    <input type="text" value={calcSource} onChange={e => setCalcSource(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Part A Correct (100)</label>
                    <input type="number" min="0" max="100" value={calcPartAC} onChange={e => setCalcPartAC(parseInt(e.target.value||'0',10))} className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Part A Wrong</label>
                    <input type="number" min="0" max="100" value={calcPartAW} onChange={e => setCalcPartAW(parseInt(e.target.value||'0',10))} className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Part B Correct (140)</label>
                    <input type="number" min="0" max="140" value={calcPartBC} onChange={e => setCalcPartBC(parseInt(e.target.value||'0',10))} className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white" />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">Part B Wrong</label>
                    <input type="number" min="0" max="140" value={calcPartBW} onChange={e => setCalcPartBW(parseInt(e.target.value||'0',10))} className="w-full bg-white/5 border border-white/10 rounded-xl p-2 text-white" />
                  </div>
                  <div className="flex items-end">
                    <button onClick={handleLogCalculatedMock} className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs apple-press">
                      + Log Mock
                    </button>
                  </div>
                </div>
              </div>

              {/* Score History & Past Mocks */}
              <div className="glass-card rounded-3xl p-6 space-y-4 stagger-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">Mock Test History & Analytics (Target Lines: 765 AIR-10 & 790 Goal)</h3>
                  <span className="text-xs text-slate-400">{mockScores.filter(m => !m.deletedAt).length} Active Mocks</span>
                </div>
                <div className="space-y-2">
                  {mockScores.filter(m => !m.deletedAt).map(m => (
                    <div key={m.id} className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{m.source}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{m.date}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Part A: {m.partA_C}C / {m.partA_W}W - Part B: {m.partB_C}C / {m.partB_W}W - Accuracy: {m.accuracy}%
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-extrabold ${m.totalScore >= 765 ? 'text-emerald-400' : 'text-sky-400'}`}>
                          {m.totalScore} <span className="text-xs text-slate-400">/ 960</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          {m.totalScore >= 765 ? 'AIR 10 Range' : `${765 - m.totalScore} pts to AIR 10`}
                        </span>
                        <button onClick={() => handleDeleteMockRecord(m.id)} className="text-[10px] text-rose-400 hover:underline mt-1">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 5: DAILY MIXED-SUBJECT QUIZ (Fix 7) */}
          {/* ========================================================================= */}
          {currentView === 'daily_quiz' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="stagger-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Daily Mixed Diagnostic Quiz</h1>
                <p className="text-xs text-slate-400 mt-1">10 High-Yield Questions - Weak subjects (PHD, Physiology, Dental Materials) weighted heavier.</p>
              </div>

              {!quizFinished ? (
                <div className="glass-card rounded-3xl p-6 space-y-5 stagger-2">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-bold text-sky-400 px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-500/30">
                      Question {quizIndex + 1} of {DAILY_QUIZ_POOL.length}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">Score: <strong className="text-white">{quizScore}</strong></span>
                  </div>

                  {(() => {
                    const q = DAILY_QUIZ_POOL[quizIndex];
                    return (
                      <div className="space-y-4">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{q.subject}</span>
                        <h3 className="text-sm font-semibold text-white leading-relaxed">{q.question}</h3>

                        <div className="space-y-2.5">
                          {q.options.map((opt, idx) => {
                            let btnStyle = 'bg-white/[0.03] border-white/10 text-slate-200 hover:bg-white/[0.06]';
                            if (quizShowExplanation) {
                              if (idx === q.correct) btnStyle = 'bg-emerald-500/25 border-emerald-400 text-white font-bold';
                              else if (quizSelectedOption === idx) btnStyle = 'bg-rose-500/25 border-rose-400 text-white';
                            }
                            return (
                              <button
                                key={idx}
                                onClick={() => handleQuizAnswer(idx)}
                                className={`w-full p-3.5 rounded-2xl border text-left text-xs transition-all apple-press ${btnStyle}`}
                              >
                                <span className="font-mono text-sky-400 mr-2 font-bold">{String.fromCharCode(65 + idx)}.</span>
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {quizShowExplanation && (
                          <div className="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-xs text-sky-200 space-y-2 animate-fade-in">
                            <strong className="text-white">Explanation & Standard Anchor:</strong>
                            <p className="leading-relaxed">{q.explanation}</p>
                            <button
                              onClick={handleQuizNext}
                              className="py-2 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs apple-press mt-1"
                            >
                              {quizIndex + 1 < DAILY_QUIZ_POOL.length ? 'Next Question &rarr;' : 'Finish Quiz'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="glass-card rounded-3xl p-8 text-center space-y-4 stagger-2">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 text-3xl flex items-center justify-center mx-auto">
                    
                  </div>
                  <h3 className="text-lg font-extrabold text-white">Daily Quiz Completed!</h3>
                  <div className="text-3xl font-extrabold text-sky-400">{quizScore} <span className="text-xs text-slate-400">/ 40</span></div>
                  <p className="text-xs text-slate-300">Your score has been saved to your progress and synced.</p>
                  <button
                    onClick={handleStartDailyQuiz}
                    className="py-2.5 px-6 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs apple-press"
                  >
                    Retake Quiz
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 6: ERROR LOG / MISTAKE NOTEBOOK */}
          {/* ========================================================================= */}
          {currentView === 'error_log' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 stagger-1">
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">Mistake Notebook</h1>
                  <p className="text-xs text-slate-400 mt-1">Spaced Repetition Review (+2, +7, +21 Days). Mistakes become volatile cheat sheets.</p>
                </div>

                <button
                  onClick={() => setShowAddErrorModal(true)}
                  className="px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs apple-press shadow-md shadow-sky-500/20"
                >
                  + Add Mistake Entry
                </button>
              </div>

              <div className="space-y-3 stagger-2">
                {errorLog.filter(err => !err.deletedAt).map(err => (
                  <div key={err.id} className="glass-card rounded-3xl p-5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{err.subject}</span>
                        <h3 className="text-xs font-bold text-white mt-0.5">{err.topic}</h3>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {err.reason}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 text-slate-300">
                      <div><strong className="text-slate-400">What went wrong:</strong> {err.whatWentWrong}</div>
                      <div><strong className="text-emerald-400">Correct Fact:</strong> {err.correctFact}</div>
                      <div className="text-[11px] text-slate-400"><strong className="text-slate-300">Reference:</strong> {err.reference} | Review Stage: +{err.reviewDay || 2}d {err.isVolatile ? '(Volatile Sheet)' : ''}</div>
                      <div className="flex items-center gap-2 pt-1">
                        <button onClick={() => handleAdvanceErrorReview(err.id)} className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold text-[11px]">Advance Review (+2/+7/+21d)</button>
                        <button onClick={() => handleDeleteErrorRecord(err.id)} className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 font-bold text-[11px]">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 7: VOLATILE FORMULAS & FLASHCARDS */}
          {/* ========================================================================= */}
          {currentView === 'volatile_vault' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="stagger-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Volatile Facts & Flashcards</h1>
                <p className="text-xs text-slate-400 mt-1">High-yield numbers that slip before exam day: Malamed LA doses, W/P ratios, Steiner cephalometrics.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-2">
                {[
                  { id: 'v_la_lido', category: 'Pharmacology', title: 'Lidocaine Doses & Ceilings', front: 'Maximum dose with vs without adrenaline?', back: 'Without adrenaline: 4.4 mg/kg (max 300 mg). With adrenaline: 7.0 mg/kg (max 500 mg). 2% cartridge = 36 mg per 1.8ml or 40 mg per 2.0ml.' },
                  { id: 'v_la_adren', category: 'Pharmacology', title: 'Adrenaline Ceilings', front: 'Healthy vs Cardiac patient adrenaline ceilings?', back: 'Healthy: 200 ug (0.2 mg) per appointment. Cardiac: 40 ug (0.04 mg) = approx 2 cartridges of 1:100,000.' },
                  { id: 'v_gypsum', category: 'Dental Materials', title: 'Gypsum W:P Ratios', front: 'W:P ratios for Type I, II, III, IV, V gypsum?', back: 'Type I Plaster: 0.50-0.75; Type II Model: 0.45-0.50; Type III Stone: 0.28-0.30; Type IV Die Stone: 0.22-0.24; Type V High Strength/Expansion: 0.18-0.22. Gauging water = 18.6 ml/100g.' },
                  { id: 'v_amalgam', category: 'Dental Materials', title: 'Amalgam Phases & Chemistry', front: 'Which phase is weakest and eliminated in high-copper amalgam?', back: 'Gamma-2 (Sn7-8Hg) is weakest and most corrosion-prone. Eliminated in high-Cu (>6%) alloys by eta-prime (Cu6Sn5) phase.' },
                  { id: 'v_ceph', category: 'Orthodontics', title: 'Steiner Cephalometrics Norms', front: 'Steiner norms for SNA, SNB, ANB, U1-NA, L1-NB?', back: 'SNA: 82 deg +/- 2 deg; SNB: 80 deg +/- 2 deg; ANB: 2 deg +/- 2 deg (Class I 2-4 deg, Class II >4 deg, Class III <2 deg); U1-NA: 22 deg / 4mm; L1-NB: 25 deg / 4mm; Interincisal: 130-135 deg.' },
                  { id: 'v_pederson', category: 'OMFS', title: 'Pederson Index for Impactions', front: 'Difficulty scoring breakdown in Pederson index?', back: 'Angulation: Mesioangular 1, Horizontal 2, Vertical 3, Distoangular 4. Depth: Level A 1, Level B 2, Level C 3. Ramus: Class I 1, Class II 2, Class III 3. Sum 3-4 Easy, 5-6 Moderate, 7-10 Difficult.' }
                ].map(card => {
                  const isShaky = !!(shakyCards[card.id] && shakyCards[card.id].value);
                  const isFlipped = revealedIbqs[card.id];

                  return (
                    <div key={card.id} className="glass-card rounded-3xl p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">{card.category}</span>
                        <button
                          onClick={() => {
                            triggerHaptic(8);
                            playAppleClick();
                            setShakyCards(prev => ({
                              ...prev,
                              [card.id]: { value: !isShaky, updatedAt: new Date().toISOString() }
                            }));
                          }}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition-all ${
                            isShaky ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-white/5 border-white/10 text-slate-400'
                          }`}
                        >
                          {isShaky ? ' Still Shaky' : 'v Mastered'}
                        </button>
                      </div>

                      <h3 className="text-xs font-bold text-white">{card.title}</h3>

                      <div
                        onClick={() => {
                          triggerHaptic(8);
                          playAppleClick();
                          setRevealedIbqs(prev => ({ ...prev, [card.id]: !prev[card.id] }));
                        }}
                        className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs cursor-pointer hover:bg-white/[0.06] transition-all"
                      >
                        {!isFlipped ? (
                          <div className="text-slate-300 flex items-center justify-between">
                            <span>{card.front}</span>
                            <span className="text-[10px] text-sky-400 font-bold">Tap to Reveal &rarr;</span>
                          </div>
                        ) : (
                          <div className="text-emerald-300 font-semibold leading-relaxed">
                            {card.back}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 8: REAL MEDICAL IMAGE ATLAS (Zero AI Images) */}
          {/* ========================================================================= */}
          {currentView === 'ibq_spotter' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 stagger-1">
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">Real Medical Image Atlas</h1>
                  <p className="text-xs text-slate-400 mt-1">
                    Strict Zero-AI Image Policy. Real radiographs, histology, and anatomical diagrams with verified citations.
                  </p>
                </div>

                <button
                  onClick={handleStart15ImageDrill}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs apple-press shadow-md shadow-sky-500/20"
                >
                   Start 15-Image Diagnosis Drill
                </button>
              </div>

              {/* 15-Image Drill Modal Container */}
              {drillActive && !drillCompleted && (
                <div className="glass-card rounded-3xl p-6 space-y-4 border border-sky-500/40 shadow-2xl stagger-2">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <span className="text-xs font-bold text-sky-400 px-2.5 py-1 rounded-full bg-sky-500/20 border border-sky-500/30">
                      Image {drillIndex + 1} of 15
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-300"> {drillTimer}s</span>
                  </div>

                  {(() => {
                    const q = drillQuestions[drillIndex];
                    if (!q) return null;
                    return (
                      <div className="space-y-4">
                        <div className="w-full max-h-72 bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-white/10">
                          <img
                            src={q.image.imageUrl || q.image.imageFile || q.image.placeholderSourceUrl}
                            alt={q.image.diagnosis}
                            className="max-h-72 object-contain"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                          {q.options.map((opt, idx) => {
                            let style = 'bg-white/[0.03] border-white/10 text-slate-200 hover:bg-white/[0.06]';
                            if (drillSelectedAnswer !== null) {
                              if (idx === q.correctIndex) style = 'bg-emerald-500/25 border-emerald-400 text-white font-bold';
                              else if (drillSelectedAnswer === idx) style = 'bg-rose-500/25 border-rose-400 text-white';
                            }
                            return (
                              <button
                                key={idx}
                                onClick={() => handleDrillAnswer(idx)}
                                className={`p-3 rounded-xl border text-left transition-all apple-press ${style}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {drillSelectedAnswer !== null && (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={handleDrillNext}
                              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs"
                            >
                              {drillIndex + 1 < drillQuestions.length ? 'Next Image &rarr;' : 'Finish Drill'}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Image Grid with full credit and source links */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 stagger-3">
                {imageLibrary.map(img => (
                  <div key={img.id} className="glass-card rounded-3xl p-4 space-y-3 overflow-hidden">
                    {img.isPlaceholder || (!img.imageUrl && !img.imageFile) ? (
                      <div className="w-full h-48 bg-white/[0.04] rounded-2xl p-4 flex flex-col items-center justify-center text-center border border-white/10 space-y-2">
                        <span className="text-xs font-bold text-amber-300">Linked External Case (Licence Requires Direct Link)</span>
                        <p className="text-[11px] text-slate-300">{img.diagnosis}</p>
                        <a
                          href={img.placeholderSourceUrl || img.sourcePageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-300 text-xs font-bold hover:bg-sky-500/30"
                        >
                          View Original at Source
                        </a>
                      </div>
                    ) : (
                      <div
                        onClick={() => { setActiveZoomImage(img); setZoomLevel(1); }}
                        className="w-full h-48 bg-black/60 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 cursor-pointer relative group"
                      >
                        <img
                          src={img.imageUrl || img.imageFile}
                          alt={img.diagnosis}
                          loading="lazy"
                          className="max-h-48 object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-bold">
                          Tap to Zoom
                        </div>
                      </div>
                    )}

                    <div>
                      <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">{img.subject}</span>
                      <h3 className="text-xs font-bold text-white mt-0.5">{img.title}</h3>
                      <p className="text-[11px] text-emerald-400 font-semibold mt-0.5">Dx: {img.diagnosis}</p>
                    </div>

                    {/* Visible Credits & Source Link */}
                    <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 space-y-1">
                      <div><strong className="text-slate-300">Source:</strong> {img.sourceName} ({img.licence})</div>
                      <div><strong className="text-slate-300">Credit:</strong> {img.creditLine}</div>
                      <a
                        href={img.sourcePageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sky-400 hover:text-sky-300 underline block"
                      >
                        View Original Publication &rarr;
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 9: OMFS DEEP DIVE */}
          {/* ========================================================================= */}
          {currentView === 'omfs_deep_dive' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="stagger-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">OMFS Deep Dive</h1>
                <p className="text-xs text-slate-400 mt-1">Oral and Maxillofacial Surgery: Cut-offs, Surgical Mandibles, Fractures, and Airway Traps.</p>
              </div>

              {/* Why Top 10 Matters Card */}
              <div className="glass-card rounded-3xl p-6 space-y-3 border border-sky-500/30 stagger-2">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <span></span> Why Top-10 Matters for OMFS Aspirants
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {contentPack.omfsDeepDive?.whyTop10Matters || 'KGMU Lucknow and BHU Varanasi OMFS seats close in the Top 10 (Ranks 4 and 9 in 2025 Round 1). MAIDS New Delhi closed at Rank 1 in 2026 Round 1. Any government OMFS seat in AIQ Round 1 closes by Rank ~156.'}
                </p>
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
                  <strong>Important Notice:</strong> AIIMS New Delhi, JIPMER, and PGIMER dental seats are NOT through NEET-MDS - they are admitted through INI-CET, a completely separate exam with negative marking of -1/3.
                </div>
              </div>

              {/* Interactive Pederson Difficulty Index Calculator (Asked NEET-MDS 2024: 1+2+3 = 6) */}
              <div className="glass-card rounded-3xl p-6 space-y-4 border border-sky-500/30 stagger-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">Interactive Pederson Difficulty Index Calculator (Mandibular 3rd Molar)</h3>
                    <p className="text-xs text-slate-400">Total Score = Angulation (1-4) + Depth (1-3) + Ramus Relationship (1-3). 3-4 Easy, 5-6 Moderate, 7-10 Very Difficult.</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">Difficulty Score: </span>
                    <strong className="text-lg font-extrabold text-sky-400">
                      {pedAngulation + pedDepth + pedRamus} / 10 ({pedAngulation + pedDepth + pedRamus <= 4 ? 'Easy' : pedAngulation + pedDepth + pedRamus <= 6 ? 'Moderate' : 'Very Difficult'})
                    </strong>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Winter Angulation</label>
                    <select value={pedAngulation} onChange={e => setPedAngulation(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white">
                      <option value={1}>Mesioangular (1) - Most Common</option>
                      <option value={2}>Horizontal (2)</option>
                      <option value={3}>Vertical (3)</option>
                      <option value={4}>Distoangular (4) - Most Difficult</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Pell & Gregory Depth</label>
                    <select value={pedDepth} onChange={e => setPedDepth(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white">
                      <option value={1}>Level A (1) - Occlusal plane at/above 2nd molar</option>
                      <option value={2}>Level B (2) - Between occlusal & cervical line</option>
                      <option value={3}>Level C (3) - Below cervical line</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">Ramus Relationship</label>
                    <select value={pedRamus} onChange={e => setPedRamus(Number(e.target.value))} className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white">
                      <option value={1}>Class I (1) - Sufficient space</option>
                      <option value={2}>Class II (2) - Less than crown width</option>
                      <option value={3}>Class III (3) - Completely within ramus</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* High Yield Surgical Pearls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-3">
                {[
                  { title: 'Impactions Classification', desc: "Winter's lines: white (occlusal), amber (bone), red (depth of tooth in bone). Pederson difficulty index calculation: 1+2+3 = 6 (Asked 2024). Most common mandibular = mesioangular; most difficult mandibular = distoangular." },
                  { title: 'Fractures & Fixation', desc: "Le Fort I (floating palate, Guerin sign); II (pyramidal); III (craniofacial disjunction). Pterygoid plates fractured in all true Le Fort fractures. Mandible: most common condyle, second parasymphysis. Champy superior-border miniplate at the angle." },
                  { title: 'Ludwig Angina & Space Infections', desc: "Bilateral submandibular + sublingual + submental, wooden induration, elevated tongue, airway security first! Trismus involves medial pterygoid. Danger space 4 leads directly to posterior mediastinum." },
                  { title: 'Nerve Blocks & Local Anesthesia', desc: "IANB: needle breakage most common here; too posterior penetrates parotid gland leading to transient CN VII facial palsy. Gow-Gates targets condylar neck. Vazirani-Akinosi: closed-mouth block for trismus." }
                ].map((item, idx) => (
                  <div key={idx} className="glass-card rounded-3xl p-5 space-y-2">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <span className="text-sky-400"></span> {item.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 10: COLLEGES & SHORTLIST BUILDER (Fix 7 Complete) */}
          {/* ========================================================================= */}
          {currentView === 'colleges' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="stagger-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Colleges & Priority Shortlist</h1>
                <p className="text-xs text-slate-400 mt-1">16 Government Dental Colleges, OMFS Cut-offs, Monthly Stipends, Annual Fees, and Reorderable Shortlist.</p>
              </div>

              {/* My Shortlist Builder Section */}
              <div className="glass-card rounded-3xl p-6 space-y-4 border border-sky-500/30 stagger-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span></span> My College Priority Shortlist ({collegeShortlist.filter(c => !c.deletedAt).length})
                    </h2>
                    <p className="text-xs text-slate-400">Use Up / Down buttons to adjust priority order. Persists and syncs across devices.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  {collegeShortlist.filter(c => !c.deletedAt).map((col, idx, arr) => (
                    <div key={col.id} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center font-mono">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="font-bold text-white">{col.name}</div>
                          <div className="text-[11px] text-slate-400">{col.notes}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleMoveCollegeShortlist(idx, -1)}
                          disabled={idx === 0}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold"
                          title="Move Up"
                        >
                          Up
                        </button>
                        <button
                          onClick={() => handleMoveCollegeShortlist(idx, 1)}
                          disabled={idx === arr.length - 1}
                          className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold"
                          title="Move Down"
                        >
                          Down
                        </button>
                        <button
                          onClick={() => handleRemoveCollegeFromShortlist(col.id)}
                          className="px-2 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-bold ml-1"
                          title="Remove from shortlist"
                        >
                          x
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Full Colleges Table with Stipends & Bonds */}
              <div className="glass-card rounded-3xl p-6 space-y-4 stagger-3">
                <h3 className="text-sm font-bold text-white">All 16 Government AIQ Dental Institutes</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="text-[11px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                      <tr>
                        <th className="py-2.5 px-3">Institute</th>
                        <th className="py-2.5 px-3">State</th>
                        <th className="py-2.5 px-3">AIQ R1 Cut-off</th>
                        <th className="py-2.5 px-3">Stipend/Mo</th>
                        <th className="py-2.5 px-3">Annual Fee</th>
                        <th className="py-2.5 px-3">Bond</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {GOVT_COLLEGES_DATA.map(c => (
                        <tr key={c.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 px-3 font-semibold text-white">{c.name}</td>
                          <td className="py-3 px-3">{c.state}</td>
                          <td className="py-3 px-3 font-mono font-bold text-sky-400">{c.closingRank}</td>
                          <td className="py-3 px-3 font-mono text-emerald-400">Rs {c.stipendMonthly.toLocaleString()}</td>
                          <td className="py-3 px-3 font-mono">Rs {c.feeAnnual.toLocaleString()}</td>
                          <td className="py-3 px-3">{c.bondYears > 0 ? `${c.bondYears} Year` : 'No Bond'}</td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleAddCollegeToShortlist(c)}
                              className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-[11px]"
                            >
                              + Shortlist
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 11: AFTER THE RESULT HUB (Fix 7 Complete) */}
          {/* ========================================================================= */}
          {currentView === 'after_result' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="stagger-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">After the Result Hub</h1>
                <p className="text-xs text-slate-400 mt-1">Rank Predictor, 3-Year Cost Calculator, Freeze vs Float Choice Helper, and Round-by-Round Tracker.</p>
              </div>

              {/* 1. Rank Predictor (Estimated) */}
              <div className="glass-card rounded-3xl p-6 space-y-4 stagger-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span></span> NEET-MDS Rank Estimator (Historical 2024-2026 Anchors)
                  </h3>
                  <span className="text-[10px] text-amber-400 font-bold">Estimate only, not a promise</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-slate-400 text-[10px]">800+ Score</span>
                    <div className="text-base font-extrabold text-emerald-400 mt-1">AIR 1 - 3</div>
                    <p className="text-[10px] text-slate-400">Guaranteed top seat at KGMU/MAIDS</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-slate-400 text-[10px]">765 - 785 Score</span>
                    <div className="text-base font-extrabold text-sky-400 mt-1">AIR 4 - 10</div>
                    <p className="text-[10px] text-slate-400">Top 10 All India Rank target</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-slate-400 text-[10px]">720 - 750 Score</span>
                    <div className="text-base font-extrabold text-indigo-300 mt-1">AIR 15 - 45</div>
                    <p className="text-[10px] text-slate-400">Rohtak, LHMC, SCB Cuttack</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10">
                    <span className="text-slate-400 text-[10px]">650 - 700 Score</span>
                    <div className="text-base font-extrabold text-amber-400 mt-1">AIR 60 - 156</div>
                    <p className="text-[10px] text-slate-400">Govt OMFS AIQ Round 1 zone</p>
                  </div>
                </div>
              </div>

              {/* 2. 3-Year Cost vs Stipend Comparison Calculator */}
              <div className="glass-card rounded-3xl p-6 space-y-4 stagger-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span></span> 3-Year Cost vs Stipend Comparison Calculator
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                    <span className="font-bold text-white">Central / Delhi Institutes</span>
                    <p className="text-[11px] text-slate-400">e.g. MAIDS, Lady Hardinge, BHU, AMU</p>
                    <div className="pt-1 text-emerald-400 font-mono text-sm font-bold">Stipend: Rs 1.1L - 1.25L / mo</div>
                    <div className="text-slate-300">Annual Fee: ~Rs 18,000 - 25,000</div>
                    <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-300 text-[11px] font-bold">
                      Net 3-Year Surplus: +Rs 39 Lakhs
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                    <span className="font-bold text-white">State Government Colleges</span>
                    <p className="text-[11px] text-slate-400">e.g. Mumbai, Jaipur, Raipur, Hyderabad</p>
                    <div className="pt-1 text-sky-400 font-mono text-sm font-bold">Stipend: Rs 70k - 85k / mo</div>
                    <div className="text-slate-300">Annual Fee: ~Rs 35,000 - 60,000</div>
                    <div className="p-2 rounded-xl bg-sky-500/10 text-sky-300 text-[11px] font-bold">
                      Net 3-Year Surplus: +Rs 25 Lakhs
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-black/30 border border-white/10 space-y-2">
                    <span className="font-bold text-white">Deemed Universities</span>
                    <p className="text-[11px] text-slate-400">e.g. Manipal, A.B. Shetty, DY Patil</p>
                    <div className="pt-1 text-amber-400 font-mono text-sm font-bold">Stipend: Rs 15k - 30k / mo</div>
                    <div className="text-slate-300">Annual Fee: ~Rs 12L - 18L / yr</div>
                    <div className="p-2 rounded-xl bg-rose-500/10 text-rose-300 text-[11px] font-bold">
                      Net 3-Year Cost: -Rs 35 to 45 Lakhs
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. Freeze vs Float Choice-Filling Helper */}
              <div className="glass-card rounded-3xl p-6 space-y-3 stagger-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span></span> Freeze vs Float Visual Rules (MCC 2026 Protocol)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed text-slate-300">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                    <div className="font-bold text-sky-300 text-sm">Freeze Option</div>
                    <p>Candidate joins the allotted college in person, pays the admission fee, and locks the seat permanently.</p>
                    <p className="text-amber-300">No further upgradation is possible in subsequent rounds.</p>
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-1.5">
                    <div className="font-bold text-emerald-300 text-sm">Float Option</div>
                    <p>Documents are verified online. Candidate holds the current seat but participates in Round 2 or Round 3 for a higher-priority choice.</p>
                    <p className="text-emerald-300">If upgraded in next round, old seat is automatically released to other candidates.</p>
                  </div>
                </div>
              </div>

              {/* 4. Round-by-Round Counselling Tracker */}
              <div className="glass-card rounded-3xl p-6 space-y-4 stagger-5">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span></span> Round-by-Round Counselling Tracker (Saved & Synced)
                </h3>
                <div className="space-y-3 text-xs">
                  {[
                    { key: 'r1', name: 'Round 1 (AIQ & Deemed)', rules: 'Registration, choice filling, allotment. Free exit available (deposit safe).' },
                    { key: 'r2', name: 'Round 2 (Fresh Choices)', rules: 'Fresh choices required. Seat allotted and not joined = forfeiture of Rs 25,000 deposit.' },
                    { key: 'r3', name: 'Round 3 (Mop-Up)', rules: 'Non-joining here results in deposit forfeiture + debarment from further MCC rounds.' },
                    { key: 'stray', name: 'Stray Vacancy Round', rules: 'Only for candidates with no seat in any earlier round. Allotted seat MUST be joined.' }
                  ].map(r => {
                    const isDone = !!(counsellingTracker[r.key] && counsellingTracker[r.key].value);
                    return (
                      <div
                        key={r.key}
                        onClick={() => {
                          triggerHaptic(8);
                          playAppleClick();
                          setCounsellingTracker(prev => ({
                            ...prev,
                            [r.key]: { value: !isDone, updatedAt: new Date().toISOString() }
                          }));
                        }}
                        className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isDone ? 'bg-emerald-500/10 border-emerald-500/30 text-white' : 'bg-white/[0.02] border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs ${
                            isDone ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'
                          }`}>
                            {isDone ? 'v' : ''}
                          </div>
                          <div>
                            <div className="font-bold text-white">{r.name}</div>
                            <div className="text-[11px] text-slate-400">{r.rules}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          {/* ========================================================================= */}
          {/* VIEW 12: 16 HIDDEN & NEGLECTED RULES */}
          {/* ========================================================================= */}
          {currentView === 'hidden_neglected' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="stagger-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">16 Hidden & Neglected Rules</h1>
                <p className="text-xs text-slate-400 mt-1">Official NBEMS & MCC technical rules students routinely miss.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-2">
                {HIDDEN_RULES.map(rule => {
                  const isChecked = !!(hiddenRulesChecked[rule.id] && hiddenRulesChecked[rule.id].value);
                  return (
                    <div
                      key={rule.id}
                      onClick={() => {
                        triggerHaptic(8);
                        playAppleClick();
                        setHiddenRulesChecked(prev => ({
                          ...prev,
                          [rule.id]: { value: !isChecked, updatedAt: new Date().toISOString() }
                        }));
                      }}
                      className={`glass-card rounded-3xl p-5 space-y-2 cursor-pointer transition-all ${
                        isChecked ? 'border-emerald-500/30 bg-emerald-500/5' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider">{rule.group || rule.category} ({rule.year || '2026'})</span>
                        <div className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs ${
                          isChecked ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'
                        }`}>
                          {isChecked ? 'v' : ''}
                        </div>
                      </div>
                      <h3 className="text-xs font-bold text-white">{rule.title}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{rule.detail || rule.content}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 13: 5 MASTER CHECKLISTS */}
          {/* ========================================================================= */}
          {currentView === 'watchlists' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="stagger-1">
                <h1 className="text-3xl font-extrabold text-white tracking-tight">Master Checklists</h1>
                <p className="text-xs text-slate-400 mt-1">Step-by-step checklists across all phases of the examination cycle.</p>
              </div>

              <div className="space-y-4 stagger-2">
                {CHECKLISTS.map(cl => (
                  <div key={cl.id} className="glass-card rounded-3xl p-6 space-y-4">
                    <div className="border-b border-white/10 pb-2">
                      <h2 className="text-base font-extrabold text-white">{cl.title}</h2>
                      <p className="text-xs text-slate-400">{cl.description}</p>
                    </div>

                    <div className="space-y-2 text-xs">
                      {cl.items.map((item, iIdx) => {
                        const itemId = (item && typeof item === 'object' && item.id) ? item.id : iIdx;
                        const itemText = (item && typeof item === 'object' && item.text) ? item.text : String(item);
                        const itemKey = `${cl.id}_${itemId}`;
                        const isDone = !!(masterChecklistsChecked[itemKey] && masterChecklistsChecked[itemKey].value);
                        return (
                          <div
                            key={itemKey}
                            onClick={() => {
                              triggerHaptic(8);
                              playAppleClick();
                              setMasterChecklistsChecked(prev => ({
                                ...prev,
                                [itemKey]: { value: !isDone, updatedAt: new Date().toISOString() }
                              }));
                            }}
                            className={`p-3 rounded-2xl border flex items-center gap-3 cursor-pointer transition-all ${
                              isDone ? 'bg-emerald-500/10 border-emerald-500/30 text-white' : 'bg-white/[0.02] border-white/10 text-slate-300'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${
                              isDone ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-400'
                            }`}>
                              {isDone ? 'v' : ''}
                            </div>
                            <span className="leading-relaxed">{itemText}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 14: UPDATE CENTRE (Fix 6: Real Fetch & Honest Status) */}
          {/* ========================================================================= */}
          {currentView === 'update_centre' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 stagger-1">
                <div>
                  <h1 className="text-3xl font-extrabold text-white tracking-tight">Official Update Centre</h1>
                  <p className="text-xs text-slate-400 mt-1">Live fetch from NBEMS, MCC, and DCI official portals.</p>
                </div>

                <button
                  onClick={handleCheckOfficialUpdates}
                  disabled={proxyCheckState.checking}
                  className="px-4 py-2.5 rounded-2xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-xs apple-press shadow-md shadow-sky-500/20"
                >
                  {proxyCheckState.checking ? 'Checking Portals...' : ' Check Portals Now'}
                </button>
              </div>

              {/* Last Checked Bar */}
              {proxyCheckState.lastChecked && (
                <div className="p-3 px-4 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-slate-300 flex items-center justify-between stagger-2">
                  <span>Last Checked: <strong className="text-white">{new Date(proxyCheckState.lastChecked).toLocaleString()}</strong></span>
                  <span className="text-[10px] text-slate-400">Cached for 30 Mins</span>
                </div>
              )}

              {/* Source Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 stagger-2">
                {Object.keys(proxyCheckState.sources).map(srcId => {
                  const src = proxyCheckState.sources[srcId];
                  return (
                    <div key={srcId} className="glass-card rounded-3xl p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="text-xs font-bold text-white">{src.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          src.status === 'ok' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                          src.status === 'blocked' ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' :
                          'bg-white/10 text-slate-400 border-white/10'
                        }`}>
                          {src.statusText}
                        </span>
                      </div>

                      {src.details && (
                        <p className="text-[11px] text-slate-400">{src.details}</p>
                      )}

                      {src.status === 'blocked' && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 space-y-1.5">
                          <p>Cloudflare human challenge prevents automatic background scraping.</p>
                          <a
                            href={src.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-300 hover:text-white underline font-bold block"
                          >
                            Open Official Portal Manually &rarr;
                          </a>
                        </div>
                      )}

                      {src.notices && src.notices.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          {src.notices.map((n, idx) => (
                            <a
                              key={idx}
                              href={n.url}
                              target="_blank"
                              rel="noreferrer"
                              className="block p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-[11px] text-sky-300 underline"
                            >
                              {n.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Technical Limits Notice */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 space-y-1 stagger-3">
                <strong className="text-slate-300">Technical Transparency Notice:</strong>
                <p>
                  NBEMS employs Cloudflare Turnstile human-verification challenges. Progressive Web Apps cannot silently bypass anti-bot protections. Official updates require user review before replacing bundled planning facts.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 15: SETTINGS & REAL CLOUD SYNC (Section 3A in Full) */}
          {/* ========================================================================= */}
          {currentView === 'settings' && (
            <div className="space-y-6 max-w-6xl mx-auto">
              {/* Section 3A: Cloud Sync Account at the TOP */}
              <div className="glass-card rounded-3xl p-6 space-y-6 border border-sky-500/30 shadow-2xl shadow-sky-950/40 stagger-1">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl"></span>
                      <h2 className="text-base font-extrabold text-white">Cross-Device Real Cloud Sync</h2>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30">
                        Priority #1
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      MacBook Air & Android phone real-time synchronization via Supabase PostgreSQL, Auth & Realtime
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      syncState.status === 'synced' ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' :
                      syncState.status === 'syncing' ? 'bg-sky-400 animate-spin' :
                      syncState.status === 'offline' ? 'bg-amber-400' :
                      syncState.status === 'error' ? 'bg-rose-500' : 'bg-slate-400'
                    }`}></span>
                    <span className="text-xs font-bold text-white">
                      {syncState.status === 'synced' ? 'Synced v' :
                       syncState.status === 'syncing' ? 'Syncing...' :
                       syncState.status === 'offline' ? 'Offline (Saved Locally)' :
                       syncState.status === 'error' ? 'Sync Error' : 'Local Only'}
                    </span>
                  </div>
                </div>

                {/* Sub-Card 1: Supabase Backend Connection */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <span></span> Supabase Backend Connection
                    </h3>
                    {syncState.isConfigured ? (
                      <span className="text-[10px] text-emerald-400 font-bold"> Connected</span>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-bold"> Setup Required</span>
                    )}
                  </div>

                  {!syncState.isConfigured ? (
                    <div className="space-y-3 text-xs">
                      <div className="p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300 space-y-1.5">
                        <p className="font-bold">Step-by-step 3-minute setup (Free Supabase Tier):</p>
                        <ol className="list-decimal list-inside space-y-1 text-slate-300">
                          <li>Create a free account at <strong className="text-white">supabase.com</strong> and create a project.</li>
                          <li>Open <strong className="text-white">SQL Editor</strong>, paste and run <code className="bg-black/40 px-1 py-0.5 rounded text-sky-300">supabase/schema.sql</code>.</li>
                          <li>In <strong className="text-white">Authentication &rarr; Providers</strong>, ensure Email is enabled.</li>
                          <li>In <strong className="text-white">Project Settings &rarr; API</strong>, copy your Project URL & Anon Public Key below:</li>
                        </ol>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-slate-300 font-semibold">Supabase Project URL</label>
                          <input
                            type="url"
                            value={supabaseUrlInput}
                            onChange={e => setSupabaseUrlInput(e.target.value)}
                            placeholder="https://xyzcompany.supabase.co"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white font-mono text-[11px]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-slate-300 font-semibold">Supabase Anon Public Key</label>
                          <input
                            type="password"
                            value={supabaseKeyInput}
                            onChange={e => setSupabaseKeyInput(e.target.value)}
                            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white font-mono text-[11px]"
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleSaveSupabaseConfig}
                        className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs apple-press shadow-md shadow-sky-500/20"
                      >
                        Save Configuration & Connect
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-black/30 border border-white/10 text-xs font-mono">
                      <span className="text-slate-400 text-[11px]">URL: {supabaseUrlInput.substring(0, 32)}...</span>
                      <button
                        onClick={handleClearSupabaseConfig}
                        className="text-[11px] text-rose-400 hover:text-rose-300 underline font-sans"
                      >
                        Disconnect / Reconfigure
                      </button>
                    </div>
                  )}
                </div>

                {/* Sub-Card 2: Account Authentication */}
                <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-4">
                  <h3 className="text-xs font-bold text-white flex items-center gap-2">
                    <span></span> Sync Account & Authentication
                  </h3>

                  {!syncState.user ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 border-b border-white/10 pb-2">
                        <button
                          onClick={() => setAuthMode('magic')}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                            authMode === 'magic' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400'
                          }`}
                        >
                           Magic Link
                        </button>
                        <button
                          onClick={() => setAuthMode('password')}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${
                            authMode === 'password' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'text-slate-400'
                          }`}
                        >
                           Email & Password
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <label className="text-slate-300 font-semibold">Account Email</label>
                          <input
                            type="email"
                            value={authEmail}
                            onChange={e => setAuthEmail(e.target.value)}
                            placeholder="doctor@example.com"
                            className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                          />
                        </div>
                        {authMode === 'password' && (
                          <div className="space-y-1">
                            <label className="text-slate-300 font-semibold">Password</label>
                            <input
                              type="password"
                              value={authPassword}
                              onChange={e => setAuthPassword(e.target.value)}
                              placeholder="------------"
                              className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                            />
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {authMode === 'magic' ? (
                          <button
                            onClick={handleSendMagicLink}
                            disabled={!syncState.isConfigured}
                            className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-xs apple-press shadow-md shadow-sky-500/20"
                          >
                            Send Magic Link
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={handlePasswordSignIn}
                              disabled={!syncState.isConfigured}
                              className="flex-1 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-bold text-xs apple-press"
                            >
                              Sign In
                            </button>
                            <button
                              onClick={handlePasswordSignUp}
                              disabled={!syncState.isConfigured}
                              className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-bold text-xs apple-press"
                            >
                              Create Account
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-xs">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/10">
                        <div>
                          <div className="text-[11px] text-slate-400">Signed In As</div>
                          <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                            {syncState.user.email}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleManualSyncNow}
                            className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs apple-press flex items-center gap-1.5"
                          >
                            <span></span> Sync Now
                          </button>
                          <button
                            onClick={handleSignOutUser}
                            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-bold text-xs apple-press"
                          >
                            Sign Out
                          </button>
                        </div>
                      </div>

                      {/* Device Name */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/10">
                        <div>
                          <span className="font-semibold text-slate-300">This Device Name</span>
                          <p className="text-[11px] text-slate-400">Tagged on cloud syncs to distinguish MacBook Air vs Android</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={customDeviceName}
                            onChange={e => setCustomDeviceName(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1 text-white text-xs"
                          />
                          <button
                            onClick={handleSaveDeviceName}
                            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[11px]"
                          >
                            Update
                          </button>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center gap-2 pt-1">
                        <span>Status: <strong className="text-slate-200">{syncState.statusMessage}</strong></span>
                        {syncState.lastSyncedAt && (
                          <span>- Last Synced: <strong className="text-slate-200">{new Date(syncState.lastSyncedAt).toLocaleTimeString()}</strong></span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sub-Card 3: Sync Conflicts Drawer */}
                {syncConflictsState.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-amber-300 flex items-center gap-2">
                        <span></span> Unresolved Sync Conflicts ({syncConflictsState.length})
                      </h3>
                      <span className="text-[10px] text-amber-400">Losing versions preserved safely</span>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto text-xs">
                      {syncConflictsState.map(conf => (
                        <div key={conf.id} className="p-2.5 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-white">{conf.title}</div>
                            <div className="text-[10px] text-slate-400">{conf.collection} - {new Date(conf.timestamp).toLocaleTimeString()}</div>
                          </div>
                          <button
                            onClick={() => handleRestoreConflict(conf.id)}
                            className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] shrink-0"
                          >
                            Restore This Version
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-Card 4: Rolling Cloud Snapshots */}
                {syncState.snapshots && syncState.snapshots.length > 0 && (
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3 text-xs">
                    <h3 className="text-xs font-bold text-white flex items-center gap-2">
                      <span></span> Rolling Cloud Snapshots (Last 3 Auto-Saved)
                    </h3>
                    <div className="space-y-2">
                      {syncState.snapshots.map((snap, idx) => (
                        <div key={snap.id} className="p-2.5 rounded-xl bg-black/30 border border-white/10 flex items-center justify-between gap-3">
                          <div>
                            <div className="font-bold text-white">Snapshot {idx + 1} ({snap.device_name || 'Device'})</div>
                            <div className="text-[10px] text-slate-400">{new Date(snap.created_at).toLocaleString()}</div>
                          </div>
                          <button
                            onClick={() => handleRollbackSnapshot(snap.id)}
                            className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 font-bold text-[11px]"
                          >
                            Rollback
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-Card 5: Danger Zone */}
                {syncState.user && (
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3 text-xs">
                    <h3 className="text-xs font-bold text-rose-300 flex items-center gap-2">
                      <span></span> Danger Zone - Delete Cloud Data
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Permanently wipe all cloud database records and snapshots in Supabase. Your local device progress will remain completely untouched.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2 items-center">
                      <input
                        type="text"
                        value={deleteCloudConfirm}
                        onChange={e => setDeleteCloudConfirm(e.target.value)}
                        placeholder="Type DELETE CLOUD DATA"
                        className="w-full sm:flex-1 bg-black/40 border border-rose-500/30 rounded-xl p-2 text-white font-mono"
                      />
                      <button
                        onClick={handleDeleteCloudData}
                        disabled={deleteCloudConfirm !== 'DELETE CLOUD DATA'}
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 disabled:opacity-40 text-white font-bold"
                      >
                        Delete Cloud Data
                      </button>
                    </div>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-slate-400 flex items-start gap-2.5">
                  <span className="text-base"></span>
                  <p>
                    <strong className="text-slate-300">Privacy Notice:</strong> Your study progress is stored in your own private Supabase project, protected by your login. Only you can read it. Export a JSON backup any time.
                  </p>
                </div>
              </div>

              {/* Profile & Exam Parameters (Fix 5: No Invented Defaults) */}
              <div className="glass-card rounded-3xl p-6 space-y-4 stagger-2">
                <h2 className="text-base font-extrabold text-white">Profile & Exam Parameters</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Exam Date (No Default)</label>
                    <input
                      type="date"
                      value={userSettings.examDate}
                      onChange={e => setUserSettings(prev => ({ ...prev, examDate: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                    <span className="text-[10px] text-slate-400">Leave blank until official 2027 bulletin announces date</span>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Internship Completion Date (No Default)</label>
                    <input
                      type="date"
                      value={userSettings.internshipDate || ''}
                      onChange={e => setUserSettings(prev => ({ ...prev, internshipDate: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Reservation Category (No Default)</label>
                    <input
                      type="text"
                      value={userSettings.reservationCategory || ''}
                      placeholder="e.g. UR, EWS, OBC-NCL, SC, ST, PwBD"
                      onChange={e => setUserSettings(prev => ({ ...prev, reservationCategory: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Target Branch (No Default)</label>
                    <input
                      type="text"
                      value={userSettings.targetBranch || ''}
                      placeholder="e.g. Oral and Maxillofacial Surgery (OMFS)"
                      onChange={e => setUserSettings(prev => ({ ...prev, targetBranch: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Daily Study Hours (No Default)</label>
                    <input
                      type="number"
                      min="1"
                      max="16"
                      value={userSettings.dailyHours === '' ? '' : userSettings.dailyHours}
                      placeholder="e.g. 8"
                      onChange={e => setUserSettings(prev => ({ ...prev, dailyHours: e.target.value === '' ? '' : parseInt(e.target.value, 10) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Realtime Cloud Sync</label>
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic(8);
                        playAppleClick();
                        if (window.SyncEngine && window.SyncEngine.setRealtimeEnabled) {
                          window.SyncEngine.setRealtimeEnabled(!syncState.realtimeEnabled);
                        }
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-left text-white font-bold"
                    >
                      {syncState.realtimeEnabled !== false ? 'Realtime Subscription: ON' : 'Realtime Subscription: OFF'}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Target Score</label>
                    <input
                      type="number"
                      value={userSettings.targetScore}
                      onChange={e => setUserSettings(prev => ({ ...prev, targetScore: parseInt(e.target.value || '790', 10) }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Coaching / Lecture Source</label>
                    <input
                      type="text"
                      value={userSettings.coachingName}
                      onChange={e => setUserSettings(prev => ({ ...prev, coachingName: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Study Spine Book</label>
                    <input
                      type="text"
                      value={userSettings.studySpine}
                      onChange={e => setUserSettings(prev => ({ ...prev, studySpine: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">State Domicile / Quota</label>
                    <input
                      type="text"
                      value={userSettings.stateName}
                      placeholder="e.g. Maharashtra, Karnataka, Delhi"
                      onChange={e => setUserSettings(prev => ({ ...prev, stateName: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">State Counselling Portal URL</label>
                    <input
                      type="url"
                      value={userSettings.statePortalUrl}
                      placeholder="https://..."
                      onChange={e => setUserSettings(prev => ({ ...prev, statePortalUrl: e.target.value }))}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>

                {userSettings.dismissedWarning && (
                  <button
                    onClick={() => setUserSettings(prev => ({ ...prev, dismissedWarning: false }))}
                    className="text-xs text-amber-400 underline pt-1 block"
                  >
                    Re-display Provisional Eligibility Warning on Today
                  </button>
                )}
              </div>

              {/* Offline Backups & JSON Transfer */}
              <div className="glass-card rounded-3xl p-6 space-y-4 stagger-3">
                <h2 className="text-base font-extrabold text-white">Manual Backups & JSON Escape Hatch</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <button
                    onClick={handleExportJSON}
                    className="py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold apple-press flex items-center justify-center gap-2"
                  >
                    <span></span> Export JSON
                  </button>
                  <label className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold apple-press flex items-center justify-center gap-2 cursor-pointer">
                    <span></span> Import JSON
                    <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
                  </label>
                  <button
                    onClick={handleCopyBackupCode}
                    className="py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold apple-press flex items-center justify-center gap-2"
                  >
                    <span></span> Copy Code
                  </button>
                </div>
              </div>

              {/* Diagnostics & Shipped Packs */}
              <div className="glass-card rounded-3xl p-6 space-y-4 stagger-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                  <div>
                    <h2 className="text-base font-extrabold text-white">System Diagnostics & Packs</h2>
                    <p className="text-xs text-slate-400">Run Section 3A sync self-tests & verify pack integrity</p>
                  </div>
                  <button
                    onClick={handleRunSyncDiagnostics}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-bold text-xs apple-press"
                  >
                     Run Section 3A Sync Diagnostics
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-black/30 border border-white/10">
                    <span className="text-slate-400 text-[10px]">Exam Facts Pack</span>
                    <div className="font-bold text-white">v{contentPack.version || '2026-11-15.1'}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-black/30 border border-white/10">
                    <span className="text-slate-400 text-[10px]">Real Medical Image Vault</span>
                    <div className="font-bold text-white">v2026-11-15.1 (Zero AI Images)</div>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </main>

      {/* ========================================================================= */}
      {/* 3. MOBILE BOTTOM TAB BAR (iOS Translucent Material) */}
      {/* ========================================================================= */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 glass-tab-bar px-2 py-1.5 flex justify-around items-center safe-bottom">
        {[
          { id: 'dashboard', label: 'Today', icon: '' },
          { id: 'plan', label: 'Plan', icon: '' },
          { id: 'curriculum', label: 'Subjects', icon: '' },
          { id: 'cbt_mock', label: 'Mocks', icon: '' },
          { id: 'more_menu', label: 'More', icon: '...' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              triggerHaptic(14);
              playAppleClick();
              if (tab.id === 'more_menu') {
                setShowMoreSheet(true);
              } else {
                setCurrentView(tab.id);
              }
            }}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-2xl apple-press transition-all ${
              currentView === tab.id ? 'text-sky-400 font-bold' : 'text-slate-400'
            }`}
          >
            <span className="text-lg">{tab.icon}</span>
            <span className="text-[10px] mt-0.5">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ========================================================================= */}
      {/* 4. MOBILE MORE MODULES SHEET (Spring Animation) */}
      {/* ========================================================================= */}
      {showMoreSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowMoreSheet(false)}>
          <div className="w-full max-w-lg glass-card rounded-t-3xl p-6 space-y-4 animate-sheet-up" onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto -mt-2"></div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-base text-white">More Workstation Modules</h3>
              <button onClick={() => setShowMoreSheet(false)} className="p-1 px-3 rounded-full bg-white/10 text-slate-400 text-xs">Done</button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {[
                { id: 'daily_quiz', label: 'Daily Quiz', icon: '' },
                { id: 'colleges', label: 'Colleges & Shortlist', icon: '' },
                { id: 'after_result', label: 'After the Result', icon: '' },
                { id: 'error_log', label: 'Mistake Log', icon: '' },
                { id: 'volatile_vault', label: 'Volatile Sheet', icon: '' },
                { id: 'ibq_spotter', label: 'Real Image Atlas', icon: '' },
                { id: 'omfs_deep_dive', label: 'OMFS Deep Dive', icon: '' },
                { id: 'hidden_neglected', label: '16 Hidden Rules', icon: '' },
                { id: 'watchlists', label: 'Master Checklists', icon: '' },
                { id: 'update_centre', label: 'Update Centre', icon: '' },
                { id: 'settings', label: 'Settings & Sync', icon: '' }
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    triggerHaptic(10);
                    playAppleClick();
                    setCurrentView(item.id);
                    setShowMoreSheet(false);
                  }}
                  className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 text-left apple-press"
                >
                  <span className="text-xl">{item.icon}</span>
                  <h4 className="text-xs font-bold text-white mt-1">{item.label}</h4>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SPOTLIGHT COMMAND PALETTE (CMD+K) */}
      {/* ========================================================================= */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-md animate-fade-in" onClick={() => setShowCommandPalette(false)}>
          <div className="w-full max-w-xl glass-card rounded-2xl border border-white/20 shadow-2xl overflow-hidden animate-sheet-up" onClick={e => e.stopPropagation()}>
            <div className="p-3 border-b border-white/10 flex items-center gap-3">
              <span className="text-slate-400"></span>
              <input
                type="text"
                autoFocus
                value={cmdQuery}
                onChange={e => setCmdQuery(e.target.value)}
                placeholder="Search subjects, Malamed LA doses, OMFS cut-offs..."
                className="w-full bg-transparent text-sm text-white focus:outline-none placeholder-slate-500"
              />
              <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400 font-mono">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2 space-y-1 text-xs">
              {[
                { title: 'Today Command Center', id: 'dashboard', icon: '' },
                { title: 'Daily Mixed Quiz (10 Qs)', id: 'daily_quiz', icon: '' },
                { title: '23-Week Study Plan', id: 'plan', icon: '' },
                { title: '17 Subjects Tracker', id: 'curriculum', icon: '' },
                { title: 'CBT National Mock Simulator (Part A Lock)', id: 'cbt_mock', icon: '' },
                { title: 'Colleges & Priority Shortlist', id: 'colleges', icon: '' },
                { title: 'After the Result Hub', id: 'after_result', icon: '' },
                { title: 'Mistake Notebook (+2, +7, +21 Days)', id: 'error_log', icon: '' },
                { title: 'Volatile Formulas Sheet', id: 'volatile_vault', icon: '' },
                { title: 'Real Medical Image Atlas', id: 'ibq_spotter', icon: '' },
                { title: 'OMFS Deep Dive & Ranks', id: 'omfs_deep_dive', icon: '' },
                { title: 'Settings & Supabase Real Cloud Sync', id: 'settings', icon: '' }
              ]
                .filter(i => !cmdQuery || i.title.toLowerCase().includes(cmdQuery.toLowerCase()))
                .map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      triggerHaptic(8);
                      playAppleClick();
                      setCurrentView(item.id);
                      setShowCommandPalette(false);
                      setCmdQuery('');
                    }}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-sky-500/20 text-left apple-press"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="font-medium text-white">{item.title}</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. ADD MISTAKE MODAL */}
      {/* ========================================================================= */}
      {showAddErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in" onClick={() => setShowAddErrorModal(false)}>
          <div className="max-w-lg w-full glass-card rounded-3xl p-6 space-y-4 border border-white/20 animate-sheet-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-base text-white">Log Mistake in Notebook</h3>
              <button onClick={() => setShowAddErrorModal(false)} className="text-xs px-2.5 py-1 rounded-full bg-white/10 text-slate-400">Cancel</button>
            </div>
            <form onSubmit={handleSaveError} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Subject</label>
                <select
                  value={errSubject}
                  onChange={e => setErrSubject(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                >
                  {((contentPack.examPattern && contentPack.examPattern.subjectDistribution) || contentPack.subjectDistribution || []).map(s => (
                    <option key={s.subject} value={s.subject} className="bg-slate-900">{s.subject}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Topic</label>
                <input
                  type="text"
                  required
                  value={errTopic}
                  onChange={e => setErrTopic(e.target.value)}
                  placeholder="e.g. Lidocaine with adrenaline cardiac ceiling"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Reason Category</label>
                <select
                  value={errReason}
                  onChange={e => setErrReason(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                >
                  <option value="Knowledge Gap" className="bg-slate-900">Knowledge Gap</option>
                  <option value="Silly Mistake" className="bg-slate-900">Silly Mistake</option>
                  <option value="Time Pressure" className="bg-slate-900">Time Pressure</option>
                  <option value="Guessed" className="bg-slate-900">Guessed</option>
                  <option value="Image Misread" className="bg-slate-900">Image Misread</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">What Went Wrong</label>
                <textarea
                  rows="2"
                  value={errWhatWentWrong}
                  onChange={e => setErrWhatWentWrong(e.target.value)}
                  placeholder="e.g. Confused healthy vs cardiac limit"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Correct Fact / Concept</label>
                <textarea
                  rows="2"
                  required
                  value={errCorrectFact}
                  onChange={e => setErrCorrectFact(e.target.value)}
                  placeholder="e.g. Cardiac limit is 0.04 mg (2 cartridges of 1:100k)"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold">Textbook Reference</label>
                <input
                  type="text"
                  value={errReference}
                  onChange={e => setErrReference(e.target.value)}
                  placeholder="e.g. Malamed LA Handbook, 7th ed, p. 74"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-white"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs apple-press shadow-md shadow-sky-500/20"
              >
                Save Mistake to Notebook
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. SECTION 3A SYNC DIAGNOSTICS TEST RUNNER MODAL */}
      {/* ========================================================================= */}
      {showTestModal && syncTestReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in" onClick={() => setShowTestModal(false)}>
          <div className="max-w-xl w-full glass-card rounded-3xl p-6 space-y-4 border border-white/20 animate-sheet-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl"></span>
                <h3 className="text-base font-bold text-white">Section 3A Cloud Sync Test Suite</h3>
              </div>
              <button onClick={() => setShowTestModal(false)} className="p-1 px-2.5 rounded-full bg-white/10 text-slate-400 text-xs">Close</button>
            </div>
            <p className="text-xs text-slate-300">
              Verifies offline storage roundtrip, tombstone deletes, and field-level merge algorithm across all 8 required scenarios.
            </p>
            <div className="space-y-2 max-h-80 overflow-y-auto text-xs">
              {syncTestReport.map((t, idx) => (
                <div key={idx} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 flex items-start gap-2.5">
                  <span className="text-sm shrink-0">{t.passed ? '' : ''}</span>
                  <div>
                    <span className={`font-semibold ${t.passed ? 'text-emerald-300' : 'text-rose-400'}`}>{t.test}</span>
                    {t.error && <p className="text-[10px] text-rose-300 font-mono mt-0.5">{t.error}</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2 flex items-center justify-between text-xs">
              <span className="text-emerald-400 font-bold">
                {syncTestReport.filter(t => t.passed).length} / {syncTestReport.length} Tests Passed
              </span>
              <button onClick={() => setShowTestModal(false)} className="py-2 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-xs">Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. IMAGE ZOOM LIGHTBOX */}
      {/* ========================================================================= */}
      {activeZoomImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-fade-in" onClick={() => setActiveZoomImage(null)}>
          <div className="max-w-3xl w-full glass-card rounded-3xl p-6 space-y-4 border border-white/20 animate-sheet-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">{activeZoomImage.title}</h3>
                <span className="text-[11px] text-emerald-400 font-semibold">Diagnosis: {activeZoomImage.diagnosis}</span>
              </div>
              <button onClick={() => setActiveZoomImage(null)} className="p-1 px-3 rounded-full bg-white/10 text-slate-400 text-xs">Close</button>
            </div>
            <div className="w-full max-h-96 bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-white/10">
              <img
                src={activeZoomImage.imageUrl || activeZoomImage.imageFile || activeZoomImage.placeholderSourceUrl}
                alt={activeZoomImage.diagnosis}
                style={{ transform: `scale(${zoomLevel})` }}
                className="max-h-96 object-contain transition-transform duration-200"
              />
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <button onClick={() => setZoomLevel(prev => Math.max(1, prev - 0.25))} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold">- Zoom</button>
                <span className="font-mono text-slate-400">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={() => setZoomLevel(prev => Math.min(3, prev + 0.25))} className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold">+ Zoom</button>
              </div>
              <a href={activeZoomImage.sourcePageUrl} target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 underline">
                View Source &rarr;
              </a>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
