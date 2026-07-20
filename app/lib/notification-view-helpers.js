//
// Resolve dashboard notifications for view / amend / delete
//

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function ukLongDateToIso (str) {
  if (!str || typeof str !== 'string') return ''
  const m = str.trim().match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/)
  if (!m) return ''
  const d = parseInt(m[1], 10)
  const monthIndex = MONTHS.findIndex(x => x.toLowerCase() === m[2].toLowerCase())
  if (monthIndex < 0) return ''
  const y = parseInt(m[3], 10)
  const mo = String(monthIndex + 1).padStart(2, '0')
  const day = String(d).padStart(2, '0')
  return `${y}-${mo}-${day}`
}

function parseCommodityFromDashboardLabel (label) {
  if (!label || typeof label !== 'string') return { commodityKey: null, speciesName: null, code: null }
  const trimmed = label.trim()
  const paren = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (!paren) return { commodityKey: null, speciesName: null, code: null }
  const inner = paren[2].trim()
  const speciesCandidate = paren[1].trim()
  const codeMatch = inner.match(/^\d/)
  if (codeMatch) {
    const code = inner.replace(/\s/g, '')
    const commoditiesEu = require('../data/commodities-eu.js')
    const speciesName = speciesCandidate
    const candidates = []
    for (const [key, det] of Object.entries(commoditiesEu)) {
      if (!det || String(det.code).replace(/\s/g, '') !== code) continue
      const typeSpecies = det.speciesByType ? [...new Set(Object.values(det.speciesByType).flat())] : []
      const list = (det.species && det.species.length) ? det.species : typeSpecies
      const speciesOk = list.includes(speciesCandidate)
      const nameMatch = det.commonName && String(det.commonName).toLowerCase() === String(speciesCandidate).toLowerCase()
      candidates.push({ key, speciesOk, nameMatch })
    }
    const best = candidates.find(c => c.speciesOk) || candidates.find(c => c.nameMatch) || candidates[0]
    const commodityKey = best ? best.key : null
    return { commodityKey, speciesName, code }
  }
  return { commodityKey: null, speciesName: speciesCandidate, code: null }
}

function getRemovedRefSet (data) {
  const arr = data.removedNotificationReferences
  if (!Array.isArray(arr)) return new Set()
  return new Set(arr)
}

function findNotificationRow (reference, data, notificationsStatic) {
  const ref = (reference || '').trim()
  if (!ref) return null
  const removed = getRemovedRefSet(data)
  if (removed.has(ref)) return null

  const draftRef = (data.draftNotificationReference || '').trim()
  if (draftRef === ref && data.taskListUnlocked) {
    return { row: null, kind: 'session-draft' }
  }

  const submitted = data.submittedNotifications || []
  const sub = submitted.find(n => n.reference === ref)
  if (sub) return { row: sub, kind: 'submitted' }

  const st = notificationsStatic.find(n => n.reference === ref)
  if (st) return { row: st, kind: 'static' }

  return null
}

function preserveForNotificationListMutation (data) {
  const preserved = {}
  if (Array.isArray(data.submittedNotifications)) {
    preserved.submittedNotifications = data.submittedNotifications
  }
  if (Array.isArray(data.removedNotificationReferences)) {
    preserved.removedNotificationReferences = [...data.removedNotificationReferences]
  }
  ;['filterKeyword', 'filterCommodity', 'filterOrigin', 'filterConsignee', 'filterDestination', 'filterStatus', 'filterStartDate', 'filterEndDate', 'filterPeriod', 'sort'].forEach(k => {
    const v = data[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      preserved[k] = v
    }
  })
  return preserved
}

function seedSessionFromDashboardRow (data, row, reference) {
  const ref = (reference || '').trim()
  const commoditiesEu = require('../data/commodities-eu.js')
  const parsed = parseCommodityFromDashboardLabel(row.commodity)
  let species = parsed.speciesName || 'Bos taurus'
  const key = parsed.commodityKey || 'Cow'
  const det = commoditiesEu[key]
  if (det) {
    const typeSpecies = det.speciesByType ? [...new Set(Object.values(det.speciesByType).flat())] : []
    const list = (det.species && det.species.length) ? det.species : typeSpecies
    if (list.length && !list.includes(species)) {
      species = list[0]
    }
  }
  const toKey = (s) => String(s || '').replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '')
  const spKey = toKey(species)

  Object.assign(data, {
    importType: 'live-animals',
    commodities: [{
      commodity: key,
      commoditySpecies: [species],
      commodityType: 'domestic',
      quantities: { [`quantity_${spKey}`]: 1, [`packages_${spKey}`]: 1 }
    }],
    commodity: key,
    commoditySpecies: [species],
    commodityType: 'domestic',
    countryOfOrigin: row.origin || '',
    consigneeName: row.consignee || '',
    consignorName: row.consignor || '',
    arrivalDate: ukLongDateToIso(row.arrival) || '',
    taskListUnlocked: true,
    draftNotificationReference: ref
  })
  Object.keys(data).filter(k => k.startsWith('quantity_') && k !== `quantity_${spKey}`).forEach(k => delete data[k])
  Object.keys(data).filter(k => k.startsWith('packages_') && k !== `packages_${spKey}`).forEach(k => delete data[k])
  Object.keys(data).filter(k => k.startsWith('animalCount_')).forEach(k => delete data[k])
  Object.keys(data).filter(k => k.startsWith('numberOfPackages_')).forEach(k => delete data[k])
  data[`animalCount_${spKey}`] = 1
  data[`numberOfPackages_${spKey}`] = 1
}

