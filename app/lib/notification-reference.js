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
const GBN_TYPE_CODES = {
  'GBN AG': 'AG',
  'GBN PP': 'PP',
  'GBN NNS': 'NNS',
  'GBN IUU': 'IUU'
}

function generateReferenceBody (length = 6) {
  let body = ''
  for (let i = 0; i < length; i++) {
    body += CROCKFORD_BASE32_ALPHABET[Math.floor(Math.random() * CROCKFORD_BASE32_ALPHABET.length)]
  }
  return body
}

function generateNotificationReference (code, { year = new Date().getFullYear(), body } = {}) {
  const yy = String(year).slice(-2)
  return `GBN-${code}-${yy}-${body || generateReferenceBody()}`
}

function gbnCodeForType (type) {
  return GBN_TYPE_CODES[type] || null
}

module.exports = {
  CROCKFORD_BASE32_ALPHABET,
  GBN_TYPE_CODES,
  generateReferenceBody,
  generateNotificationReference,
  gbnCodeForType
}
