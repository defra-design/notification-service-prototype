//
// Options for "What are the animals certified for?"
// Filtered by commodity/species
//

const allOptions = [
  { value: 'approved-bodies', text: 'Approved bodies' },
  { value: 'breeding-production', text: 'Breeding and/or production' },
  { value: 'circus-exhibition', text: 'Circus/exhibition' },
  { value: 'other', text: 'Other' },
  { value: 'pets', text: 'Pets' },
  { value: 'registered-equidae', text: 'Registered equidae' },
  { value: 'slaughter', text: 'Slaughter' }
]

// Species-specific overrides: code + species -> allowed values (alphabetical by text)
const codeSpeciesToOptions = {}

// Code-level overrides: commodity code -> allowed values
// 01061900 = Cat, Dog, Ferrets, Rodents (pets)
const codeToOptions = {
  '01061900': ['approved-bodies', 'breeding-production', 'circus-exhibition', 'pets', 'other'],
  '0102': ['approved-bodies', 'breeding-production', 'slaughter']
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

  return sortOptions(allOptions.filter(o => o.value !== 'registered-equidae'))
}

module.exports = allOptions
module.exports.getCertifiedForOptions = getCertifiedForOptions