function toSpeciesKey (s) {
  return String(s || '').replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '')
}

function stripLivestockIdentificationFields (session) {
  Object.keys(session).forEach((k) => {
    if (/^(animalCount_|earTag_|passport_|numberOfPackages_)/.test(k)) delete session[k]
  })
}

function resolveEuCommodityKeyForDashboardRow (parsed, commoditiesEu) {
  let key = parsed.commodityKey
  const codeNorm = String(parsed.code || '').replace(/\s/g, '')
  if (key === 'Cattle' && parsed.speciesName === 'Bos taurus' && commoditiesEu.Cow) {
    key = 'Cow'
  }
  if (!key || !commoditiesEu[key]) {
    if (codeNorm) {
      const matches = Object.keys(commoditiesEu).filter((k) => {
        const d = commoditiesEu[k]
        return d && String(d.code).replace(/\s/g, '') === codeNorm
      })
      if (matches.length === 1) {
        key = matches[0]
      } else if (matches.length > 1) {
        if (codeNorm === '0102' && parsed.speciesName === 'Bos taurus' && matches.includes('Cow')) {
          key = 'Cow'
        } else if (parsed.speciesName) {
          const withSpecies = matches.filter((k) => {
            const d = commoditiesEu[k]
            const list = d.speciesByType
              ? [...new Set(Object.values(d.speciesByType).flat())]
              : (d.species || [])
            return list.includes(parsed.speciesName)
          })
          key = (withSpecies.length === 1 ? withSpecies[0] : null) || (matches.includes('Cow') ? 'Cow' : matches[0])
        } else {
          key = matches.includes('Cow') ? 'Cow' : matches[0]
        }
      }
    }
  }
  return key && commoditiesEu[key] ? key : null
}

function applyDashboardCommodityToFullViewCopy (copy, row) {
  if (!row || !row.commodity || typeof row.commodity !== 'string') return
  const commoditiesEu = require('../data/commodities-eu.js')
  const parsed = parseCommodityFromDashboardLabel(row.commodity.trim())
  const key = resolveEuCommodityKeyForDashboardRow(parsed, commoditiesEu)
  if (!key) return
  const det = commoditiesEu[key]
  if (!det) return

  const speciesList = det.speciesByType
    ? [...new Set(Object.values(det.speciesByType).flat())]
    : (det.species || [])
  let species = parsed.speciesName
  if (speciesList.length) {
    if (!species || !speciesList.includes(species)) {
      species = speciesList[0]
    }
  } else if (!species) {
    species = 'Bos taurus'
  }

  const spKey = toSpeciesKey(species)
  stripLivestockIdentificationFields(copy)

  const count = 4
  const packages = 2
  copy.commodity = key
  copy.commoditySpecies = [species]
  copy.commodityType = 'domestic'
  copy.commodities = [{
    commodity: key,
    commoditySpecies: [species],
    commodityType: 'domestic',
    quantities: { [`quantity_${spKey}`]: count, [`packages_${spKey}`]: packages }
  }]
  copy[`animalCount_${spKey}`] = count

  const passportPrefix = /equus/i.test(species) ? 'EU-EQU' : 'EU-BOV'
  for (let i = 1; i <= count; i++) {
    copy[`earTag_${spKey}_${i}`] = `FI-LT-${String(302210 + i).padStart(6, '0')}`
    copy[`passport_${spKey}_${i}`] = `${passportPrefix}-${String(442200 + i).padStart(5, '0')}`
  }
}

function parsePlantCommodityFromDashboardLabel (label) {
  if (!label || typeof label !== 'string') return { commonName: null, eppoCode: null }
  const trimmed = label.trim()
  const paren = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/)
  if (!paren) return { commonName: trimmed || null, eppoCode: null }
  return { commonName: paren[1].trim(), eppoCode: paren[2].trim() }
}

