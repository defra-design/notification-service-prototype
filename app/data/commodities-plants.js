//
// Plant/plant product commodities for CHED PP notifications, keyed by common name.
// Mirrors the shape of commodities-eu.js (which is animal-only, see commodityTypes there)
// but uses an EPPO code instead of a CN/commodity code, matching Box I.31 of the CHED-PP
// specimen (.claude/knowledge/documents/ched-pp-specimen-en.pdf): Commodity, EPPO Code,
// Product type, Net weight, Package count, Country of Origin, Quantity, Net volume,
// Packaging material, Sanitary Region of Origin, Establishment of Origin, Batch number.
//
// EPPO codes here are illustrative (right format, plausible values) rather than verified
// against the live EPPO database -- fine for prototype purposes, flag if exact codes matter.
//

module.exports = {
  'Cut tulips': { eppoCode: 'TULGE', commonName: 'Cut tulips', productType: 'Cut flowers', packagingMaterial: 'Cardboard box' },
  'Cut roses': { eppoCode: 'ROSAA', commonName: 'Cut roses', productType: 'Cut flowers', packagingMaterial: 'Cardboard box' },
  'Seed potatoes': { eppoCode: 'SOLTU', commonName: 'Seed potatoes', productType: 'Tubers', packagingMaterial: 'Sacks' },
  'Apples': { eppoCode: 'MABSD', commonName: 'Apples', productType: 'Fresh fruit', packagingMaterial: 'Crates' },
  'Tomato plants': { eppoCode: 'LYPES', commonName: 'Tomato plants', productType: 'Live plants', packagingMaterial: 'Trays' }
}
