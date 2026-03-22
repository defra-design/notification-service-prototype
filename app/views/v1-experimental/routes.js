//
// v1-experimental – Option 2 flow: Commodity → Origin → Quantities → Hub (multi-commodity)
//

const BASE = '/v1-experimental'

// For code 0102 (bovine), use the definition with speciesByType (Domestic/Game)
function getCommodityDetailsForSpecies (commoditiesData, commodityKey) {
  const details = commoditiesData[commodityKey]
  if (!details) return null
  const code = details.code
  if (code === '0102') {
    const withCode0102 = Object.entries(commoditiesData).filter(([, d]) => d.code === '0102')
    const withSpeciesByType = withCode0102.find(([, d]) => d.speciesByType)
    if (withSpeciesByType) {
      const [, d] = withSpeciesByType
      return { ...d, commonName: details.commonName || commodityKey, code: details.code }
    }
  }
  return details
}

function toKey (s) {
  return String(s || '').replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '')
}

function buildCommoditiesForHub (req) {
  const commodities = req.session.data.commodities || []
  const commoditiesData = require('../../data/commodities-eu.js')
  let totalAnimals = 0
  let totalPackages = 0
  const items = commodities.map((item, i) => {
    const d = commoditiesData[item.commodity] || {}
    let itemAnimals = 0
    let itemPackages = 0
    const quantities = item.quantities || {}
    Object.keys(quantities).forEach(k => {
      const val = parseInt(quantities[k], 10)
      if (!isNaN(val)) {
        if (k.startsWith('quantity_')) itemAnimals += val
        if (k.startsWith('packages_')) itemPackages += val
      }
    })
    totalAnimals += itemAnimals
    totalPackages += itemPackages
    const speciesWithQuantity = (item.commoditySpecies || []).map(s => {
      const key = toKey(s)
      const qty = parseInt(quantities[`quantity_${key}`], 10)
      return { name: s, quantity: isNaN(qty) ? 0 : qty }
    })
    return {
      index: i,
      commodity: item.commodity,
      label: d.commonName || item.commodity,
      code: d.code || '',
      species: item.commoditySpecies || [],
      speciesWithQuantity,
      totalAnimals: itemAnimals,
      totalPackages: itemPackages
    }
  })
  items.sort((a, b) => {
    const labelA = (a.label || '').toLowerCase()
    const labelB = (b.label || '').toLowerCase()
    if (labelA !== labelB) return labelA.localeCompare(labelB)
    const speciesA = (a.species || []).join(', ').toLowerCase()
    const speciesB = (b.species || []).join(', ').toLowerCase()
    return speciesA.localeCompare(speciesB)
  })
  return { items, totalAnimals, totalPackages }
}

function syncFirstCommodityToSession (data) {
  const commodities = data.commodities || []
  if (commodities.length === 0) return false
  const first = commodities[0]
  data.commodity = first.commodity
  data.commoditySpecies = first.commoditySpecies || []
  data.commodityType = first.commodityType || 'domestic'
  if (first.quantities) {
    Object.assign(data, first.quantities)
    ;(first.commoditySpecies || []).forEach(s => {
      const key = s.replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '')
      const qty = first.quantities[`quantity_${key}`]
      if (qty !== undefined) data[`animalCount_${key}`] = qty
      const pkg = first.quantities[`packages_${key}`]
      if (pkg !== undefined) data[`numberOfPackages_${key}`] = pkg
    })
  }
  return true
}

function clearCommoditySession (data) {
  delete data.commodity
  delete data.commoditySpecies
  delete data.commodityType
  delete data.commodityEditIndex
  Object.keys(data).filter(k => k.startsWith('quantity_') || k.startsWith('packages_')).forEach(k => delete data[k])
}

