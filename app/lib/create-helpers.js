//
// Shared helpers for create journey (v1-baseline and v1-experimental)
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

function isPetConsignment (data) {
  const names = Array.isArray(data.commodities) && data.commodities.length > 0
    ? data.commodities.map(c => c.commodity).filter(Boolean)
    : (data.commodity ? [data.commodity] : [])
  return names.some(name => PET_COMMODITIES.has(name))
}

function isLivestockConsignment (data) {
  const commoditiesEu = require('../data/commodities-eu.js')
  const commoditiesData = require('../data/commodities.js')
  const toKey = (s) => String(s || '').replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '')
  const items = Array.isArray(data.commodities) && data.commodities.length > 0
    ? data.commodities.map(c => ({ commodity: c.commodity, commoditySpecies: c.commoditySpecies || [], quantities: c.quantities || {} }))
    : (data.commodity ? [{ commodity: data.commodity, commoditySpecies: Array.isArray(data.commoditySpecies) ? data.commoditySpecies : (data.commoditySpecies ? [data.commoditySpecies] : []), quantities: data }] : [])
  let totalBirds = 0
  for (const item of items) {
    if (PET_COMMODITIES.has(item.commodity)) continue
    const details = commoditiesEu[item.commodity] || commoditiesData[item.commodity]
    const code = details && details.code ? String(details.code).replace(/\s/g, '') : ''
    if (code.startsWith('0102') || code.startsWith('0103') || code.startsWith('0104')) return true
    if (code.startsWith('01061300')) return true
    if (code === '01061900') return true
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
  isPetConsignment,
  isLivestockConsignment
}
