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

function buildFullViewSessionMockFromNotificationRow (row) {
  const base = require('../data/notification-full-view-mock.js')
  const copy = JSON.parse(JSON.stringify(base))
  if (!row || typeof row !== 'object') return copy
  if (row.origin) copy.countryOfOrigin = row.origin
  if (row.consignor) copy.consignorName = row.consignor
  if (row.consignee) {
    copy.consigneeName = row.consignee
    copy.importerName = row.consignee
    const short = String(row.consignee).replace(/\s+Ltd$/i, '').trim()
    copy.placeOfDestinationName = `${short} finishing unit`
  }
  const iso = row.arrival ? ukLongDateToIso(row.arrival) : ''
  if (iso) copy.arrivalDate = iso
  return copy
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
  deleteNotificationByReference
}
