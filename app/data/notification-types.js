//
// Notification types (CHED / GBN classifications)
//
// Post-2027 UK-EU SPS Agreement regime (see
// .claude/knowledge/decisions/gbn-nns-reinstated-post-2027-regime-2026-07-27.md):
// CHED A / CHED PP are the real, TRACES-sourced types used for Rest-of-World
// (non-EU) movements. GBN AG/PP/NNS are GB-specific SPS/TARP types for EU-GB
// movements (except GBN PP, which is ROW plant products) -- see that decision doc
// for the exact use case each GBN type covers, and notifications-intro.js for how
// origin countries are assigned accordingly.
//
// IUU (wild-caught marine fish, dropped the "GBN" prefix 2026-09-07 -- see
// .claude/knowledge/decisions/iuu-drops-gbn-prefix-2026-09-07.md) is kept separate
// from the GBN family on the working assumption that "GBN" denotes SPS/TARP types
// specifically; flag if that turns out wrong.
//
// MKS EG/PO/FV (added 2026-09-07) are a separate compliance regime -- UK Marketing
// Standards (quality/labelling, not animal/plant health) -- covering eggs, poultry
// meat and fresh fruit & vegetables respectively. See
// .claude/knowledge/reference/marketing-standards-mks-types.md for the sourced
// background; the "MKS" prefix itself is this prototype's own shorthand, not a
// confirmed IPAFFS/TRACES code.
//

module.exports = [
  'CHED A',
  'CHED PP',
  'GBN AG',
  'GBN PP',
  'GBN NNS',
  'IUU',
  'MKS EG',
  'MKS PO',
  'MKS FV'
]