module.exports = (router) => {
  router.use(BASE, (req, res, next) => {
    res.locals.basePath = BASE
    next()
  })

  router.get(`${BASE}/start`, (req, res) => {
    res.render('v1-experimental/start')
  })

  const { registerDashboardRoutes } = require('../../lib/dashboard.js')
  const notifications = require('../../data/notifications')
  registerDashboardRoutes(router, BASE, {
    templatePath: 'v1-experimental/dashboard',
    notifications
  })

  // === 1. Commodity + species (typeahead includes both) ===
  router.get(`${BASE}/create/commodity`, (req, res) => {
    const commoditiesData = require('../../data/commodities-eu.js')
    const commodities = req.session.data.commodities || []
    const existingKeys = new Set(commodities.map(c => c.commodity).filter(Boolean))
    const existingCombos = new Set(
      commodities.flatMap(c => (c.commoditySpecies || []).map(s => `${c.commodity}|${s}`))
    )
    const commodityOptions = []
    const seenText = new Set()
    Object.entries(commoditiesData).forEach(([key, d]) => {
      const commodityText = `${d.commonName || key} (${d.code})`
      if (!seenText.has(commodityText) && !existingKeys.has(key)) {
        seenText.add(commodityText)
        commodityOptions.push({
          value: key,
          text: commodityText
        })
      }
      const allSpecies = d.speciesByType ? [...new Set(Object.values(d.speciesByType).flat())] : (d.species || [])
      allSpecies.forEach(s => {
        const speciesText = `${d.commonName || key} (${s})`
        const combo = `${key}|${s}`
        if (!seenText.has(speciesText) && !existingCombos.has(combo)) {
          seenText.add(speciesText)
          commodityOptions.push({
            value: combo,
            text: speciesText
          })
        }
      })
    })
    commodityOptions.sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }))
    const initialDataJson = JSON.stringify({
      commodity: req.session.data.commodity || '',
      commoditySpecies: req.session.data.commoditySpecies || [],
      commodityType: req.session.data.commodityType || 'domestic'
    })
    const fromHub = req.session.data.commodityFromHub
    const backHref = fromHub ? `${BASE}/create/commodity-hub` : null
    res.render('v1-experimental/create/commodity', {
      commodityOptions,
      initialDataJson,
      backHref
    })
  })

  router.post(`${BASE}/create/commodity`, (req, res) => {
    let commodity = req.session.data.commodity
    if (commodity && commodity.includes('|')) {
      const [c, s] = commodity.split('|')
      commodity = c
      req.session.data.commodity = c
      const existing = req.session.data.commoditySpecies || []
      if (s && !existing.includes(s)) {
        req.session.data.commoditySpecies = [s, ...existing]
      }
    }
    const errors = {}
    const errorList = []
    if (!commodity || commodity.trim() === '') {
      errors.commodity = 'Select a commodity, common name or species'
      errorList.push({ href: '#commodity', text: 'Select a commodity, common name or species' })
    }
    if (Object.keys(errors).length > 0) {
      req.session.data.errors = errors
      req.session.data.errorList = errorList
      return res.redirect(`${BASE}/create/commodity`)
    }
    const commoditiesData = require('../../data/commodities-eu.js')
    const details = commoditiesData[commodity]
    const speciesList = details && details.speciesByType
      ? Object.values(details.speciesByType).flat()
      : ((details && details.species) || [])
    let commodityType = req.session.data.commodityType || 'domestic'
    const preSelected = req.session.data.commoditySpecies
    const firstSpecies = Array.isArray(preSelected) ? preSelected[0] : preSelected
    if (details && details.speciesByType && firstSpecies) {
      const match = Object.entries(details.speciesByType).find(([, arr]) => arr && arr.includes(firstSpecies))
      if (match) commodityType = match[0].toLowerCase()
    }
    req.session.data.commodityType = commodityType
    delete req.session.data.errors
    delete req.session.data.errorList
    const fromHub = req.session.data.commodityFromHub
    const isEditing = req.session.data.commodityEditIndex !== undefined
    const hasSpeciesSelection = req.session.data.commoditySpecies &&
      (Array.isArray(req.session.data.commoditySpecies) ? req.session.data.commoditySpecies.length > 0 : !!req.session.data.commoditySpecies)
    const skipSpeciesPage = hasSpeciesSelection && !isEditing
    if (speciesList.length > 0 && !skipSpeciesPage) {
      res.redirect(`${BASE}/create/commodity-species`)
    } else if (fromHub) {
      res.redirect(`${BASE}/create/animal-identification`)
    } else {
      res.redirect(`${BASE}/create/origin`)
    }
  })

  router.get(`${BASE}/create/add-species`, (req, res) => {
    const commodity = req.query.commodity
    const index = req.query.index !== undefined ? parseInt(req.query.index, 10) : -1
    const commodities = req.session.data.commodities || []
    const item = index >= 0 && index < commodities.length ? commodities[index] : null
    if (!commodity) return res.redirect(`${BASE}/create/animal-identification`)
    req.session.data.commodity = commodity
    req.session.data.commoditySpecies = item ? [...(item.commoditySpecies || [])] : (req.session.data.commoditySpecies || [])
    req.session.data.commodityType = (item && item.commodityType) || req.session.data.commodityType || 'domestic'
    req.session.data.commodityFromHub = true
    req.session.data.addSpeciesFromAnimalId = true
    if (index >= 0) req.session.data.addSpeciesHubIndex = index
    res.redirect(`${BASE}/create/commodity-species`)
  })

  // === 1b. Species (always a separate page) ===
  router.get(`${BASE}/create/commodity-species`, (req, res) => {
    const commodity = req.session.data.commodity
    const commoditiesData = require('../../data/commodities-eu.js')
    const commodityDetails = commodity ? getCommodityDetailsForSpecies(commoditiesData, commodity) : null
    if (!commodityDetails) return res.redirect(`${BASE}/create/commodity`)

    if (req.query.from === 'animal-id') {
      req.session.data.addSpeciesFromAnimalId = true
      req.session.data.commodityFromHub = true
    }

    // When dropdown changes: update session and redirect
    const queryType = req.query.commodityType
    if (queryType && (queryType === 'domestic' || queryType === 'game')) {
      req.session.data.commodityType = queryType
      req.session.data.commoditySpecies = []
      const preserveFrom = req.session.data.addSpeciesFromAnimalId ? '?from=animal-id' : ''
      return res.redirect(`${BASE}/create/commodity-species${preserveFrom}`)
    }

    const commodityType = (req.session.data.commodityType || 'domestic').toLowerCase()
    const typeKey = commodityType === 'game' ? 'Game' : 'Domestic'
    const speciesByType = commodityDetails.speciesByType
    const species = speciesByType
      ? (speciesByType[typeKey] || [])
      : (commodityDetails.species || [])

    if (species.length === 0) {
      const fromHub = req.session.data.commodityFromHub
      const fromAnimalId = req.session.data.addSpeciesFromAnimalId
      return res.redirect((fromAnimalId || fromHub) ? `${BASE}/create/animal-identification` : `${BASE}/create/origin`)
    }
    if (species.length === 1 && (!req.session.data.commoditySpecies || req.session.data.commoditySpecies.length === 0)) {
      req.session.data.commoditySpecies = [species[0]]
    }
    const types = commodityDetails.commodityTypes || ['Domestic']
    const commodityTypeItems = types.map(t => ({ value: t.toLowerCase(), text: t }))
    const selectedSpecies = req.session.data.commoditySpecies || []
    const speciesTranslations = require('../../data/species-translations.js')
    const speciesItems = species.map(s => {
      const translation = speciesTranslations[s]
      const label = translation
        ? `${s} <span class="govuk-!-font-size-16">(${translation})</span>`
        : s
      return {
        value: s,
        html: label,
        checked: selectedSpecies.includes(s)
      }
    })
    const fromHub = req.session.data.commodityFromHub
    const backHref = req.session.data.addSpeciesFromAnimalId
      ? `${BASE}/create/animal-identification`
      : `${BASE}/create/commodity`
    res.render('v1-experimental/create/commodity-species', {
      commodityDetails,
      commodityTypeItems,
      speciesItems,
      backHref
    })
  })

  router.post(`${BASE}/create/commodity-species`, (req, res) => {
    const commodity = req.session.data.commodity
    let species = req.session.data.commoditySpecies
    if (species && !Array.isArray(species)) {
      species = [species]
    }
    const errors = {}
    const errorList = []
    if (!species || !Array.isArray(species) || species.length === 0) {
      errors.commoditySpecies = 'Select at least one species'
      errorList.push({ href: '#commoditySpecies', text: 'Select at least one species' })
    }
    if (Object.keys(errors).length > 0) {
      req.session.data.errors = errors
      req.session.data.errorList = errorList
      return res.redirect(`${BASE}/create/commodity-species`)
    }
    req.session.data.commodityType = req.session.data.commodityType || 'domestic'
    delete req.session.data.errors
    delete req.session.data.errorList
    const fromHub = req.session.data.commodityFromHub
    const hubIdx = req.session.data.addSpeciesHubIndex
    if (typeof hubIdx === 'number' && hubIdx >= 0) {
      const commodities = req.session.data.commodities || []
      if (commodities[hubIdx]) {
        commodities[hubIdx].commoditySpecies = species
        commodities[hubIdx].commodityType = req.session.data.commodityType
      }
      delete req.session.data.addSpeciesHubIndex
    }
    const returnToAnimalId = req.session.data.addSpeciesFromAnimalId
    delete req.session.data.addSpeciesFromAnimalId
    if (returnToAnimalId || fromHub) {
      res.redirect(`${BASE}/create/animal-identification`)
    } else {
      res.redirect(`${BASE}/create/origin`)
    }
  })

  // === 2. Origin ===
  router.get(`${BASE}/create/origin`, (req, res) => {
    delete req.session.data.errors
    delete req.session.data.errorList
    const commodity = req.session.data.commodity
    const commoditySpecies = req.session.data.commoditySpecies
    const hasSpecies = Array.isArray(commoditySpecies) ? commoditySpecies.length > 0 : !!commoditySpecies
    if (!commodity || !hasSpecies) {
      return res.redirect(`${BASE}/create/commodity`)
    }
    const euCountries = require('../../data/eu-countries.js')
    const euCountryCodes = require('../../data/eu-country-codes.js')
    const euuCountries = ['Iceland', 'Liechtenstein', 'Norway', 'Switzerland']
    const originCountries = [...euCountries, ...euuCountries].sort()
    const originCountryCodes = { ...euCountryCodes, Iceland: 'IS', Liechtenstein: 'LI', Norway: 'NO', Switzerland: 'CH' }
    res.render('v1-experimental/create/origin', {
      euCountries: originCountries,
      euCountryCodes: originCountryCodes
    })
  })

  router.post(`${BASE}/create/origin`, (req, res) => {
    const countryOfOrigin = req.session.data.countryOfOrigin
    const regionOfOriginRequired = req.session.data.regionOfOriginRequired
    const errors = {}
    const errorList = []
    if (!countryOfOrigin || countryOfOrigin.trim() === '') {
      errors.countryOfOrigin = 'Select a country'
      errorList.push({ href: '#countryOfOrigin', text: 'Select a country' })
    }
    if (!regionOfOriginRequired || regionOfOriginRequired.trim() === '') {
      errors.regionOfOriginRequired = 'Select if the consignment requires a region of origin code'
      errorList.push({ href: '#region-of-origin-1', text: 'Select if the consignment requires a region of origin code' })
    }
    if (Object.keys(errors).length > 0) {
      req.session.data.errors = errors
      req.session.data.errorList = errorList
      return res.redirect(`${BASE}/create/origin`)
    }
    const commodity = req.session.data.commodity
    const commoditySpecies = Array.isArray(req.session.data.commoditySpecies)
      ? req.session.data.commoditySpecies
      : (req.session.data.commoditySpecies ? [req.session.data.commoditySpecies] : [])
    if (!commodity || commoditySpecies.length === 0) {
      return res.redirect(`${BASE}/create/commodity`)
    }
    req.session.data.commodity = commodity
    req.session.data.commoditySpecies = commoditySpecies
    delete req.session.data.errors
    delete req.session.data.errorList
    res.redirect(`${BASE}/create/animal-identification`)
  })

  function normalizeCommoditySpecies (val) {
    if (Array.isArray(val)) return val
    if (val && typeof val === 'string') return [val]
    return []
  }

  // === 3. Commodity quantities (replaced by animal-identification) ===
  router.get(`${BASE}/create/commodity-quantities`, (req, res) => {
    res.redirect(`${BASE}/create/animal-identification`)
  })

  router.post(`${BASE}/create/commodity-quantities`, (req, res) => {
    res.redirect(`${BASE}/create/animal-identification`)
  })

  // === 4. Commodity hub ===
  router.get(`${BASE}/create/commodity-hub`, (req, res) => {
    const { items, totalAnimals, totalPackages } = buildCommoditiesForHub(req)
    res.render('v1-experimental/create/commodity-hub', {
      commodities: items,
      totalAnimals,
      totalPackages,
      backHref: items.length > 0 ? `${BASE}/create/commodity-hub-back` : `${BASE}/create/commodity`
    })
  })

  router.get(`${BASE}/create/commodity-hub-back`, (req, res) => {
    const commodities = req.session.data.commodities || []
    if (commodities.length === 0) return res.redirect(`${BASE}/create/commodity-hub`)
    const first = commodities[0]
    req.session.data.commodity = first.commodity
    req.session.data.commoditySpecies = [...(first.commoditySpecies || [])]
    req.session.data.commodityType = first.commodityType || 'domestic'
    req.session.data.commodityFromHub = false
    req.session.data.commodityEditIndex = undefined
    Object.keys(req.session.data).filter(k => k.startsWith('quantity_') || k.startsWith('packages_') || k.startsWith('animalCount_') || k.startsWith('numberOfPackages_')).forEach(k => delete req.session.data[k])
    if (first.quantities) Object.assign(req.session.data, first.quantities)
    res.redirect(`${BASE}/create/animal-identification`)
  })

  router.get(`${BASE}/create/commodity-add`, (req, res) => {
    clearCommoditySession(req.session.data)
    req.session.data.commodityFromHub = true
    req.session.data.commodityEditIndex = undefined
    delete req.session.data.errors
    delete req.session.data.errorList
    res.redirect(`${BASE}/create/commodity`)
  })

  router.get(`${BASE}/create/commodity-edit/:index`, (req, res) => {
    const idx = parseInt(req.params.index, 10)
    const commodities = req.session.data.commodities || []
    const item = commodities[idx]
    if (!item) return res.redirect(`${BASE}/create/commodity-hub`)
    req.session.data.commodity = item.commodity
    req.session.data.commoditySpecies = [...(item.commoditySpecies || [])]
    req.session.data.commodityType = item.commodityType || 'domestic'
    req.session.data.commodityEditIndex = idx
    req.session.data.commodityFromHub = true
    Object.keys(req.session.data).filter(k => k.startsWith('quantity_') || k.startsWith('packages_') || k.startsWith('animalCount_') || k.startsWith('numberOfPackages_')).forEach(k => delete req.session.data[k])
    if (item.quantities) {
      Object.assign(req.session.data, item.quantities)
      ;(item.commoditySpecies || []).forEach(s => {
        const key = s.replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '')
        const qty = item.quantities[`quantity_${key}`]
        if (qty !== undefined) req.session.data[`animalCount_${key}`] = qty
        const pkg = item.quantities[`packages_${key}`]
        if (pkg !== undefined) req.session.data[`numberOfPackages_${key}`] = pkg
      })
    }
    delete req.session.data.errors
    delete req.session.data.errorList
    res.redirect(`${BASE}/create/animal-identification`)
  })

  router.get(`${BASE}/create/commodity-remove/:index`, (req, res) => {
    const idx = parseInt(req.params.index, 10)
    const commodities = req.session.data.commodities || []
    if (idx >= 0 && idx < commodities.length) {
      req.session.data.commodities = commodities.filter((_, i) => i !== idx)
    }
    res.redirect(`${BASE}/create/commodity-hub`)
  })

  router.get(`${BASE}/create/commodity-hub-continue`, (req, res) => {
    const data = req.session.data || {}
    if (!syncFirstCommodityToSession(data)) {
      return res.redirect(`${BASE}/create/commodity-hub`)
    }
    if (!data.importType) data.importType = 'live-animals'
    if (!data.importReason) data.importReason = 'internal-market'
    if (!data.internalMarketPurpose) data.internalMarketPurpose = 'breeding'
    res.redirect(`${BASE}/create/additional-animal-details`)
  })

  router.get(`${BASE}/create/import-type`, (req, res) => {
    res.redirect(`${BASE}/create/commodity-hub`)
  })

  // Post-hub routes (animal-identification through confirmation)
  const { registerPostHubRoutes } = require('./post-hub-routes.js')
  registerPostHubRoutes(router, BASE)

  // Prefill for quick testing
  router.get(`${BASE}/create/commodity-prefill`, (req, res) => {
    req.session.data.commodity = 'Cow'
    req.session.data.commoditySpecies = ['Bos taurus']
    req.session.data.commodityType = 'domestic'
    delete req.session.data.errors
    delete req.session.data.errorList
    res.redirect(`${BASE}/create/commodity`)
  })

  router.get(`${BASE}/create/commodity-species-prefill`, (req, res) => {
    const commodity = req.session.data.commodity || 'Cow'
    const commoditiesData = require('../../data/commodities-eu.js')
    const details = commoditiesData[commodity]
    if (!details || !details.species || details.species.length === 0) {
      req.session.data.commodity = 'Cow'
    }
    req.session.data.commodity = req.session.data.commodity || 'Cow'
    req.session.data.commoditySpecies = ['Bos taurus']
    req.session.data.commodityType = 'domestic'
    delete req.session.data.errors
    delete req.session.data.errorList
    const fromHub = req.session.data.commodityFromHub
    const fromAnimalId = req.session.data.addSpeciesFromAnimalId
    res.redirect((fromAnimalId || fromHub) ? `${BASE}/create/animal-identification` : `${BASE}/create/origin`)
  })

  router.get(`${BASE}/create/origin-prefill`, (req, res) => {
    req.session.data.countryOfOrigin = 'France'
    req.session.data.regionOfOriginRequired = 'no'
    delete req.session.data.errors
    delete req.session.data.errorList
    res.redirect(`${BASE}/create/animal-identification`)
  })

  router.get(`${BASE}/create/commodity-quantities-prefill`, (req, res) => {
    const commodity = req.session.data.commodity
    const commoditySpecies = req.session.data.commoditySpecies || []
    if (!commodity || commoditySpecies.length === 0) {
      return res.redirect(`${BASE}/create/commodity`)
    }
    commoditySpecies.forEach(s => {
      const key = s.replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '')
      req.session.data[`animalCount_${key}`] = '10'
      req.session.data[`quantity_${key}`] = '10'
      req.session.data[`numberOfPackages_${key}`] = '1'
      req.session.data[`packages_${key}`] = '1'
    })
    delete req.session.data.errors
    delete req.session.data.errorList
    res.redirect(`${BASE}/create/animal-identification`)
  })
}
