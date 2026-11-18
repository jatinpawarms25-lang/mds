export interface LicenceGateResult {
  allowed: boolean;
  normalizedLicence: string;
  nonCommercial: boolean;
  reason?: string;
}

export function checkLicenceGate(rawLicence: string | undefined | null): LicenceGateResult {
  const clean = (rawLicence || '').trim();
  if (!clean) {
    return { allowed: false, normalizedLicence: 'Unknown', nonCommercial: false, reason: 'missing_or_unknown_licence' };
  }
  const lower = clean.toLowerCase();

  if (lower.includes('nd') || lower.includes('no-deriv') || lower.includes('noderiv')) {
    return { allowed: false, normalizedLicence: clean, nonCommercial: false, reason: 'no_derivatives_rejected' };
  }
  if (lower.includes('all rights reserved') || lower.includes('copyrighted') || lower === 'unknown') {
    return { allowed: false, normalizedLicence: clean, nonCommercial: false, reason: 'non_open_licence' };
  }

  if (lower.includes('public domain') || lower.includes('pd') || lower.includes('cc0')) {
    return { allowed: true, normalizedLicence: clean, nonCommercial: false };
  }
  if (lower.includes('cc by-nc-sa') || lower.includes('cc-by-nc-sa') || lower.includes('cc by-nc') || lower.includes('cc-by-nc')) {
    return { allowed: true, normalizedLicence: clean, nonCommercial: true };
  }
  if (lower.includes('cc by-sa') || lower.includes('cc-by-sa') || lower.includes('cc by') || lower.includes('cc-by')) {
    return { allowed: true, normalizedLicence: clean, nonCommercial: false };
  }

  return { allowed: false, normalizedLicence: clean, nonCommercial: false, reason: 'unrecognized_licence' };
}
