//
// "Type of packages" options for CHED-D commodity rows (I.31). TRACES NT uses
// a shared package-type code list (UN/CEFACT Recommendation 21) across all
// CHED types — this is the subset relevant to HRFNAO commodities (spices,
// nuts, rice, fresh produce), not the full ~200-code UN list. Unverified
// against the CHED-D User Manual/IPAFFS — treat as a placeholder pending
// confirmation against the source.
//

module.exports = [
  { value: 'bag', text: 'Bag' },
  { value: 'bale', text: 'Bale' },
  { value: 'barrel', text: 'Barrel' },
  { value: 'basket', text: 'Basket' },
  { value: 'box', text: 'Box' },
  { value: 'bulk', text: 'Bulk (unpackaged/loose)' },
  { value: 'carton', text: 'Carton' },
  { value: 'case', text: 'Case' },
  { value: 'container', text: 'Container' },
  { value: 'crate', text: 'Crate' },
  { value: 'drum', text: 'Drum' },
  { value: 'pallet', text: 'Pallet' },
  { value: 'sack', text: 'Sack' },
  { value: 'tray', text: 'Tray' }
]
