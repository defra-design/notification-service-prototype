//
// Normalise dashboard/list commodity strings to common name + code (not species-only)
//

function addSpeciesMappings (details, speciesToEntries) {
  if (!details || !details.code) return
  const common = details.commonName || ''
  const code = String(details.code)
  const speciesList = details.speciesByType
    ? [...new Set(Object.values(details.speciesByType).flat())]
    : (details.species || [])
  speciesList.forEach(s => {
    const k = String(s).trim()
    if (!k) return
    if (!speciesToEntries[k]) speciesToEntries[k] = []
    const list = speciesToEntries[k]
    if (!list.some(e => e.code === code)) {
      list.push({ code, commonName: common })
    }
  })
}

function getSpeciesCommodityMaps () {
  const commoditiesData = require('../data/commodities.js')
  const commoditiesEu = require('../data/commodities-eu.js')
  const speciesToEntries = {}
  for (const [, d] of Object.entries(commoditiesData)) {
    addSpeciesMappings(d, speciesToEntries)
  }
  for (const [, d] of Object.entries(commoditiesEu)) {
    addSpeciesMappings(d, speciesToEntries)
  }
  return { speciesToEntries }
}

function pickEntryForBareSpecies (entries) {
  if (!entries || !entries.length) return null
  if (entries.length === 1) return entries[0]
  return [...entries].sort((a, b) => parseInt(a.code, 10) - parseInt(b.code, 10))[0]
}

function normaliseCommodityDisplay (commodity, maps) {
  const speciesToEntries = maps.speciesToEntries
  if (!commodity || typeof commodity !== 'string') return commodity || ''
  const trimmed = commodity.trim()
  const paren = trimmed.match(/^(.+?)\s+\((\d+)\)\s*$/)
  if (paren) {
    const namePart = paren[1].trim()
    const code = paren[2]
    const hit = (speciesToEntries[namePart] || []).find(e => e.code === code)
    if (hit) return `${hit.commonName} (${code})`
    return commodity
  }
  const bare = speciesToEntries[trimmed]
  if (bare && bare.length) {
    const pick = pickEntryForBareSpecies(bare)
    return `${pick.commonName} (${pick.code})`
  }
  if (/\(\d+\)$/.test(trimmed)) return commodity
  return commodity
}

module.exports = { getSpeciesCommodityMaps, normaliseCommodityDisplay }
