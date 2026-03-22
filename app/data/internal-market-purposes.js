//
// Purpose options when "Internal market" is selected
// Options hide/show based on commodity
//

const allPurposes = [
  {
    value: 'transfer-sale-gift',
    text: 'Transfer of ownership - Sale/gift',
    hint: 'Any movement of an animal for sale or transfer of ownership, including animals sold, moving to a new owner, or moving without a sale (for example, a gift).'
  },
  {
    value: 'transfer-rescue',
    text: 'Transfer of ownership - Rescue',
    hint: 'Change of ownership through rehoming, adoption or fostering where no money is exchanged.'
  },
  {
    value: 'breeding',
    text: 'Breeding',
    hint: 'Animals for reproduction, intended to contribute to a genetic pool, improve livestock or produce offspring.'
  },
  {
    value: 'research',
    text: 'Research',
    hint: 'Animals used in scientific or medical research.'
  },
  {
    value: 'racing-competition',
    text: 'Racing, competition, show or training',
    hint: 'Animals participating in competitive or training events.'
  },
  {
    value: 'approved-premises',
    text: 'Approved premises or body',
    hint: 'Animals intended for exhibition, zoos, collections or conservation programmes requiring a licence or approval.'
  },
  {
    value: 'companion-animal',
    text: 'Companion animal not for resale or rehoming',
    hint: 'Privately owned animals imported under commercial rules that cannot meet non-commercial requirements. For example, transport without the owner, or a group of animals with the owner.'
  },
  {
    value: 'production',
    text: 'Production',
    hint: 'Animals farmed for the production of meat, milk, eggs, wool or other animal products or by-products.'
  },
  {
    value: 'slaughter',
    text: 'Slaughter',
    hint: 'Animals to be slaughtered and processed for meat production shortly after arrival in Great Britain.'
  },
  {
    value: 'fattening',
    text: 'Fattening',
    hint: 'Animals to be fattened for meat production.'
  },
  {
    value: 'restocking',
    text: 'Restocking',
    hint: 'To replenish or enhance populations of species (for example, game or fish).'
  }
]

// Map commodity code prefix to allowed purpose values
// 0101=equines, 0102=bovine, 0103=swine, 0104=sheep/goats, 0105=poultry, 0106=other, 04=eggs, 05=semen/embryos
const codeToPurposes = {
  '0101': ['transfer-sale-gift', 'transfer-rescue', 'breeding', 'research', 'racing-competition', 'approved-premises', 'companion-animal'],
  '0102': ['transfer-sale-gift', 'breeding', 'research', 'approved-premises', 'production', 'slaughter', 'fattening'],
  '0103': ['transfer-sale-gift', 'breeding', 'research', 'approved-premises', 'production', 'slaughter', 'fattening'],
  '0104': ['transfer-sale-gift', 'breeding', 'research', 'approved-premises', 'production', 'slaughter', 'fattening'],
  '0105': ['transfer-sale-gift', 'breeding', 'research', 'approved-premises', 'production', 'slaughter', 'fattening', 'restocking'],
  '0106': ['transfer-sale-gift', 'transfer-rescue', 'breeding', 'research', 'racing-competition', 'approved-premises', 'companion-animal', 'restocking'],
  '04': ['breeding', 'production', 'restocking', 'research'],
  '05': ['breeding', 'research']
}

// Species-specific overrides: code + species -> allowed purposes
// 01061900 = Dog, Cat, Ferrets, Rodents; Canis familiaris = Dog
const codeSpeciesToPurposes = {
  '01061900:Canis familiaris': ['breeding', 'companion-animal', 'research', 'transfer-sale-gift']
}

function getPurposeOptionsForCommodities (commodityNames, commoditiesEu) {
  const allowedValues = new Set()
  const processedPrefixes = new Set()

  const addForCode = (code) => {
    if (!code || processedPrefixes.has(code)) return
    processedPrefixes.add(code)
    const prefix2 = code.substring(0, 2)
    const prefix4 = code.substring(0, 4)

    if (codeToPurposes[code]) codeToPurposes[code].forEach(v => allowedValues.add(v))
    else if (codeToPurposes[prefix4]) codeToPurposes[prefix4].forEach(v => allowedValues.add(v))
    else if (codeToPurposes[prefix2]) codeToPurposes[prefix2].forEach(v => allowedValues.add(v))
    else codeToPurposes['0106'].forEach(v => allowedValues.add(v))
  }

  for (const name of commodityNames) {
    const details = commoditiesEu[name]
    const code = details && details.code ? String(details.code).replace(/\s/g, '') : ''
    if (code) addForCode(code)
  }

  if (allowedValues.size === 0) {
    return allPurposes
  }

  return allPurposes
    .filter(p => allowedValues.has(p.value))
    .sort((a, b) => (a.text || '').localeCompare(b.text || ''))
}

function getPurposeOptionsForCommodityAndSpecies (commodityName, speciesList, commoditiesEu) {
  const details = commodityName ? commoditiesEu[commodityName] : null
  const code = details && details.code ? String(details.code).replace(/\s/g, '') : ''
  if (!code) return getPurposeOptionsForCommodities(commodityName ? [commodityName] : [], commoditiesEu)

  for (const species of (speciesList || [])) {
    const key = `${code}:${species}`
    if (codeSpeciesToPurposes[key]) {
      const allowed = new Set(codeSpeciesToPurposes[key])
      return allPurposes
        .filter(p => allowed.has(p.value))
        .sort((a, b) => (a.text || '').localeCompare(b.text || ''))
    }
  }

  return getPurposeOptionsForCommodities(commodityName ? [commodityName] : [], commoditiesEu)
}

module.exports = allPurposes
module.exports.getPurposeOptionsForCommodities = getPurposeOptionsForCommodities
module.exports.getPurposeOptionsForCommodityAndSpecies = getPurposeOptionsForCommodityAndSpecies
