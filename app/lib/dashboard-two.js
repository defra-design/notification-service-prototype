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

// GBN PP and GBN NNS have no sourced field spec of their own (see
// .claude/knowledge/decisions/gbn-types-reuse-existing-shapes.md) so they render
// through the same plant-shaped card/view as CHED PP. GBN IUU has no spec either,
// but its subject matter (marine catch) doesn't fit the "Plants"/"Live animals"
// label, so it gets its own label while still reusing the animal-shaped data.
const PLANT_TYPES = ['CHED PP', 'GBN PP', 'GBN NNS']

function typeLabelFor (row) {
  if (PLANT_TYPES.includes(row.type)) return 'Plants'
  if (row.type === 'GBN IUU') return 'Marine fish'
  return 'Live animals'
}

function numberOfAnimalsFor (row, index) {
  if (PLANT_TYPES.includes(row.type) || row.type === 'GBN IUU') return null
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
  const sort = query.sort === 'arrival-asc' ? 'arrival-asc' : 'arrival-desc'

  // A quick date preset overrides any manually-entered start/end date, matching
  // the behaviour of the main /intro/dashboard filter panel.
  const periodRange = getDateRangeForFilterPeriod(filterPeriod)
  const filterStartDate = periodRange ? periodRange.filterStartDate : (query.filterStartDate || '').trim()
  const filterEndDate = periodRange ? periodRange.filterEndDate : (query.filterEndDate || '').trim()

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
    filtered = filtered.filter(n => n.status === filterStatus)
  }
  if (filterNotificationType) {
    filtered = filtered.filter(n => n.type === filterNotificationType)
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

  const notificationTypes = require('../data/notification-types.js')
  const notificationTypeItems = [{ value: '', text: 'All' }].concat(
    notificationTypes.map(type => ({ value: type, text: type }))
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
    filterStartDate,
    filterEndDate,
    originCountries,
    notificationTypeItems,
    sort
  }
}

module.exports = { buildDashboardTwoViewData }
