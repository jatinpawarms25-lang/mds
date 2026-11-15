// ============================================================================
// Open-Source GitHub Repository Integrations (from NEET_MDS_App_GitHub_Repos.pdf)
// 1. medmcqa/medmcqa (https://github.com/medmcqa/medmcqa)
// 2. Tuminha/llm-evaluation-for-dentistry (https://github.com/Tuminha/llm-evaluation-for-dentistry)
// 3. rrjanbiah/mockguru (https://github.com/rrjanbiah/mockguru)
// 4. kingxjayant/smriti (https://github.com/kingxjayant/smriti)
// 5. SvalTech/studylocus (https://github.com/SvalTech/studylocus)
// 6. ajaynxt/body (https://github.com/ajaynxt/body)
// 7. manjunath5496/Study-Material (https://github.com/manjunath5496/Study-Material)
// ============================================================================

export interface MedMcqaItem {
  id: string;
  question: string;
  opa: string;
  opb: string;
  opc: string;
  opd: string;
  cop: 1 | 2 | 3 | 4; // 1-based index per MedMCQA spec
  exp: string;
  subject_name: string;
  topic_name: string;
}

export const MEDMCQA_DENTAL_AND_PART_A_SEED: MedMcqaItem[] = [
  {
    id: 'medmcqa_d1',
    question: 'Which nerve passes through the foramen ovale along with the accessory meningeal artery and lesser petrosal nerve?',
    opa: 'Maxillary nerve (V2)',
    opb: 'Mandibular nerve (V3)',
    opc: 'Ophthalmic nerve (V1)',
    opd: 'Facial nerve (VII)',
    cop: 2,
    exp: 'Mnemonic MALE: Mandibular nerve (V3), Accessory meningeal artery, Lesser petrosal nerve, and Emissary vein pass through Foramen Ovale.',
    subject_name: 'Dental',
    topic_name: 'Skull Base Foramina (Part A Anatomy)'
  },
  {
    id: 'medmcqa_d2',
    question: 'In high-copper dental amalgam (>6% Cu), which weakest and most corrosion-prone phase is eliminated?',
    opa: 'Gamma (Ag3Sn)',
    opb: 'Gamma-1 (Ag2Hg3)',
    opc: 'Gamma-2 (Sn7-8Hg)',
    opd: 'Eta-prime (Cu6Sn5)',
    cop: 3,
    exp: 'Copper reacts with tin to form Cu6Sn5 (eta-prime), eliminating the weak, corrosion-prone Gamma-2 (Sn7-8Hg) phase.',
    subject_name: 'Dental',
    topic_name: 'Dental Materials - Amalgam'
  },
  {
    id: 'medmcqa_d3',
    question: 'Which local anesthetic contains both an ester linkage and an amide linkage with a thiophene ring, allowing biotransformation in both plasma and liver?',
    opa: 'Bupivacaine',
    opb: 'Articaine',
    opc: 'Prilocaine',
    opd: 'Mepivacaine',
    cop: 2,
    exp: 'Articaine is the only amide LA containing a thiophene ring and an additional ester group hydrolyzed by plasma carboxyesterase (t1/2 ~20 min).',
    subject_name: 'Pharmacology',
    topic_name: 'Local Anesthetics'
  },
  {
    id: 'medmcqa_d4',
    question: 'A patient presents with multiple punched-out radiolucencies of the skull vault without sclerotic borders and Bence-Jones proteinuria. Diagnosis is:',
    opa: 'Paget disease of bone',
    opb: 'Multiple Myeloma',
    opc: 'Fibrous dysplasia',
    opd: 'Hyperparathyroidism',
    cop: 2,
    exp: 'Multiple myeloma produces classic non-corticated punched-out osteolytic skull lesions and monoclonal light-chain (Bence-Jones) proteinuria.',
    subject_name: 'Pathology',
    topic_name: 'Bone Tumors'
  }
];

export interface ClinicalDentalQaRubricItem {
  id: string;
  domain: 'Periodontics' | 'Implants' | 'Oral-Systemic Medicine' | 'Pharmacology' | 'OMFS';
  difficulty: 'Moderate' | 'Hard';
  scenario: string;
  options: string[];
  correctIdx: number;
  mustInclude: string[];
  mustAvoid: string[];
  guidelineSource: string;
}

