// Open-Source Medical & Dental Image Search and Diagnostic Dataset
// Connects to Wikimedia Commons Open Medical Media API & curated CC-licensed dental archives
// 100% strict 7-bit ASCII, zero external proprietary dependencies

import type { ImageEntry } from './imageLibrary';

export interface OpenSourceSearchOptions {
  query: string;
  limit?: number;
}

// Clean HTML tags from API metadata
function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '').trim();
}

// Clean MediaWiki File: prefix and extension
function cleanTitle(filename: string): string {
  let name = filename.replace(/^File:/i, '');
  name = name.replace(/\.(jpe?g|png|webp|gif|svg)$/i, '');
  return name.replace(/_/g, ' ');
}

// Curated expanded offline library of high-yield dental diagnoses (All CC / Public Domain)
export const EXPANDED_OPEN_SOURCE_DENTAL_LIBRARY: ImageEntry[] = [
  {
    id: 'os_dentigerous_cyst',
    title: 'Dentigerous (Follicular) Cyst Associated with Impacted Molar',
    diagnosis: 'Dentigerous Cyst (Pericoronal Radiolucency)',
    subject: 'Oral Medicine & Radiology',
    type: 'radiograph',
    keyFeatures: [
      'Well-defined unilocular radiolucency attached at the cementoenamel junction (CEJ)',
      'Surrounds the crown of an unerupted or impacted tooth (typically mandibular 3rd molar or maxillary canine)',
      'Causes displacement of the associated tooth and root resorption of adjacent teeth'
    ],
    lookAlikes: 'Unicystic Ameloblastoma, Odontogenic Keratocyst, Ameloblastic Fibroma',
    sourceName: 'Wikimedia Commons',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Dentigerous_cyst.gif',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Dentigerous_cyst.gif',
    licence: 'Public domain',
    author: 'Armed Forces Institute of Pathology (AFIP)',
    creditLine: 'Image: AFIP / Wikimedia Commons (Public domain)',
    dateVerified: '2026-11-18',
    isPlaceholder: false
  },
  {
    id: 'os_ameloblastoma_follicular_histopath',
    title: 'Follicular Ameloblastoma Histopathology',
    diagnosis: 'Ameloblastoma (Follicular Pattern with Stellate Reticulum)',
    subject: 'Oral Pathology',
    type: 'histopathology',
    keyFeatures: [
      'Islands of odontogenic epithelium surrounded by mature fibrous stroma',
      'Peripheral palisading columnar ameloblast-like cells with reverse nuclear polarity (Vickers-Gorlin criteria)',
      'Central loosely arranged cells resembling the stellate reticulum of the enamel organ',
      'Subnuclear vacuolization and cystic degeneration within epithelial islands'
    ],
    lookAlikes: 'Craniopharyngioma, Basal Cell Carcinoma, Odontogenic Keratocyst',
    sourceName: 'Wikimedia Commons',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Ameloblastoma_(Follicular_Type).jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Ameloblastoma_%28Follicular_Type%29.jpg',
    licence: 'CC BY-SA 4.0',
    author: 'KGH / Wikimedia Commons',
    creditLine: 'Image: KGH / Wikimedia Commons (CC BY-SA 4.0)',
    dateVerified: '2026-11-18',
    isPlaceholder: false
  },
  {
    id: 'os_pleomorphic_adenoma_histopath',
    title: 'Pleomorphic Adenoma (Benign Mixed Tumor) of Parotid Gland',
    diagnosis: 'Pleomorphic Adenoma (Ductal Epithelium & Chondromyxoid Stroma)',
    subject: 'Oral Pathology',
    type: 'histopathology',
    keyFeatures: [
      'Biphasic tumor composed of epithelial/myoepithelial elements and mesenchymal-like stroma',
      'Duct-like structures lined by cuboidal cells and outer myoepithelial cells',
      'Chondromyxoid and hyaline stromal matrix',
      'Fibrous capsule with frequent pseudopodial extensions'
    ],
    lookAlikes: 'Adenoid Cystic Carcinoma, Polymorphous Adenocarcinoma, Monomorphic Adenoma',
    sourceName: 'Wikimedia Commons',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Pleomorphic_adenoma_-_cytology.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Pleomorphic_adenoma_-_cytology.jpg',
    licence: 'CC BY-SA 3.0',
    author: 'Nephron / Wikimedia Commons',
    creditLine: 'Image: Nephron / Wikimedia Commons (CC BY-SA 3.0)',
    dateVerified: '2026-11-18',
    isPlaceholder: false
  },
  {
    id: 'os_lichen_planus_clinical',
    title: 'Reticular Oral Lichen Planus of Buccal Mucosa',
    diagnosis: 'Oral Lichen Planus (Wickham Striae)',
    subject: 'Oral Medicine & Radiology',
    type: 'clinical',
    keyFeatures: [
      'Bilateral, symmetrical lacelike network of slender white lines (Wickham striae)',
      'Most commonly involves posterior buccal mucosa followed by tongue and gingiva',
      'T-cell mediated autoimmune mucocutaneous disorder with band-like lymphocytic infiltrate',
      'Typically asymptomatic in reticular form; erosive form presents with burning sensation'
    ],
    lookAlikes: 'Lichenoid drug reaction, Discoid Lupus Erythematosus, Leukoplakia',
    sourceName: 'Wikimedia Commons',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Lichen_planus.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Lichen_planus.jpg',
    licence: 'Public domain',
    author: 'CDC / Dr. J. Pledger',
    creditLine: 'Image: CDC Public Health Image Library #3197 (Public domain)',
    dateVerified: '2026-11-18',
    isPlaceholder: false
  },
  {
    id: 'os_leukoplakia_clinical',
    title: 'Homogeneous Oral Leukoplakia of Lateral Border of Tongue',
    diagnosis: 'Oral Leukoplakia (Potentially Malignant Disorder)',
    subject: 'Oral Medicine & Radiology',
    type: 'clinical',
    keyFeatures: [
      'White plaque or patch that cannot be wiped off and cannot be characterized clinically as any other disease',
      'Predominantly associated with tobacco and alcohol consumption',
      'Histopathology reveals hyperkeratosis (hyperortho- or parakeratosis) with or without epithelial dysplasia',
      'High-risk sites for malignant transformation: lateral tongue, floor of mouth, ventral tongue'
    ],
    lookAlikes: 'Pseudomembranous Candidiasis (scrapes off), Oral Hairy Leukoplakia, Leukoedema',
    sourceName: 'Wikimedia Commons',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Leukoplakia02-04-06.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/9/9f/Leukoplakia02-04-06.jpg',
    licence: 'CC BY-SA 3.0',
    author: 'Mikael Haggstrom / Wikimedia Commons',
    creditLine: 'Image: Mikael Haggstrom / Wikimedia Commons (CC BY-SA 3.0)',
    dateVerified: '2026-11-18',
    isPlaceholder: false
  },
  {
    id: 'os_fibrous_dysplasia_ground_glass',
    title: 'Fibrous Dysplasia Ground-Glass Radiographic Appearance',
    diagnosis: 'Monostotic Fibrous Dysplasia (Maxilla)',
    subject: 'Oral Medicine & Radiology',
    type: 'radiograph',
    keyFeatures: [
      'Diffuse fine radiopacity resembling ground glass or orange peel (peau d orange)',
      'Ill-defined borders blending imperceptibly into surrounding normal bone',
      'Expansion of maxilla with upward displacement of maxillary sinus floor',
      'GNAS1 gene activating mutation leading to arrested bone maturation'
    ],
    lookAlikes: 'Cemento-Ossifying Fibroma (well-demarcated with capsule), Paget Disease',
    sourceName: 'Wikimedia Commons',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Fibrous_dysplasia_-_CT_-_sagittal.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Fibrous_dysplasia_-_CT_-_sagittal.jpg',
    licence: 'CC BY-SA 3.0',
    author: 'Dr. Frank Gaillard / Radiopaedia / Wikimedia',
    creditLine: 'Image: Dr. Frank Gaillard / Wikimedia Commons (CC BY-SA 3.0)',
    dateVerified: '2026-11-18',
    isPlaceholder: false
  },
  {
    id: 'os_pemphigus_vulgaris_histopath',
    title: 'Pemphigus Vulgaris with Suprabasilar Acantholysis',
    diagnosis: 'Pemphigus Vulgaris (Intraepithelial Clefting & Tzanck Cells)',
    subject: 'Oral Pathology',
    type: 'histopathology',
    keyFeatures: [
      'Intraepithelial split located immediately above the basal cell layer (suprabasilar clefting)',
      'Tombstone appearance of basal keratinocytes remaining attached to the basement membrane',
      'Rounded, detached acantholytic keratinocytes (Tzanck cells) floating in the blister vesicle fluid',
      'Direct immunofluorescence demonstrates fishnet or chicken-wire IgG/C3 deposition against desmoglein 3'
    ],
    lookAlikes: 'Mucous Membrane Pemphigoid (subepithelial split), Darier Disease, Hailey-Hailey Disease',
    sourceName: 'Wikimedia Commons',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Pemphigus_vulgaris_-_high_mag.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/d/df/Pemphigus_vulgaris_-_high_mag.jpg',
    licence: 'CC BY-SA 3.0',
    author: 'Nephron / Wikimedia Commons',
    creditLine: 'Image: Nephron / Wikimedia Commons (CC BY-SA 3.0)',
    dateVerified: '2026-11-18',
    isPlaceholder: false
  },
  {
    id: 'os_taurodontism_radiograph',
    title: 'Taurodontism (Bull Tooth) on Dental Radiograph',
    diagnosis: 'Taurodontism (Enlarged Pulp Chamber with Apical Furcation)',
    subject: 'Pedodontics & Dental Anatomy',
    type: 'radiograph',
    keyFeatures: [
      'Vertically elongated crown and trunk with rectangular pulp chamber body',
      'Furcation located far apically near the root apices',
      'Failure of Hertwig epithelial root sheath to invaginate at the proper horizontal level',
      'Classified into hypotaurodontism, mesotaurodontism, and hypertaurodontism; associated with Klinefelter syndrome'
    ],
    lookAlikes: 'Normal developing tooth with wide open apices, Dentin dysplasia Type I',
    sourceName: 'Wikimedia Commons',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Taurodontism.jpg',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/ec/Taurodontism.jpg',
    licence: 'CC BY-SA 4.0',
    author: 'Dr. R. Al-Haj / Wikimedia Commons',
    creditLine: 'Image: Dr. R. Al-Haj / Wikimedia Commons (CC BY-SA 4.0)',
    dateVerified: '2026-11-18',
    isPlaceholder: false
  }
];

