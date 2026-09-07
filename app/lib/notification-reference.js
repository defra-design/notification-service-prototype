//
// Canonical generator for the agreed GBN notification reference format, e.g.
// GBN-AG-26-7K8M2P (Animals and Germinals). Agreed 2026-07-23 under the EU DP /
// Reset programme to replace the legacy IMP.GB.YYYY.NNNNNNN format -- see
// .claude/knowledge/decisions/gbn-reference-format-2026-07-23.md for the decision
// this implements, and reference/notification-reference-number-formats.md for the
// prior formats it supersedes.
//
// Any new page, route or dataset that displays or generates a GBN-style
// notification reference should use this module rather than hand-formatting a
// string -- see the "How to apply" section of the decision doc.
//

// Crockford base32 -- excludes I, L, O, U to avoid visual confusion with 1/0.
const CROCKFORD_BASE32_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

// Maps a notification type (see app/data/notification-types.js) to its GBN
// commodity code. CHED A / CHED PP are real, TRACES-sourced reference formats and
// are not part of this scheme -- see the decision doc -- so they have no entry here.
// IUU was previously 'GBN IUU' with code 'IUU' here -- see
// .claude/knowledge/decisions/iuu-drops-gbn-prefix-2026-09-07.md for why it was pulled
// out of the GBN family (working assumption: GBN is for SPS/TARP types specifically,
// pending confirmation).
const GBN_TYPE_CODES = {
  'GBN AG': 'AG',
  'GBN PP': 'PP',
  'GBN NNS': 'NNS'
}

// Marketing Standards types (MKS EG/PO/FV, added 2026-09-07) have no sourced
// reference-number format -- see .claude/knowledge/reference/marketing-standards-mks-types.md.
// Reusing the GBN-shaped scheme (just with an MKS prefix) for visual consistency
// with the rest of the dashboard, the same way GBN AG's reference was invented
// pending a real source before the agreed GBN format turned up -- flag if a real
// MKS reference format is found later.
const MKS_TYPE_CODES = {
  'MKS EG': 'EG',
  'MKS PO': 'PO',
  'MKS FV': 'FV'
}

function generateReferenceBody (length = 6) {
  let body = ''
  for (let i = 0; i < length; i++) {
    body += CROCKFORD_BASE32_ALPHABET[Math.floor(Math.random() * CROCKFORD_BASE32_ALPHABET.length)]
  }
  return body
}

// `code` is optional -- pass null/undefined for a type like IUU that has no separate
// GBN-style commodity code, giving e.g. IUU-26-7K8M2P instead of IUU-IUU-26-7K8M2P.
function generateNotificationReference (code, { year = new Date().getFullYear(), body, prefix = 'GBN' } = {}) {
  const yy = String(year).slice(-2)
  const codeSegment = code ? `${code}-` : ''
  return `${prefix}-${codeSegment}${yy}-${body || generateReferenceBody()}`
}

function gbnCodeForType (type) {
  return GBN_TYPE_CODES[type] || null
}

function mksCodeForType (type) {
  return MKS_TYPE_CODES[type] || null
}

module.exports = {
  CROCKFORD_BASE32_ALPHABET,
  GBN_TYPE_CODES,
  MKS_TYPE_CODES,
  generateReferenceBody,
  generateNotificationReference,
  gbnCodeForType,
  mksCodeForType
}