export const TUMINHA_CLINICAL_DENTAL_QA: ClinicalDentalQaRubricItem[] = [
  {
    id: 'tuminha_perio_01',
    domain: 'Periodontics',
    difficulty: 'Moderate',
    scenario: 'A 44-year-old patient has interdental CAL of 6 mm at the worst site, radiographic bone loss extending to the apical third of the root, 5 teeth lost due to periodontitis, and HbA1c of 8.2%. What is the 2017 World Workshop Stage and Grade?',
    options: [
      'Stage II, Grade B',
      'Stage III, Grade B',
      'Stage IV, Grade C',
      'Stage III, Grade A'
    ],
    correctIdx: 2,
    mustInclude: [
      'Stage IV (>= 5 teeth lost due to periodontitis + CAL >= 5 mm)',
      'Grade C (HbA1c >= 7.0% in patient with diabetes)',
      'EFP S3 Step 1-4 periodontal therapy + glycemic control coordination'
    ],
    mustAvoid: [
      'Staging as Stage III despite >= 5 periodontal tooth losses',
      'Prescribing systemic antibiotics routinely without subgingival instrumentation'
    ],
    guidelineSource: '2017 World Workshop Classification (Tonetti et al. 2018) & EFP S3 Guideline'
  },
  {
    id: 'tuminha_pharm_02',
    domain: 'Oral-Systemic Medicine',
    difficulty: 'Hard',
    scenario: 'A 68-year-old patient taking Apixaban (Eliquis) 5 mg BD for atrial fibrillation requires simple extraction of mobile #36 and #37. What is the evidence-based perioperative anticoagulation protocol?',
    options: [
      'Stop Apixaban 5 days prior and bridge with low-molecular-weight heparin',
      'Continue Apixaban without interruption (or time extraction before morning dose per local protocol) and use local hemostatic measures (oxidized cellulose/tranexamic acid + sutures)',
      'Switch to Aspirin 75 mg 3 days prior to extraction',
      'Administer fresh frozen plasma immediately before extraction'
    ],
    correctIdx: 1,
    mustInclude: [
      'Do not interrupt DOAC for routine 1-3 tooth extractions (stroke risk outweighs local bleeding)',
      'Local hemostasis: atraumatic extraction, absorbable hemostatic pack, sutures, 4.8% tranexamic acid mouthwash'
    ],
    mustAvoid: [
      'Stopping DOAC for several days causing thromboembolic stroke risk',
      'Heparin bridging for routine dental extraction'
    ],
    guidelineSource: 'SDCEP / AHA / ESC Anticoagulant Dental Management Guidelines'
  },
  {
    id: 'tuminha_omfs_03',
    domain: 'OMFS',
    difficulty: 'Hard',
    scenario: 'A breast cancer patient on monthly IV Zoledronic acid presents with exposed necrotic mandibular bone in the mylohyoid ridge region persisting for 10 weeks with no history of head-and-neck radiotherapy. According to AAOMS 2022, this confirms:',
    options: [
      'Osteoradionecrosis (ORN)',
      'Medication-Related Osteonecrosis of the Jaw (MRONJ)',
      'Focal sclerosing osteomyelitis',
      'Primary mandibular osteosarcoma'
    ],
    correctIdx: 1,
    mustInclude: [
      '3 AAOMS criteria: current/prior antiresorptive/antiangiogenic therapy, exposed bone or fistula > 8 weeks, nocraniofacial radiation or metastasis',
      'Conservative stage-specific debridement, chlorhexidine rinses, and oncology coordination'
    ],
    mustAvoid: [
      'Diagnosing ORN without radiation history',
      'Aggressive wide resection in early Stage 1 MRONJ'
    ],
    guidelineSource: 'AAOMS Position Paper on MRONJ (2022 Update)'
  }
];

