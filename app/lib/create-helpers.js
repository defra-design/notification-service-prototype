//
// Shared helpers for create journey (v1-baseline)
//

const PET_COMMODITIES = new Set([
  'Dog', 'Cat', 'Ferrets', 'Domestic European Rabbits', 'Domestic Rabbits- Other',
  'Birds of Prey- Falcons', 'Birds of Prey- Other', 'Birds of Prey- Owls',
  'Psittaciformes (including parrots, parakeets, macaws and cockatoos)',
  'Reptiles', 'Rodents'
])

function getCommoditySpeciesArray (data) {
  const raw = data && data.commoditySpecies
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string' && raw.trim()) return raw.split(',').map(s => s.trim()).filter(Boolean)
  return raw ? [].concat(raw) : []
}

function normalizeCommoditySessionKey (commodity) {
  if (commodity == null) return ''
  const s = String(commodity).trim()
  const pipe = s.indexOf('|')
  return pipe === -1 ? s : s.slice(0, pipe).trim()
}

function isPetConsignment (data) {
  const names = Array.isArray(data.commodities) && data.commodities.length > 0
    ? data.commodities.map(c => normalizeCommoditySessionKey(c.commodity)).filter(Boolean)
    : (data.commodity ? [normalizeCommoditySessionKey(data.commodity)] : [])
  return names.some(name => PET_COMMODITIES.has(name))
}

function speciesSessionKey (speciesName) {
  return String(speciesName || '').replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '')
}

function removeSessionKeysForSpecies (data, sk) {
  if (!data || !sk) return
  ;[`quantity_${sk}`, `packages_${sk}`, `animalCount_${sk}`, `numberOfPackages_${sk}`].forEach((k) => {
    if (k in data) delete data[k]
  })
  const prefixes = [
    'microchip_', 'passport_', 'tattoo_', 'earTag_', 'flockId_', 'hatchingDate_',
    'holdingId_', 'flockBatch_', 'apiaryReg_', 'colonyId_', 'eggMark_', 'collectionDate_'
  ]
  Object.keys(data).forEach((k) => {
    for (const p of prefixes) {
      if (k.startsWith(p + sk + '_')) {
        delete data[k]
        break
      }
    }
  })
}

function getAllowedSpeciesNames (commodityKey, commodityType, commoditiesData) {
  const d = commodityKey ? commoditiesData[commodityKey] : null
  if (!d) return []
  if (d.speciesByType) {
    const typeKey = commodityType === 'game' ? 'Game' : 'Domestic'
    const arr = d.speciesByType[typeKey]
    if (Array.isArray(arr) && arr.length) return arr
    return Object.values(d.speciesByType).flat()
  }
  if (Array.isArray(d.species)) return d.species
  return []
}

function sanitizeCommoditySpeciesSession (data, commoditiesData) {
  const commodityKey = data.commodity
  if (!commodityKey || !commoditiesData) return
  const commodityType = String(data.commodityType || 'domestic').toLowerCase()
  const allowed = getAllowedSpeciesNames(commodityKey, commodityType, commoditiesData)
  if (!allowed.length) return
  const allowedSet = new Set(allowed)
  const raw = data.commoditySpecies
  const current = Array.isArray(raw) ? raw : (raw ? [raw] : [])
  const filtered = current.filter(s => allowedSet.has(s))
  const removedNames = current.filter(s => !allowedSet.has(s))
  if (filtered.length === 0) {
    if (current.length === 0) {
      data.commoditySpecies = []
    } else {
      data.commoditySpecies = [allowed[0]]
    }
    current.forEach((name) => removeSessionKeysForSpecies(data, speciesSessionKey(name)))
  } else {
    data.commoditySpecies = filtered
    removedNames.forEach((name) => removeSessionKeysForSpecies(data, speciesSessionKey(name)))
  }
}

function isLivestockConsignment (data) {
  const commoditiesEu = require('../data/commodities-eu.js')
  const commoditiesData = require('../data/commodities.js')
  const toKey = (s) => String(s || '').replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '')
  const items = Array.isArray(data.commodities) && data.commodities.length > 0
    ? data.commodities.map(c => ({
      commodity: normalizeCommoditySessionKey(c.commodity),
      commoditySpecies: c.commoditySpecies || [],
      quantities: c.quantities || {}
    }))
    : (data.commodity
      ? [{
          commodity: normalizeCommoditySessionKey(data.commodity),
          commoditySpecies: Array.isArray(data.commoditySpecies) ? data.commoditySpecies : (data.commoditySpecies ? [data.commoditySpecies] : []),
          quantities: data
        }]
      : [])
  let totalBirds = 0
  for (const item of items) {
    if (!item.commodity || PET_COMMODITIES.has(item.commodity)) continue
    const details = commoditiesEu[item.commodity] || commoditiesData[item.commodity]
    const code = details && details.code ? String(details.code).replace(/\s/g, '') : ''
    if (code.startsWith('0102') || code.startsWith('0103') || code.startsWith('0104')) return true
    if (code.startsWith('01061300')) return true
    if (code === '01061900') continue
    if (code.startsWith('0105')) {
      item.commoditySpecies.forEach(s => {
        const key = toKey(s)
        totalBirds += parseInt(item.quantities[`quantity_${key}`], 10) || 0
      })
    }
  }
  return totalBirds > 50
}

module.exports = {
  PET_COMMODITIES,
  getCommoditySpeciesArray,
  getAllowedSpeciesNames,
  sanitizeCommoditySpeciesSession,
  isPetConsignment,
  isLivestockConsignment
}
