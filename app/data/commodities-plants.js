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
// riskCategoryEu / riskCategoryRow (plain English, e.g. "High risk") are sourced from
// .claude/knowledge/reference/plant-risk-categorisation-btom.md (DEFRA plant health portal,
// digested 2026-08-03) -- only "High risk" and "Medium risk A" commodities actually require
// a CHED PP pre-notification in the real BTOM system, so every commodity in this file should
// be one of those two tiers for at least one origin group. See
// .claude/knowledge/decisions/plant-commodity-risk-realism-2026-08-03.md for why "Cut tulips"
// (Medium risk B -- no CHED PP required at all) was replaced with "Chrysanthemums" here.
//

module.exports = {
  'Chrysanthemums': { eppoCode: 'CHYSX', commonName: 'Chrysanthemums', productType: 'Cut flowers', packagingMaterial: 'Cardboard box', riskCategoryEu: 'Low risk', riskCategoryRow: 'Medium risk A' },
  'Cut roses': { eppoCode: 'ROSAA', commonName: 'Cut roses', productType: 'Cut flowers', packagingMaterial: 'Cardboard box', riskCategoryEu: 'Low risk', riskCategoryRow: 'Medium risk A' },
  'Seed potatoes': { eppoCode: 'SOLTU', commonName: 'Seed potatoes', productType: 'Tubers', packagingMaterial: 'Sacks', riskCategoryEu: 'High risk', riskCategoryRow: 'High risk (permitted countries only)' },
  'Apples': { eppoCode: 'MABSD', commonName: 'Apples', productType: 'Fresh fruit', packagingMaterial: 'Crates', riskCategoryEu: 'Low risk', riskCategoryRow: 'Medium risk A' },
  'Tomato plants': { eppoCode: 'LYPES', commonName: 'Tomato plants', productType: 'Live plants', packagingMaterial: 'Trays', riskCategoryEu: 'Medium risk A', riskCategoryRow: 'Medium risk A' }
}
