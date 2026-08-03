//
// View-model builder for the intro journey's "dashboard two" design exploration
// (app/views/intro/dashboard-two.html). Reuses the same notifications-intro.js
// dataset as the existing /intro/dashboard, enriched with the extra fields this
// layout needs (notification type label, status text, inspection flag) since
// those aren't part of the shared registerDashboardRoutes() model.
//

const { parseArrivalDate, getDateRangeForFilterPeriod, arrivalMatchesFilterRange } = require('./dashboard.js')

const STATUS_CYCLE = ['Completed', 'Submitted', 'Action required']
const PER_PAGE = 6

function toYyyyMmDd (d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// "By date" quick presets on the dashboard-two additional filters panel -- these
// look forward from today (upcoming arrivals) rather than the backward-looking
// "last N days" presets getDateRangeForFilterPeriod handles for other dashboards.
function getDateRangeForDatePreset (preset, now = new Date()) {
  if (!preset) return null
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start)
  switch (preset) {
    case 'today':
      return { filterStartDate: toYyyyMmDd(start), filterEndDate: toYyyyMmDd(end) }
    case 'tomorrow':
      start.setDate(start.getDate() + 1)
      end.setDate(end.getDate() + 1)
      return { filterStartDate: toYyyyMmDd(start), filterEndDate: toYyyyMmDd(end) }
    case 'next-7-days':
      end.setDate(end.getDate() + 7)
      return { filterStartDate: toYyyyMmDd(start), filterEndDate: toYyyyMmDd(end) }
    default:
      return null
  }
}

// GBN PP and GBN NNS have no sourced field spec of their own (see
// .claude/knowledge/decisions/gbn-types-reuse-existing-shapes.md) so they render
// through the same plant-shaped card/view as CHED PP. GBN IUU has no spec either,
// but its subject matter (marine catch) doesn't fit the "Plants"/"Live animals"
// label, so it gets its own label while still reusing the animal-shaped data.
const PLANT_TYPES = ['CHED PP', 'GBN PP', 'GBN NNS']
const MARINE_TYPES = ['GBN IUU']
// CHED A and GBN AG are the only types sourced as individual-animal-identifier /
// welfare-outcome shaped (see .claude/knowledge/reference/ched-all-types-field-inventory.md).
// CHED-D and CHED-P are weight/quantity-based with no per-animal tracking at all -- an
// explicit allow-list here (rather than "everything not plant/marine is an animal")
// stops a future CHED-D/CHED-P row from silently being shown a fabricated animal count.
const ANIMAL_TYPES = ['CHED A', 'GBN AG']

function typeLabelFor (row) {
  if (PLANT_TYPES.includes(row.type)) return 'Plants'
  if (MARINE_TYPES.includes(row.type)) return 'Marine fish'
  if (ANIMAL_TYPES.includes(row.type)) return 'Live animals'
  console.warn(`dashboard-two: unrecognised notification type "${row.type}" (reference ${row.reference}) -- add it to PLANT_TYPES/MARINE_TYPES/ANIMAL_TYPES in app/lib/dashboard-two.js instead of letting it fall through`)
  return 'Other'
}

function numberOfAnimalsFor (row, index) {
  if (!ANIMAL_TYPES.includes(row.type)) return null
  const digits = row.reference.replace(/\D/g, '')
  return ((parseInt(digits.slice(-2), 10) || 0) + index) % 30 + 2
}

function enrichRow (row, index, basePath, viewPath) {
  const typeLabel = typeLabelFor(row)
  const statusText = STATUS_CYCLE[index % STATUS_CYCLE.length]
  return {
    ...row,
    typeLabel,
    statusText,
    hasError: statusText === 'Action required',
    inspectionRequired: typeLabel === 'Plants' && index % 2 === 0,
    numberOfAnimals: numberOfAnimalsFor(row, index),
    // `from` tells the read-only notification view which dashboard variant to send
    // the "Back" link to -- see viewBackLinkHref in app/routes.js.
    viewHref: `${basePath}/notification/${encodeURIComponent(row.reference)}?from=${encodeURIComponent(viewPath)}`
  }
}

function buildPaginationItems (page, totalPages, buildHref) {
  if (totalPages <= 1) return null
  const windowStart = Math.max(1, Math.min(page - 1, totalPages - 2))
  const windowEnd = Math.min(totalPages, windowStart + 2)
  const items = []
  for (let i = windowStart; i <= windowEnd; i++) {
    items.push({ number: i, href: buildHref(i), current: i === page })
  }
  return {
    items,
    previous: page > 1 ? { href: buildHref(page - 1), text: 'Previous page' } : null,
    next: page < totalPages ? { href: buildHref(page + 1), text: 'Next page' } : null
  }
}

