//
// Options for "What are the animals certified for?"
// Filtered by commodity/species
//

const allOptions = [
  { value: 'approved-bodies', text: 'Approved bodies' },
  { value: 'breeding-production', text: 'Breeding and/or production' },
  { value: 'circus-exhibition', text: 'Circus/exhibition' },
  { value: 'fattening', text: 'Fattening' },
  { value: 'other', text: 'Other' },
  { value: 'pets', text: 'Pets' },
  { value: 'quarantine', text: 'Quarantine' },
  { value: 'registered-equidae', text: 'Registered equidae' },
  { value: 'slaughter', text: 'Slaughter' }
]

// Species-specific overrides: code + species -> allowed values (alphabetical by text)
const codeSpeciesToOptions = {}

// Code-level overrides: commodity code -> allowed values
// 01061900 = Cat, Dog, Ferrets, Rodents (pets)
// 04071100 = Poultry hatching eggs (chickens): four options only, no circus/slaughter etc.
// 010410 / 010420 = Sheep / goats: certified-for list from health certificate; no unweaned step
const SHEEP_GOAT_CERTIFIED_FOR = [
  'approved-bodies',
  'breeding-production',
  'circus-exhibition',
  'fattening',
  'slaughter'
]
const { POULTRY_CODES } = require('../lib/animal-identification-profile.js')

const POULTRY_AND_DUCKS_CERTIFIED_FOR = [
  'approved-bodies',
  'breeding-production',
  'pets',
  'quarantine',
  'slaughter',
  'other'
]

const codeToOptions = {
  '01061900': ['approved-bodies', 'breeding-production', 'circus-exhibition', 'pets', 'other'],
  '0102': ['approved-bodies', 'breeding-production', 'slaughter'],
  '04071100': ['approved-bodies', 'breeding-production', 'pets', 'other'],
  '010410': SHEEP_GOAT_CERTIFIED_FOR,
  '010420': SHEEP_GOAT_CERTIFIED_FOR,
  '10410': SHEEP_GOAT_CERTIFIED_FOR,
  '10420': SHEEP_GOAT_CERTIFIED_FOR
}

for (const pCode of POULTRY_CODES) {
  codeToOptions[pCode] = POULTRY_AND_DUCKS_CERTIFIED_FOR
}

function getCertifiedForOptions (commodityName, speciesList, commoditiesEu) {
  const details = commodityName ? commoditiesEu[commodityName] : null
  const code = details && details.code ? String(details.code).replace(/\s/g, '') : ''

  const sortOptions = (opts) => {
    const other = opts.filter(o => o.value === 'other')
    const rest = opts.filter(o => o.value !== 'other').sort((a, b) => (a.text || '').localeCompare(b.text || ''))
    return [...rest, ...other]
  }

  if (commodityName === 'Horse' && code === '0101') {
    const allowed = new Set([
      'approved-bodies',
      'breeding-production',
      'pets',
      'registered-equidae',
      'slaughter',
      'other'
    ])
    return sortOptions(allOptions.filter(o => allowed.has(o.value)))
  }

  for (const species of (speciesList || [])) {
    const key = `${code}:${species}`
    if (codeSpeciesToOptions[key]) {
      const allowed = new Set(codeSpeciesToOptions[key])
      return sortOptions(allOptions.filter(o => allowed.has(o.value)))
    }
  }

  if (codeToOptions[code]) {
    const allowed = new Set(codeToOptions[code])
    return sortOptions(allOptions.filter(o => allowed.has(o.value)))
  }

  if (commodityName === 'Goats' || commodityName === 'Sheep (Domestic)') {
    const allowed = new Set(SHEEP_GOAT_CERTIFIED_FOR)
    return sortOptions(allOptions.filter(o => allowed.has(o.value)))
  }

  if (commodityName && commodityName.startsWith('Poultry -')) {
    const allowed = new Set(POULTRY_AND_DUCKS_CERTIFIED_FOR)
    return sortOptions(allOptions.filter(o => allowed.has(o.value)))
  }

  return sortOptions(allOptions.filter(o => o.value !== 'registered-equidae'))
}

module.exports = allOptions
module.exports.getCertifiedForOptions = getCertifiedForOptions
