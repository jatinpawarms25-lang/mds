export interface CollegeRow {
  id: string;
  name: string;
  state: string;
  closingRank: number;
  stipendMonthly: number;
  feeAnnual: number;
  bondYears: number;
  seats: number;
}

export const GOVT_COLLEGES_DATA: CollegeRow[] = [
  { id: 'c1', name: "King George's Medical University (KGMU), Lucknow", state: 'Uttar Pradesh', closingRank: 4, stipendMonthly: 109955, feeAnnual: 54666, bondYears: 2, seats: 5 },
  { id: 'c2', name: 'Institute of Medical Sciences (IMS), BHU, Varanasi', state: 'Uttar Pradesh (Central)', closingRank: 9, stipendMonthly: 95033, feeAnnual: 15000, bondYears: 0, seats: 4 },
  { id: 'c3', name: 'Govt Dental College, Rohtak (PGIDS)', state: 'Haryana', closingRank: 18, stipendMonthly: 90209, feeAnnual: 45000, bondYears: 1, seats: 6 },
  { id: 'c4', name: 'Lady Hardinge Medical College, New Delhi', state: 'Delhi (Central)', closingRank: 24, stipendMonthly: 56100, feeAnnual: 18000, bondYears: 0, seats: 3 },
  { id: 'c5', name: 'SCB Dental College, Cuttack', state: 'Odisha', closingRank: 39, stipendMonthly: 61732, feeAnnual: 30000, bondYears: 2, seats: 4 },
  { id: 'c6', name: 'Dr. Ziauddin Ahmad Dental College, AMU, Aligarh', state: 'Uttar Pradesh (Central)', closingRank: 51, stipendMonthly: 81000, feeAnnual: 25000, bondYears: 0, seats: 4 },
  { id: 'c7', name: 'Govt Dental College, Mumbai', state: 'Maharashtra', closingRank: 54, stipendMonthly: 49648, feeAnnual: 55000, bondYears: 1, seats: 5 },
  { id: 'c8', name: 'Govt Dental College, Jaipur', state: 'Rajasthan', closingRank: 58, stipendMonthly: 50000, feeAnnual: 35000, bondYears: 2, seats: 4 },
  { id: 'c9', name: 'Govt Dental College, Raipur', state: 'Chhattisgarh', closingRank: 75, stipendMonthly: 53550, feeAnnual: 28000, bondYears: 2, seats: 3 },
  { id: 'c10', name: 'Govt Dental College, Hyderabad', state: 'Telangana', closingRank: 77, stipendMonthly: 50686, feeAnnual: 32000, bondYears: 1, seats: 4 },
  { id: 'c11', name: 'Govt Dental College, Aurangabad', state: 'Maharashtra', closingRank: 78, stipendMonthly: 49648, feeAnnual: 55000, bondYears: 1, seats: 4 },
  { id: 'c12', name: 'Govt Dental College, Thiruvananthapuram', state: 'Kerala', closingRank: 80, stipendMonthly: 57876, feeAnnual: 40000, bondYears: 1, seats: 4 },
  { id: 'c13', name: 'Tamil Nadu Govt Dental College, Chennai', state: 'Tamil Nadu', closingRank: 93, stipendMonthly: 48000, feeAnnual: 35000, bondYears: 2, seats: 5 },
  { id: 'c14', name: 'Govt Dental College, Jamnagar', state: 'Gujarat', closingRank: 115, stipendMonthly: 65800, feeAnnual: 25000, bondYears: 1, seats: 3 },
  { id: 'c15', name: 'Goa Dental College, Bambolim', state: 'Goa', closingRank: 131, stipendMonthly: 50000, feeAnnual: 48000, bondYears: 1, seats: 3 },
  { id: 'c16', name: 'Govt Dental College, Kadapa (Last Listed Govt)', state: 'Andhra Pradesh', closingRank: 156, stipendMonthly: 44075, feeAnnual: 30000, bondYears: 1, seats: 3 },
  { id: 'c17', name: 'MAIDS New Delhi (2026 R1 OMFS)', state: 'Delhi', closingRank: 1, stipendMonthly: 115003, feeAnnual: 13000, bondYears: 0, seats: 2 }
];

