//
// Notification types (CHED / GBN classifications)
//
// Post-2027 UK-EU SPS Agreement regime (see
// .claude/knowledge/decisions/gbn-nns-reinstated-post-2027-regime-2026-07-27.md):
// CHED A / CHED PP are the real, TRACES-sourced types used for Rest-of-World
// (non-EU) movements. GBN AG/PP/NNS/IUU are GB-specific types for EU-GB movements
// (except GBN PP, which is ROW plant products) -- see that decision doc for the
// exact use case each GBN type covers, and notifications-intro.js for how origin
// countries are assigned accordingly.
//

module.exports = [
  'CHED A',
  'CHED PP',
  'GBN AG',
  'GBN PP',
  'GBN NNS',
  'GBN IUU'
]
