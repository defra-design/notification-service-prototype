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
  { value: 'slaughter', text: 'Slaughter' }
]

// Species-specific overrides: code + species -> allowed values (alphabetical by text)
const codeSpeciesToOptions = {
  '01061900:Canis familiaris': ['approved-bodies', 'breeding-production', 'other', 'pets']
}

// Code-level overrides: commodity code 0102 (cattle) shows only these three
const codeToOptions = {
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

  return sortOptions(allOptions)
}

module.exports = allOptions
module.exports.getCertifiedForOptions = getCertifiedForOptions
