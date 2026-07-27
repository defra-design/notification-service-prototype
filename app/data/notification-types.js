//
// Notification types (CHED / GBN classifications)
//
// GBN NNS was removed 2026-07-27 -- stakeholder confirmed it's the same as GBN PP,
// so it isn't modelled as a distinct type. See
// .claude/knowledge/decisions/gbn-nns-merged-into-gbn-pp-2026-07-27.md
//

module.exports = [
  'CHED A',
  'CHED PP',
  'GBN AG',
  'GBN PP',
  'GBN IUU'
]
