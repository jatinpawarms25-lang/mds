export interface SubjectTaxonomyEntry {
  id: string;
  part: 'A' | 'B';
  name: string;
  keywords: string[];
  abbreviations: string[];
}

export interface DetectedSubjectTag {
  id: string;
  name: string;
  distinctHits: number;
  totalHits: number;
  confidence: 'high' | 'medium';
}

export const CANONICAL_17_SUBJECTS: SubjectTaxonomyEntry[] = [
  {
    id: 'anat',
    part: 'A',
    name: 'General Anatomy incl. Embryology & Histology',
    keywords: ['foramen', 'cranial nerve', 'brachial plexus', 'pharyngeal arch', 'embryology', 'histology', 'parotid', 'submandibular', 'pterygopalatine', 'trigeminal', 'facial nerve', 'osteology'],
    abbreviations: ['CN', 'TMJ']
  },
  {
    id: 'physio',
    part: 'A',
    name: 'General Human Physiology & Biochemistry',
    keywords: ['action potential', 'glomerular', 'cardiac output', 'hemoglobin', 'krebs cycle', 'glycolysis', 'enzyme', 'hormone', 'insulin', 'parathyroid', 'calcitonin', 'coagulation', 'platelet'],
    abbreviations: ['GFR', 'ATP', 'ADH', 'PTH']
  },
  {
    id: 'daoh',
    part: 'A',
    name: 'Dental Anatomy, Embryology & Oral Histology',
    keywords: ['enamel', 'dentin', 'cementum', 'amelogenesis', 'dentinogenesis', 'odontoblast', 'ameloblast', 'striae of retzius', 'tomes', 'hertwig', 'universal numbering', 'fdi', 'cusp of carabelli'],
    abbreviations: ['DEJ', 'CEJ', 'FDI']
  },
  {
    id: 'pathmicro',
    part: 'A',
    name: 'General Pathology & Microbiology',
    keywords: ['necrosis', 'apoptosis', 'inflammation', 'granuloma', 'hypersensitivity', 'staphylococcus', 'streptococcus', 'candida', 'autoclave', 'sterilization', 'immunoglobulin', 'complement'],
    abbreviations: ['IgG', 'IgA', 'IgE', 'ELISA', 'PCR']
  },
  {
    id: 'pharma',
    part: 'A',
    name: 'General & Dental Pharmacology & Therapeutics',
    keywords: ['lidocaine', 'epinephrine', 'amoxicillin', 'metronidazole', 'ibuprofen', 'acetaminophen', 'pharmacokinetics', 'half-life', 'bioavailability', 'contraindication', 'dosage', 'agonist', 'antagonist'],
    abbreviations: ['NSAID', 'LA', 'MIC', 'CYP450']
  },
  {
    id: 'genmed',
    part: 'A',
    name: 'General Medicine',
    keywords: ['hypertension', 'diabetes mellitus', 'myocardial infarction', 'infective endocarditis', 'anemia', 'hepatitis', 'asthma', 'epilepsy', 'thyroid', 'jaundice', 'angina'],
    abbreviations: ['HbA1c', 'ECG', 'INR', 'BP']
  },
  {
    id: 'gensurg',
    part: 'A',
    name: 'General Surgery',
    keywords: ['shock', 'hemorrhage', 'wound healing', 'suture', 'tracheostomy', 'biopsy', 'hernia', 'burn', 'tetanus', 'asepsis', 'ulcer', 'abscess'],
    abbreviations: ['ATLS', 'GCS']
  },
  {
    id: 'dmat',
    part: 'B',
    name: 'Dental Materials',
    keywords: ['gypsum', 'alginate', 'elastomer', 'polyether', 'addition silicone', 'zinc oxide eugenol', 'glass ionomer', 'amalgam', 'composite', 'zirconia', 'setting time', 'water powder ratio', 'compressive strength'],
    abbreviations: ['GIC', 'ZOE', 'PMMA', 'W/P']
  },
  {
    id: 'oralpath',
    part: 'B',
    name: 'Oral Pathology & Oral Microbiology',
    keywords: ['ameloblastoma', 'odontogenic keratocyst', 'dentigerous cyst', 'radicular cyst', 'carcinoma', 'dysplasia', 'leukoplakia', 'lichen planus', 'pemphigus', 'pleomorphic adenoma', 'mucoepidermoid', 'ghost cells', 'rushton bodies'],
    abbreviations: ['OKC', 'OSCC', 'OSMF', 'CEOT', 'AOT']
  },
  {
    id: 'omr',
    part: 'B',
    name: 'Oral Medicine & Radiology',
    keywords: ['radiograph', 'orthopantomogram', 'cone beam', 'radiolucency', 'radiopacity', 'lamina dura', 'sunburst', 'ground glass', 'cotton wool', 'soap bubble', 'kVp', 'collimation', 'dosimetry'],
    abbreviations: ['OPG', 'CBCT', 'IOPA', 'SLOB']
  },
  {
    id: 'pedo',
    part: 'B',
    name: 'Pedodontics & Preventive Dentistry',
    keywords: ['primary tooth', 'space maintainer', 'stainless steel crown', 'pulpotomy', 'pulpectomy', 'apexification', 'frankl', 'eruption', 'nolla', 'band and loop', 'distal shoe', 'fluoride varnish'],
    abbreviations: ['SSC', 'ECC', 'SDF']
  },
  {
    id: 'ortho',
    part: 'B',
    name: 'Orthodontics & Dentofacial Orthopaedics',
    keywords: ['malocclusion', 'cephalometric', 'anchorage', 'overjet', 'overbite', 'crossbite', 'bracket', 'headgear', 'functional appliance', 'twin block', 'steiner', 'downs', 'cvmi', 'anb'],
    abbreviations: ['SNA', 'SNB', 'ANB', 'CVMI', 'FMA']
  },
  {
    id: 'perio',
    part: 'B',
    name: 'Periodontology',
    keywords: ['gingivitis', 'periodontitis', 'periodontal pocket', 'calculus', 'furcation', 'gracey curette', 'bone graft', 'guided tissue regeneration', 'junctional epithelium', 'probing depth', 'clinical attachment', 'gingivectomy', 'miller'],
    abbreviations: ['CAL', 'GTR', 'BOP', 'CPI', 'PDL']
  },
  {
    id: 'prostho',
    part: 'B',
    name: 'Prosthodontics & Crown & Bridge',
    keywords: ['complete denture', 'vertical dimension', 'centric relation', 'articulator', 'facebow', 'kennedy', 'major connector', 'clasp', 'pontic', 'abutment', 'border molding', 'post dam', 'implant'],
    abbreviations: ['RPD', 'CD', 'FPD', 'VDO', 'CR']
  },
  {
    id: 'cons',
    part: 'B',
    name: 'Conservative Dentistry & Endodontics',
    keywords: ['root canal', 'working length', 'gutta percha', 'sodium hypochlorite', 'calcium hydroxide', 'mta', 'pulpitis', 'periapical', 'carious', 'cavity preparation', 'bevel', 'etching', 'bonding'],
    abbreviations: ['RCT', 'MTA', 'NaOCl', 'EDTA']
  },
  {
    id: 'omfs',
    part: 'B',
    name: 'Oral & Maxillofacial Surgery (OMFS)',
    keywords: ['impaction', 'pederson', 'le fort', 'mandibular fracture', 'condyle', 'osteomyelitis', 'alveolar osteitis', 'fascial space', 'ludwig', 'trismus', 'elevator', 'forceps', 'orthognathic'],
    abbreviations: ['OMFS', 'ORIF', 'IMF', 'IMF']
  },
  {
    id: 'phd',
    part: 'B',
    name: 'Public Health Dentistry',
    keywords: ['epidemiology', 'prevalence', 'incidence', 'specificity', 'sensitivity', 'dmft', 'deft', 'community', 'fluoridation', 'biostatistics', 'chi square', 'cohort', 'case control'],
    abbreviations: ['DMFT', 'WHO', 'PHC', 'OHI-S']
  }
];

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function detectCanonicalSubjects(fullText: string): DetectedSubjectTag[] {
  if (!fullText.trim()) return [];
  const scored: DetectedSubjectTag[] = [];

  for (const subj of CANONICAL_17_SUBJECTS) {
    let distinctHits = 0;
    let totalHits = 0;

    for (const kw of subj.keywords) {
      const rx = new RegExp(`\\b${escapeRegex(kw)}\\b`, 'gi');
      const matches = fullText.match(rx);
      if (matches && matches.length > 0) {
        distinctHits += 1;
        totalHits += matches.length;
      }
    }

    for (const abbr of subj.abbreviations) {
      const rx = new RegExp(`\\b${escapeRegex(abbr)}\\b`, 'g');
      const matches = fullText.match(rx);
      if (matches && matches.length > 0) {
        distinctHits += 1;
        totalHits += matches.length;
      }
    }

    if (distinctHits >= 2) {
      scored.push({
        id: subj.id,
        name: subj.name,
        distinctHits,
        totalHits,
        confidence: distinctHits >= 4 ? 'high' : 'medium'
      });
    }
  }

  return scored
    .sort((a, b) => b.distinctHits - a.distinctHits || b.totalHits - a.totalHits)
    .slice(0, 3);
}