function applyDashboardCommodityToFullViewCopyForPlant (copy, row) {
  if (!row || !row.commodity || typeof row.commodity !== 'string') return
  const commoditiesPlants = require('../data/commodities-plants.js')
  const parsed = parsePlantCommodityFromDashboardLabel(row.commodity.trim())
  const det = parsed.commonName ? commoditiesPlants[parsed.commonName] : null
  if (!det) return
  copy.plantCommodities = [{
    commonName: det.commonName,
    eppoCode: det.eppoCode,
    productType: det.productType,
    packagingMaterial: det.packagingMaterial,
    quantity: 500,
    packageCount: 20,
    netWeight: '120kg'
  }]
}

function buildFullViewSessionMockFromNotificationRow (row) {
  const isPlant = !!row && row.type === 'CHED PP'
  const base = isPlant
    ? require('../data/notification-full-view-mock-plant.js')
    : require('../data/notification-full-view-mock.js')
  const copy = JSON.parse(JSON.stringify(base))
  if (!row || typeof row !== 'object') return copy
  copy.documents = Array.isArray(row.documents)
    ? JSON.parse(JSON.stringify(row.documents))
    : []
  if (row.origin) {
    copy.countryOfOrigin = row.origin
    if (isPlant) copy.countryOfDispatch = row.origin
  }
  if (row.consignor) copy.consignorName = row.consignor
  if (row.consignee) {
    copy.consigneeName = row.consignee
    copy.importerName = row.consignee
    const short = String(row.consignee).replace(/\s+Ltd$/i, '').trim()
    copy.placeOfDestinationName = isPlant ? `${short} distribution centre` : `${short} finishing unit`
  }
  const iso = row.arrival ? ukLongDateToIso(row.arrival) : ''
  if (iso) copy.arrivalDate = iso
  if (isPlant) {
    applyDashboardCommodityToFullViewCopyForPlant(copy, row)
  } else {
    applyDashboardCommodityToFullViewCopy(copy, row)
  }
  return copy
}