export interface QuizQuestion {
  id: string;
  subject: string;
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export const DAILY_QUIZ_POOL: QuizQuestion[] = [
  { id: 'dq1', subject: 'Public Health Dentistry', question: 'The black band of the CPI (WHO) periodontal probe spans which range?', options: ['2.5-4.5 mm', '3.5-5.5 mm', '4.5-6.5 mm', '5.5-7.5 mm'], correct: 1, explanation: 'Volatile Sheet: The WHO CPI probe features a 0.5 mm spherical ball tip and a black band spanning 3.5 to 5.5 mm.' },
  { id: 'dq2', subject: 'Public Health Dentistry', question: 'In CPI scoring, Code 3 represents:', options: ['Bleeding on probing', 'Calculus present', 'Pocket depth of 4-5 mm', 'Pocket depth of 6 mm or more'], correct: 2, explanation: 'Volatile Sheet: Code 0 = healthy; 1 = bleeding; 2 = calculus; 3 = pocket 4-5 mm; 4 = pocket >= 6 mm.' },
  { id: 'dq3', subject: 'Public Health Dentistry', question: 'The DMFT index was introduced by:', options: ['Klein, Palmer & Knutson (1938)', 'Greene & Vermillion (1960)', 'Loe & Silness (1963)', 'Russell (1956)'], correct: 0, explanation: 'Volatile Sheet: Klein, Palmer & Knutson introduced DMFT in 1938 (max 32, or 28 excluding third molars).' },
  { id: 'dq4', subject: 'Public Health Dentistry', question: 'Dean Fluorosis Index is scored on which teeth?', options: ['All teeth present', 'The two most affected teeth', 'Six Ramfjord teeth', 'Single worst tooth'], correct: 1, explanation: 'Volatile Sheet: Dean Fluorosis Index (1934, revised 1942) scores the 2 most affected teeth across 6 categories.' },
  { id: 'dq5', subject: 'Public Health Dentistry', question: 'The Probably Toxic Dose (PTD) of elemental fluoride is:', options: ['1 mg/kg', '5 mg/kg', '16 mg/kg', '32 mg/kg'], correct: 1, explanation: 'Volatile Sheet: Whitford PTD is 5 mg F/kg. STD is 8-16 mg/kg and CLD is 32-64 mg/kg.' },
  { id: 'dq6', subject: 'General Human Physiology & Biochemistry', question: 'In competitive enzyme inhibition, how do Km and Vmax change?', options: ['Km decreases, Vmax unchanged', 'Km increases, Vmax unchanged', 'Km unchanged, Vmax decreases', 'Both increase'], correct: 1, explanation: 'Volatile Sheet: Competitive inhibition raises apparent Km while Vmax remains unchanged.' },
  { id: 'dq7', subject: 'General Human Physiology & Biochemistry', question: 'The rate-limiting enzyme of glycolysis is:', options: ['Hexokinase', 'Phosphofructokinase-1 (PFK-1)', 'Pyruvate kinase', 'Lactate dehydrogenase'], correct: 1, explanation: 'Volatile Sheet: PFK-1 is the committed rate-limiting enzyme of glycolysis.' },
  { id: 'dq8', subject: 'General Human Physiology & Biochemistry', question: 'Which clotting factors require Vitamin K for gamma-carboxylation?', options: ['I, V, VIII, XIII', 'II, VII, IX, X', 'II, III, V, VII', 'V, VIII, IX, XI'], correct: 1, explanation: 'Volatile Sheet: Factors II, VII, IX, and X depend on Vitamin K.' },
  { id: 'dq9', subject: 'Dental Materials', question: 'The gamma-2 phase of set dental amalgam is:', options: ['Ag3Sn', 'Ag2Hg3', 'Sn7-8Hg', 'Cu6Sn5'], correct: 2, explanation: 'Volatile Sheet: Gamma-2 (Sn7-8Hg) is the weakest, most corrosion-prone phase, eliminated in high-Cu (>6%) alloys.' },
  { id: 'dq10', subject: 'Oral & Maxillofacial Surgery (OMFS)', question: 'Maximum dose of 2% Lidocaine WITHOUT vasoconstrictor in a healthy adult:', options: ['3.3 mg/kg, max 200 mg', '4.4 mg/kg, max 300 mg', '7.0 mg/kg, max 500 mg', '10.0 mg/kg, max 600 mg'], correct: 1, explanation: 'Volatile Sheet: Lidocaine plain is 4.4 mg/kg (max 300 mg); with adrenaline 7 mg/kg (max 500 mg, BNF/FDA).' }
];

export interface CbtQuestion {
  id: string;
  num: number;
  subject: string;
  q: string;
  options: string[];
  correct: number;
}

export const CBT_PART_A_MOCK_QUESTIONS: CbtQuestion[] = [
  { id: 'ca1', num: 1, subject: 'General Anatomy', q: 'Which foramen transmits the mandibular nerve (CN V3)?', options: ['Foramen rotundum', 'Foramen ovale', 'Foramen spinosum', 'Jugular foramen'], correct: 1 },
  { id: 'ca2', num: 2, subject: 'General Anatomy', q: 'The muscle of mastication that depresses and protrudes the mandible is:', options: ['Masseter', 'Temporalis', 'Lateral pterygoid', 'Medial pterygoid'], correct: 2 },
  { id: 'ca3', num: 3, subject: 'Physiology & Biochemistry', q: 'Which vitamin is essential for gamma-carboxylation of clotting factors II, VII, IX, and X?', options: ['Vitamin A', 'Vitamin C', 'Vitamin K', 'Vitamin E'], correct: 2 },
  { id: 'ca4', num: 4, subject: 'Physiology & Biochemistry', q: 'Normal cardiac output at rest in a healthy adult is approximately:', options: ['2.5 L/min', '5.0 L/min', '8.5 L/min', '12.0 L/min'], correct: 1 },
  { id: 'ca5', num: 5, subject: 'Pharmacology', q: 'Adrenaline maximum recommended dose in a cardiac patient undergoing dental extraction is:', options: ['0.2 mg', '0.04 mg (approx 2 cartridges of 1:100,000)', '0.1 mg', '0.5 mg'], correct: 1 },
  { id: 'ca6', num: 6, subject: 'General Medicine', q: 'First-line antimicrobial prophylaxis for infective endocarditis in a non-allergic patient is:', options: ['Oral Amoxicillin 2g 30-60 min before procedure', 'Intravenous Vancomycin 1g', 'Oral Clindamycin 600mg', 'Oral Erythromycin 500mg'], correct: 0 },
  { id: 'ca7', num: 7, subject: 'General Surgery', q: 'In traumatology, the Parkland formula for burn resuscitation calculates fluid requirements as:', options: ['2 ml * kg * %TBSA in 24 hours', '4 ml * kg * %TBSA (half in first 8 hours, half in next 16 hours)', '6 ml * kg * %TBSA', '8 ml * kg * %TBSA'], correct: 1 }
];

export const CBT_PART_B_MOCK_QUESTIONS: CbtQuestion[] = [
  { id: 'cb1', num: 101, subject: 'Dental Materials', q: 'The gauging water requirement for setting of dental plaster (hemihydrate) is:', options: ['10.5 ml per 100g', '18.6 ml per 100g', '28.0 ml per 100g', '45.0 ml per 100g'], correct: 1 },
  { id: 'cb2', num: 102, subject: 'Oral Pathology', q: 'Corrugated parakeratinized stratified squamous epithelium with palisaded basal layer is characteristic of:', options: ['Ameloblastoma', 'Odontogenic Keratocyst (OKC)', 'Radicular cyst', 'Dentigerous cyst'], correct: 1 },
  { id: 'cb3', num: 103, subject: 'Oral Medicine & Radiology', q: 'A sunburst appearance on an intraoral or occlusal radiograph is classic for:', options: ['Osteosarcoma', 'Fibrous dysplasia', 'Ameloblastoma', 'Paget disease'], correct: 0 },
  { id: 'cb4', num: 104, subject: 'OMFS', q: 'Bilateral submandibular, sublingual, and submental space infection with wooden induration and airway compromise is:', options: ['Canine space abscess', 'Ludwig angina', 'Pterygomandibular space infection', 'Buccal cellulitis'], correct: 1 },
  { id: 'cb5', num: 105, subject: 'OMFS', q: 'Guerin sign (ecchymosis in the region of the greater palatine foramen) is diagnostic of:', options: ['Mandibular body fracture', 'Le Fort I maxillary fracture', 'ZMC tripod fracture', 'Nasal bone fracture'], correct: 1 },
  { id: 'cb6', num: 106, subject: 'Orthodontics', q: 'Steiner cephalometric analysis normal value for ANB angle (indicating Class I skeletal relation) is:', options: ['-2 degrees', '0 degrees', '2 degrees (range 2-4 degrees)', '8 degrees'], correct: 2 },
  { id: 'cb7', num: 107, subject: 'Periodontology', q: 'Which Gracey curette is designed specifically for scaling mesial surfaces of posterior teeth?', options: ['Gracey 1/2', 'Gracey 7/8', 'Gracey 11/12', 'Gracey 13/14'], correct: 2 }
];