function buildDashboardTwoViewData (notifications, query, basePath, viewPath = 'dashboard-two') {
  const enriched = notifications.map((row, index) => enrichRow(row, index, basePath, viewPath))

  const filterKeyword = (query.filterKeyword || '').trim()
  const filterActionNeeded = query.filterActionNeeded || ''
  const filterStatusChange = query.filterStatusChange || ''
  const filterOrigin = (query.filterOrigin || '').trim()
  const filterDestination = (query.filterDestination || '').trim()
  const filterStatus = query.filterStatus || ''
  const filterNotificationType = query.filterNotificationType || ''
  const filterPeriod = query.filterPeriod || ''
  const filterDatePreset = query.filterDatePreset || ''
  const sort = query.sort === 'arrival-asc' ? 'arrival-asc' : 'arrival-desc'

  // A quick date preset overrides any manually-entered start/end date, matching
  // the behaviour of the main /intro/dashboard filter panel.
  const dateRange = getDateRangeForDatePreset(filterDatePreset) || getDateRangeForFilterPeriod(filterPeriod)
  const filterStartDate = dateRange ? dateRange.filterStartDate : (query.filterStartDate || '').trim()
  const filterEndDate = dateRange ? dateRange.filterEndDate : (query.filterEndDate || '').trim()

  let filtered = enriched
  const keyword = filterKeyword.toLowerCase()
  if (keyword) {
    filtered = filtered.filter(n =>
      `${n.reference} ${n.commodity} ${n.origin} ${n.consignee} ${n.consignor}`.toLowerCase().includes(keyword)
    )
  }
  if (filterOrigin) {
    filtered = filtered.filter(n => n.origin.toLowerCase().includes(filterOrigin.toLowerCase()))
  }
  if (filterStatus) {
    filtered = filtered.filter(n => n.statusText === filterStatus)
  }
  if (filterNotificationType) {
    filtered = filtered.filter(n => n.typeLabel === filterNotificationType)
  }
  if (filterStartDate || filterEndDate) {
    filtered = filtered.filter(n => arrivalMatchesFilterRange(n.arrival, filterStartDate, filterEndDate))
  }
  if (filterActionNeeded === 'today') {
    filtered = filtered.filter(n => n.hasError)
  } else if (filterActionNeeded === 'next-3-days' || filterActionNeeded === 'already-delayed') {
    filtered = []
  }
  if (filterStatusChange === 'last-3-days') {
    filtered = filtered.filter(n => n.statusText === 'Completed')
  } else if (filterStatusChange === 'last-24-hours') {
    filtered = []
  }

  const sorted = [...filtered].sort((a, b) => {
    const ta = parseArrivalDate(a.arrival) || 0
    const tb = parseArrivalDate(b.arrival) || 0
    return sort === 'arrival-asc' ? ta - tb : tb - ta
  })

  const totalResults = sorted.length
  const totalPages = Math.max(1, Math.ceil(totalResults / PER_PAGE))
  const page = Math.min(Math.max(1, parseInt(query.page, 10) || 1), totalPages)
  const start = (page - 1) * PER_PAGE
  const paginated = sorted.slice(start, start + PER_PAGE)

  const persistedParams = {
    filterKeyword,
    filterActionNeeded,
    filterStatusChange,
    sort,
    filterOrigin,
    filterDestination,
    filterStatus,
    filterNotificationType,
    filterPeriod,
    filterDatePreset,
    filterStartDate,
    filterEndDate
  }
  const buildHref = (targetPage) => {
    const params = Object.entries(persistedParams)
      .filter(([, v]) => v)
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    params.push(`page=${targetPage}`)
    return `${basePath}/${viewPath}?${params.join('&')}`
  }

  const glance = {
    actionNeeded: enriched.filter(n => n.hasError).length,
    statusChange: enriched.filter(n => n.statusText === 'Completed').length,
    inspection: enriched.filter(n => n.inspectionRequired).length
  }

  const euCountries = require('../data/eu-countries.js')
  const euuCountries = ['Iceland', 'Liechtenstein', 'Norway', 'Switzerland']
  const originsFromData = [...new Set(enriched.map(n => n.origin).filter(Boolean))]
  const originCountries = [...new Set([...euCountries, ...euuCountries, ...originsFromData])].sort()

  // "By type" and "Status" filter options are built from the labels actually shown
  // on the notification cards (typeLabel, statusText) rather than the underlying
  // raw type code / draft-submitted status fields, so the dropdown values always
  // match what a user can see on the page.
  const TYPE_LABEL_ORDER = ['Live animals', 'Plants', 'Marine fish', 'Other']
  const presentTypeLabels = new Set(enriched.map(n => n.typeLabel))
  const notificationTypeItems = [{ value: '', text: 'All' }].concat(
    TYPE_LABEL_ORDER.filter(label => presentTypeLabels.has(label)).map(label => ({ value: label, text: label }))
  )

  const presentStatuses = new Set(enriched.map(n => n.statusText))
  const notificationStatusItems = [{ value: '', text: 'All' }].concat(
    STATUS_CYCLE.filter(status => presentStatuses.has(status)).map(status => ({ value: status, text: status }))
  )

  return {
    notifications: paginated,
    totalResults,
    rangeStart: totalResults === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + PER_PAGE, totalResults),
    pagination: buildPaginationItems(page, totalPages, buildHref),
    glance,
    filterCounts: {
      today: glance.actionNeeded,
      next3Days: 0,
      alreadyDelayed: 0,
      last24Hours: 0,
      last3Days: glance.statusChange
    },
    filterKeyword,
    filterActionNeeded,
    filterStatusChange,
    filterOrigin,
    filterDestination,
    filterStatus,
    filterNotificationType,
    filterPeriod,
    filterDatePreset,
    filterStartDate,
    filterEndDate,
    originCountries,
    notificationTypeItems,
    notificationStatusItems,
    sort
  }
}

module.exports = { buildDashboardTwoViewData }