// Builds the same shape of read-only view data as buildCheckYourAnswersData()
// (app/views/v1-baseline/post-hub-routes.js) but for CHED PP (plants/plant products).
// Deliberately a separate, self-contained function rather than a branch inside
// buildCheckYourAnswersData: that function is deeply animal-specific (ear tag/microchip/
// passport identification shapes per species) and shared with the real v1-baseline create
// journey, which only ever produces CHED-A-shaped notifications -- keeping this fully
// separate means the plant view can evolve without any risk to that journey.
function buildPlantNotificationViewData (data, base) {
  const row = (key, value) => ({ key: { text: key }, value: { text: value } })
  const rowHtml = (key, html) => ({ key: { text: key }, value: { html } })
  const escapeHtml = (s) => typeof s !== 'string' ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const formatAddressHtml = (name, address, country) => {
    const parts = []
    if (name) parts.push(`<strong>${escapeHtml(name)}</strong>`)
    const addrLines = Array.isArray(address) ? address.filter(Boolean) : (address ? String(address).split(',').map(s => s.trim()).filter(Boolean) : [])
    addrLines.forEach(line => parts.push(escapeHtml(line)))
    if (country) parts.push(escapeHtml(country))
    return parts.length ? parts.join('<br>') : 'Not provided'
  }
  const documentTypes = require('../data/document-types.js')
  const getDocumentTypeLabel = (val) => (documentTypes.find(d => d.value === val) || {}).text || val || 'Not provided'
  const { getBorderPortLabel } = require('../data/uk-border-ports.js')

  const formatDate = (isoDate) => {
    if (!isoDate || typeof isoDate !== 'string') return isoDate || 'Not provided'
    const [y, m, d] = isoDate.split('-').map(Number)
    if (!y || !m || !d) return isoDate
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${d} ${months[m - 1]} ${y}`
  }

  const originRows = [
    row('Country of origin', data.countryOfOrigin || 'Not provided'),
    row('Country of dispatch', data.countryOfDispatch || 'Not provided')
  ]
  const refNum = (data.consignmentReference || '').trim()
  if (refNum) originRows.push(row('Your internal reference number', refNum))

  const plantCommodities = Array.isArray(data.plantCommodities) ? data.plantCommodities : []
  const plantCommodityCards = plantCommodities.map((c) => ({
    commonName: c.commonName || 'Not provided',
    eppoCode: c.eppoCode || 'Not provided',
    productType: c.productType || 'Not provided',
    packagingMaterial: c.packagingMaterial || 'Not provided',
    quantitySummaryRows: [
      row('Product type', c.productType || 'Not provided'),
      row('Quantity', c.quantity != null ? String(c.quantity) : 'Not provided'),
      row('Number of packages', c.packageCount != null ? String(c.packageCount) : 'Not provided'),
      row('Net weight', c.netWeight || 'Not provided'),
      row('Packaging material', c.packagingMaterial || 'Not provided')
    ]
  }))

  const wpmItems = Array.isArray(data.wpm) ? data.wpm : []
  const wpmRows = wpmItems.map((w) => [
    { text: w.description || 'Not provided' },
    { text: w.eppoCode || 'Not provided' },
    { text: w.count != null ? String(w.count) : 'Not provided' },
    { text: w.countryOfOrigin || 'Not provided' },
    { text: w.ispm15Marked || 'Not provided' }
  ])

  const consignorAddr = formatAddressHtml(data.consignorName, data.consignorAddress, data.consignorCountry)
  const consigneeAddr = formatAddressHtml(
    data.consigneeName,
    [data.consigneeAddressLine1, data.consigneeAddressLine2, data.consigneeTown, data.consigneePostcode].filter(Boolean),
    null
  )
  const importerAddr = formatAddressHtml(
    data.importerName,
    [data.importerAddressLine1, data.importerAddressLine2, data.importerTown, data.importerPostcode].filter(Boolean),
    data.importerCountry
  )
  const placeAddr = formatAddressHtml(
    data.placeOfDestinationName,
    [data.placeOfDestinationAddressLine1, data.placeOfDestinationAddressLine2, data.placeOfDestinationTown, data.placeOfDestinationPostcode].filter(Boolean),
    data.placeOfDestinationCountry
  )
  const addressRows = [
    rowHtml('Consignor', consignorAddr),
    rowHtml('Consignee', consigneeAddr),
    rowHtml('Importer', importerAddr),
    rowHtml('Place of destination', placeAddr)
  ]

  const transporterAddrHtml = formatAddressHtml(
    null,
    [data.transporterAddressLine1, data.transporterAddressLine2, data.transporterTown, data.transporterPostcode].filter(Boolean),
    data.transporterCountry
  )
  const transportAndArrivalRows = [
    row('Transporter name', data.transporterName || 'Not provided'),
    rowHtml('Transporter address', transporterAddrHtml),
    row('Type', data.transporterType || 'Not provided'),
    row('Approval number', data.transporterApprovalNumber || 'Not provided'),
    row('Port of entry', getBorderPortLabel(data.ukBorderPort)),
    row('Arrival date at destination', formatDate(data.arrivalDate))
  ]

  const docs = data.documents || []
  const cell = (t) => ({ text: String(t ?? '-') })
  const hasUploadedDocs = docs.some(d => d && String(d.type || '').trim() !== '')
  let documentsTableRows = docs.filter(d => d.type).map(d => [
    cell(getDocumentTypeLabel(d.type)),
    cell(d.reference),
    cell(d.date ? formatDate(d.date) : '-'),
    cell((d.attachments && d.attachments.length) ? `${d.attachments.length} attachment${d.attachments.length !== 1 ? 's' : ''}` : '-')
  ])
  if (documentsTableRows.length === 0) {
    documentsTableRows = [[cell('Not yet added'), cell('–'), cell('–'), cell('–')]]
  }

  const notificationDateCreatedRaw = (data.notificationDateCreated != null && data.notificationDateCreated !== '')
    ? String(data.notificationDateCreated).trim()
    : ''

  return {
    originRows,
    plantCommodityCards,
    wpmRows,
    addressRows,
    transportAndArrivalRows,
    documentsTableRows,
    accompanyingDocumentsNotYetAdded: !hasUploadedDocs,
    isPlantDeclaration: true,
    isLivestockConsignment: false,
    isPetConsignment: false,
    notificationDateCreatedDisplay: notificationDateCreatedRaw
  }
}

function deleteNotificationByReference (reference, data, notificationsStatic) {
  const ref = (reference || '').trim()
  const found = findNotificationRow(ref, data, notificationsStatic)
  if (!found) return { ok: false }

  if (found.kind === 'session-draft') {
    return { ok: true, mode: 'session-draft' }
  }

  if (found.kind === 'submitted') {
    data.submittedNotifications = (data.submittedNotifications || []).filter(n => n.reference !== ref)
    return { ok: true, mode: 'submitted' }
  }

  if (found.kind === 'static') {
    if (!Array.isArray(data.removedNotificationReferences)) data.removedNotificationReferences = []
    if (!data.removedNotificationReferences.includes(ref)) {
      data.removedNotificationReferences.push(ref)
    }
    return { ok: true, mode: 'static' }
  }

  return { ok: false }
}

module.exports = {
  ukLongDateToIso,
  parseCommodityFromDashboardLabel,
  getRemovedRefSet,
  findNotificationRow,
  preserveForNotificationListMutation,
  seedSessionFromDashboardRow,
  buildFullViewSessionMockFromNotificationRow,
  buildPlantNotificationViewData,
  deleteNotificationByReference
}