// Live unlimited open-source image search across Wikimedia Commons Media API
export async function searchOpenSourceMedicalImages(options: OpenSourceSearchOptions): Promise<ImageEntry[]> {
  const query = options.query.trim();
  if (!query) return [];

  const limit = options.limit || 16;
  const searchQuery = `filetype:bitmap ${query} dentistry oral`;
  const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(
    searchQuery
  )}&gsrlimit=${limit}&prop=imageinfo&iiprop=url|size|extmetadata&format=json&origin=*`;

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return [];

    const data = (await response.json()) as {
      query?: {
        pages?: Record<
          string,
          {
            pageid: number;
            title: string;
            imageinfo?: Array<{
              url: string;
              descriptionurl?: string;
              extmetadata?: {
                LicenseShortName?: { value?: string };
                Artist?: { value?: string };
                ImageDescription?: { value?: string };
                ObjectName?: { value?: string };
              };
            }>;
          }
        >;
      };
    };

    const pages = Object.values(data.query?.pages || {});
    const results: ImageEntry[] = [];

    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info || !info.url) continue;

      // Ensure valid image file extension
      if (!/\.(jpe?g|png|webp|gif|svg)$/i.test(info.url)) continue;

      const meta = info.extmetadata;
      const title = cleanTitle(meta?.ObjectName?.value || page.title);
      const artist = stripHtml(meta?.Artist?.value || 'Wikimedia Medical Contributor');
      const license = meta?.LicenseShortName?.value || 'CC BY-SA / Open Source';
      const description = stripHtml(meta?.ImageDescription?.value || title);

      // Guess canonical subject based on query
      let subject = 'Oral Medicine & Radiology';
      const qLower = query.toLowerCase();
      if (qLower.includes('path') || qLower.includes('histo') || qLower.includes('cyst') || qLower.includes('tumor') || qLower.includes('carcinoma')) {
        subject = 'Oral Pathology';
      } else if (qLower.includes('surg') || qLower.includes('fracture') || qLower.includes('le fort') || qLower.includes('nerve')) {
        subject = 'Oral & Maxillofacial Surgery';
      } else if (qLower.includes('perio') || qLower.includes('gingiv') || qLower.includes('probe')) {
        subject = 'Periodontics';
      } else if (qLower.includes('ortho') || qLower.includes('ceph') || qLower.includes('angle')) {
        subject = 'Orthodontics';
      } else if (qLower.includes('endo') || qLower.includes('canal') || qLower.includes('apex')) {
        subject = 'Conservative & Endodontics';
      }

      results.push({
        id: `os_live_${page.pageid}`,
        title,
        diagnosis: title,
        subject,
        type: info.url.endsWith('.gif') || info.url.endsWith('.png') ? 'radiograph' : 'clinical',
        keyFeatures: [description.slice(0, 180)],
        lookAlikes: 'Open-source clinical differential diagnosis',
        sourceName: 'Wikimedia Commons',
        sourcePageUrl: info.descriptionurl || info.url,
        imageUrl: info.url,
        licence: license,
        author: artist,
        creditLine: `Image: ${artist} / Wikimedia Commons (${license})`,
        dateVerified: new Date().toISOString().slice(0, 10),
        isPlaceholder: false
      });
    }

    return results;
  } catch {
    return [];
  }
}