// rrjanbiah/mockguru parser: parses Markdown or CSV bulk question sets into playable test items
export function parseMockguruQuestions(rawText: string): MedMcqaItem[] {
  const trimmed = rawText.trim();
  if (!trimmed) return [];

  // JSON array fallback (MedMCQA format)
  if (trimmed.startsWith('[')) {
    const arr = JSON.parse(trimmed) as Array<Partial<MedMcqaItem>>;
    return arr
      .filter((x) => x.question && x.opa && x.opb)
      .map((x, idx) => ({
        id: x.id || `mg_json_${idx + 1}`,
        question: String(x.question),
        opa: String(x.opa || ''),
        opb: String(x.opb || ''),
        opc: String(x.opc || ''),
        opd: String(x.opd || ''),
        cop: ((Number(x.cop) >= 1 && Number(x.cop) <= 4 ? Number(x.cop) : 1) as 1 | 2 | 3 | 4),
        exp: String(x.exp || ''),
        subject_name: String(x.subject_name || 'Dental'),
        topic_name: String(x.topic_name || 'Imported Mockguru')
      }));
  }

  // Markdown blocks separated by blank lines:
  // Q: Question text
  // A) opt1
  // B) opt2
  // C) opt3
  // D) opt4
  // ANS: B
  // EXP: Explanation
  const blocks = trimmed.split(/\n\s*\n/);
  const out: MedMcqaItem[] = [];
  blocks.forEach((b, idx) => {
    const lines = b.split('\n').map((l) => l.trim()).filter(Boolean);
    const qLine = lines.find((l) => /^Q[:.)]\s*/i.test(l)) || lines[0];
    const aLine = lines.find((l) => /^A[):.]\s*/i.test(l));
    const bLine = lines.find((l) => /^B[):.]\s*/i.test(l));
    const cLine = lines.find((l) => /^C[):.]\s*/i.test(l));
    const dLine = lines.find((l) => /^D[):.]\s*/i.test(l));
    const ansLine = lines.find((l) => /^ANS(WER)?[:\s]/i.test(l));
    const expLine = lines.find((l) => /^EXP(LANATION)?[:\s]/i.test(l));

    if (qLine && aLine && bLine) {
      const ansChar = (ansLine || 'A').replace(/^ANS(WER)?[:\s]*/i, '').trim().toUpperCase()[0];
      const cop: 1 | 2 | 3 | 4 = ansChar === 'B' ? 2 : ansChar === 'C' ? 3 : ansChar === 'D' ? 4 : 1;
      out.push({
        id: `mg_md_${idx + 1}`,
        question: qLine.replace(/^Q[:.)]\s*/i, ''),
        opa: aLine.replace(/^A[):.]\s*/i, ''),
        opb: bLine.replace(/^B[):.]\s*/i, ''),
        opc: (cLine || '').replace(/^C[):.]\s*/i, ''),
        opd: (dLine || '').replace(/^D[):.]\s*/i, ''),
        cop,
        exp: (expLine || '').replace(/^EXP(LANATION)?[:\s]*/i, ''),
        subject_name: 'Dental',
        topic_name: 'Mockguru Markdown Import'
      });
    }
  });
  return out;
}

// ajaynxt/body: Interactive 3D Head & Neck Anatomy Dissection & Mnemonics
export interface AnatomyStructureNode {
  id: string;
  name: string;
  region: string;
  x: number; // % coordinate on interactive SVG skull base / mandible map
  y: number;
  foramenOrSpace: string;
  transmittedStructures: string[];
  mnemonic: string;
  clinicalPearl: string;
}

export const AJAYNXT_HEAD_NECK_3D_NODES: AnatomyStructureNode[] = [
  {
    id: 'foramen_ovale',
    name: 'Foramen Ovale (Greater Wing of Sphenoid)',
    region: 'Middle Cranial Fossa',
    x: 44,
    y: 48,
    foramenOrSpace: 'Posterolateral to Foramen Rotundum',
    transmittedStructures: [
      'Mandibular nerve (CN V3)',
      'Accessory meningeal artery',
      'Lesser petrosal nerve (CN IX -> Otic ganglion)',
      'Emissary veins (cavernous sinus to pterygoid plexus)'
    ],
    mnemonic: 'M-A-L-E (Mandibular V3, Accessory meningeal, Lesser petrosal, Emissary vein)',
    clinicalPearl: '2025/2026 Repeat: Otic ganglion lies immediately below foramen ovale medial to CN V3.'
  },
  {
    id: 'foramen_spinosum',
    name: 'Foramen Spinosum',
    region: 'Middle Cranial Fossa',
    x: 56,
    y: 55,
    foramenOrSpace: 'Posterolateral to Foramen Ovale',
    transmittedStructures: [
      'Middle meningeal artery & vein',
      'Meningeal branch of mandibular nerve (Nervus spinosus)'
    ],
    mnemonic: 'SPIN-osum = S-P-I-N (Spinosus nerve + Middle meningeal artery)',
    clinicalPearl: 'Rupture at pterion causes epidural hematoma with lucid interval.'
  },
  {
    id: 'sup_orbital_fissure',
    name: 'Superior Orbital Fissure',
    region: 'Apex of Orbit',
    x: 34,
    y: 28,
    foramenOrSpace: 'Between Lesser & Greater Wings of Sphenoid',
    transmittedStructures: [
      'CN III (Oculomotor), CN IV (Trochlear), CN VI (Abducens)',
      'CN V1 branches: Lacrimal, Frontal, Nasociliary nerves',
      'Superior ophthalmic vein'
    ],
    mnemonic: 'Lazy French Tarts Sit Naked In Anticipation (Lacrimal, Frontal, Trochlear, Superior/Inferior III, Nasociliary, Abducens)',
    clinicalPearl: 'Involved in Le Fort III fractures causing Superior Orbital Fissure Syndrome (ophthalmoplegia + forehead paresthesia).'
  },
  {
    id: 'pterygomandibular_space',
    name: 'Pterygomandibular Space (IANB Target)',
    region: 'Infratemporal / Deep Facial Space',
    x: 68,
    y: 72,
    foramenOrSpace: 'Between Medial Pterygoid & Medial Ramus of Mandible',
    transmittedStructures: [
      'Inferior alveolar nerve & vessels',
      'Lingual nerve (anterior & medial to IAN)',
      'Nerve to mylohyoid',
      'Sphenomandibular ligament'
    ],
    mnemonic: 'L-I-M (Lingual anterior, Inferior alveolar posterior, Mylohyoid inferior)',
    clinicalPearl: 'Too posterior needle placement enters parotid capsule and paralyzes CN VII (transient Bell-like palsy).'
  }
];

// kingxjayant/smriti + manjunath5496/Study-Material high-yield deck packs
export interface SmritiConceptPack {
  id: string;
  repoSource: string;
  title: string;
  deck: string;
  cards: Array<{ front: string; back: string; tags: string[] }>;
}

export const SMRITI_AND_STUDY_MATERIAL_PACKS: SmritiConceptPack[] = [
  {
    id: 'pack_smriti_syndromes',
    repoSource: 'kingxjayant/smriti',
    title: 'High-Yield Dental Syndromes & Classifications',
    deck: 'Oral Pathology & Oral Microbiology',
    cards: [
      {
        front: 'Gorlin-Goltz Syndrome (Nevoid Basal Cell Carcinoma Syndrome) gene & triad?',
        back: 'PTCH1 tumor suppressor gene (Chr 9q22.3). Triad: Multiple OKCs of jaws + Basal cell carcinomas + Bifid ribs / Calcified falx cerebri.',
        tags: ['smriti', 'syndromes', 'high-yield']
      },
      {
        front: 'Gardner Syndrome oral & systemic manifestations?',
        back: 'APC gene mutation: Multiple osteomas of jaws, supernumerary/impacted teeth, odontomas + Familial Adenomatous Polyposis (100% malignant colorectal potential) + Epidermoid cysts.',
        tags: ['smriti', 'syndromes', 'high-yield']
      },
      {
        front: 'Papillon-Lefevre Syndrome defect & clinical presentation?',
        back: 'Cathepsin C gene mutation: Palmoplantar hyperkeratosis + Severe early-onset periodontitis affecting both primary and permanent dentition (floating teeth).',
        tags: ['smriti', 'syndromes', 'periodontology']
      }
    ]
  },
  {
    id: 'pack_manjunath_basic_sciences',
    repoSource: 'manjunath5496/Study-Material',
    title: 'Part A Basic Science Rate-Limiting Enzymes & Pharmacology Quick Notes',
    deck: 'General Human Physiology & Biochemistry',
    cards: [
      {
        front: 'Rate-limiting enzymes: Glycolysis, Gluconeogenesis, TCA, Cholesterol, Urea cycle?',
        back: 'Glycolysis: PFK-1 | Gluconeogenesis: Fructose-1,6-bisphosphatase | TCA: Isocitrate dehydrogenase | Cholesterol: HMG-CoA reductase | Urea Cycle: CPS-I.',
        tags: ['study-material', 'biochemistry', 'volatile']
      },
      {
        front: 'Pharyngeal Arch Arterial & Cranial Nerve Derivatives (Arches I, II, III, IV, VI)?',
        back: 'Arch I: CN V3 (Maxillary artery) | Arch II: CN VII (Stapedial/Hyoid) | Arch III: CN IX (Common/Internal Carotid) | Arch IV: CN X Superior laryngeal (Aortic arch/Right subclavian) | Arch VI: CN X Recurrent laryngeal (Pulmonary artery/Ductus arteriosus).',
        tags: ['study-material', 'anatomy', 'embryology']
      }
    ]
  }
];
