//
// Shared dashboard logic for notification lists (filter, sort, paginate)
//

const FILTER_KEYS = ['filterKeyword', 'filterCommodity', 'filterOrigin', 'filterNotificationType', 'filterConsignee', 'filterDestination', 'filterStatus', 'filterStartDate', 'filterEndDate', 'filterPeriod']

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function pad2 (n) {
  return String(n).padStart(2, '0')
}

function toYyyyMmDd (d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function getDateRangeForFilterPeriod (period, now = new Date()) {
  if (!period || typeof period !== 'string') return null
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(end)
  switch (period) {
    case 'last-1-hour':
      return { filterStartDate: toYyyyMmDd(end), filterEndDate: toYyyyMmDd(end) }
    case 'last-24-hours':
      start.setDate(start.getDate() - 1)
      return { filterStartDate: toYyyyMmDd(start), filterEndDate: toYyyyMmDd(end) }
    case 'last-7-days':
      start.setDate(start.getDate() - 6)
      return { filterStartDate: toYyyyMmDd(start), filterEndDate: toYyyyMmDd(end) }
    case 'last-30-days':
      start.setDate(start.getDate() - 29)
      return { filterStartDate: toYyyyMmDd(start), filterEndDate: toYyyyMmDd(end) }
    default:
      return null
  }
}

function parseArrivalDate (str) {
  if (!str || typeof str !== 'string') return null
  const match = str.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/)
  if (!match) return null
  const monthIndex = MONTHS.findIndex(m => m.toLowerCase() === match[2].toLowerCase())
  if (monthIndex < 0) return null
  return new Date(parseInt(match[3], 10), monthIndex, parseInt(match[1], 10)).getTime()
}

function parseIsoDateStartOfDay (iso) {
  const m = String(iso).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)).getTime()
}

function arrivalMatchesFilterRange (arrivalStr, startDateStr, endDateStr) {
  const s = (startDateStr || '').trim()
  const e = (endDateStr || '').trim()
  if (!s && !e) return true
  const arrivalTs = parseArrivalDate(arrivalStr)
  if (arrivalTs == null) return false
  const minTs = s ? parseIsoDateStartOfDay(s) : null
  const maxTs = e ? parseIsoDateStartOfDay(e) : null
  if (minTs == null && maxTs == null) return true
  if (minTs != null && arrivalTs < minTs) return false
  if (maxTs != null && arrivalTs > maxTs) return false
  return true
}

function formatLongUkDate (ts) {
  const d = new Date(ts)
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function ensureDateCreated (n) {
  if (n.dateCreated) return n.dateCreated
  const arrivalTs = parseArrivalDate(n.arrival)
  if (arrivalTs == null) return ''
  const created = new Date(arrivalTs)
  created.setDate(created.getDate() - 5)
  return formatLongUkDate(created.getTime())
}

function formatTodayUkDateLabel () {
  const now = new Date()
  return `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`
}

const { getSpeciesCommodityMaps, normaliseCommodityDisplay } = require('./commodity-display.js')
const { getRemovedRefSet } = require('./notification-view-helpers.js')

function formatIsoDateUkLong (iso) {
  if (!iso || typeof iso !== 'string') return 'Not provided'
  const m = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return 'Not provided'
  const y = m[1]
  const mo = parseInt(m[2], 10)
  const d = parseInt(m[3], 10)
  return `${d} ${MONTHS[mo - 1]} ${y}`
}

function buildSessionDraftNotificationRow (data, basePath, speciesMaps) {
  const ref = data.draftNotificationReference && String(data.draftNotificationReference).trim()
  if (!ref || !data.taskListUnlocked) return null

  const commoditiesEu = require('../data/commodities-eu.js')
  const commoditiesData = require('../data/commodities.js')
  let commodityKey = data.commodity
  if (!commodityKey && Array.isArray(data.commodities) && data.commodities.length > 0) {
    commodityKey = data.commodities[0].commodity
  }
  const commodityDetails = commodityKey ? (commoditiesEu[commodityKey] || commoditiesData[commodityKey]) : null
  const commodityCode = commodityDetails ? commodityDetails.code : (data.commodityCode || '')
  const commodityName = commodityDetails?.commonName || commodityKey || 'Live animals'
  const commodityDisplayRaw = commodityCode ? `${commodityName} (${commodityCode})` : commodityName
  const commodityDisplay = normaliseCommodityDisplay(commodityDisplayRaw, speciesMaps)

  const dateCreatedLabel = formatTodayUkDateLabel()

  return {
    reference: ref,
    commodity: commodityDisplay,
    origin: data.countryOfOrigin || 'Not provided',
    consignee: data.consigneeName || (data.consignee && data.consignee.name) || 'Not provided',
    consignor: data.consignorName || (data.consignor && data.consignor.name) || 'Not provided',
    arrival: formatIsoDateUkLong(data.arrivalDate),
    dateCreated: dateCreatedLabel,
    status: 'draft',
    isSessionDraft: true,
    continueHref: `${basePath}/create/task-list`
  }
}

function sortNotifications (list, sortOption) {
  const sorted = [...list]
  const byArrival = (a, b) => {
    const ta = parseArrivalDate(a.arrival) || 0
    const tb = parseArrivalDate(b.arrival) || 0
    return ta - tb
  }
  const byDateCreated = (a, b) => {
    const ta = parseArrivalDate(a.dateCreated) || 0
    const tb = parseArrivalDate(b.dateCreated) || 0
    return ta - tb
  }
  if (sortOption === 'arrival-desc') {
    sorted.sort((a, b) => byArrival(b, a))
  } else if (sortOption === 'arrival-asc') {
    sorted.sort(byArrival)
  } else if (sortOption === 'created-desc') {
    sorted.sort((a, b) => byDateCreated(b, a))
  } else if (sortOption === 'created-asc') {
    sorted.sort(byDateCreated)
  } else if (sortOption === 'reference') {
    sorted.sort((a, b) => String(a.reference || '').localeCompare(b.reference || ''))
  }
  return sorted
}

function rebuildSessionPreservingSubmittedAndFilters (data) {
  const preserved = {}
  if (Array.isArray(data.submittedNotifications)) {
    preserved.submittedNotifications = data.submittedNotifications
  }
  if (Array.isArray(data.removedNotificationReferences)) {
    preserved.removedNotificationReferences = [...data.removedNotificationReferences]
  }
  FILTER_KEYS.forEach(k => {
    const v = data[k]
    if (v !== undefined && v !== null && String(v).trim() !== '') {
      preserved[k] = v
    }
  })
  if (data.sort !== undefined && data.sort !== null && String(data.sort).trim() !== '') {
    preserved.sort = data.sort
  }
  return preserved
}

function filterNotifications (filterData, sourceList, notifications) {
  const list = sourceList || notifications || []
  const str = (v) => (v == null ? '' : String(v))
  return list.filter(n => {
    const keyword = (filterData.keyword || '').trim().toLowerCase()
    if (keyword) {
      const search = `${str(n.reference)} ${str(n.commodity)} ${str(n.origin)} ${str(n.consignee)} ${str(n.consignor)}`.toLowerCase()
      if (!search.includes(keyword)) return false
    }

    const commodity = (filterData.commodity || '').trim().toLowerCase()
    if (commodity && !str(n.commodity).toLowerCase().includes(commodity)) return false

    const origin = (filterData.origin || '').trim().toLowerCase()
    if (origin && !str(n.origin).toLowerCase().includes(origin)) return false

    const consignee = (filterData.consignee || '').trim().toLowerCase()
    if (consignee) {
      const match = str(n.consignee).toLowerCase().includes(consignee) || str(n.consignor).toLowerCase().includes(consignee)
      if (!match) return false
    }

    const status = (filterData.status || '').trim().toLowerCase()
    if (status && n.status !== status) return false

    const startD = filterData.startDate
    const endD = filterData.endDate
    const hasDateBounds = ((startD || '').trim() !== '' || (endD || '').trim() !== '')
    const quickCreatedMode = !!(filterData.filterPeriod && String(filterData.filterPeriod).trim())
    if (quickCreatedMode && hasDateBounds) {
      const createdLabel = ensureDateCreated(n)
      if (!arrivalMatchesFilterRange(createdLabel, startD, endD)) return false
    } else if (!quickCreatedMode && hasDateBounds) {
      if (!arrivalMatchesFilterRange(n.arrival, startD, endD)) return false
    }

    return true
  })
}

function registerDashboardRoutes (router, basePath, options) {
  const { templatePath, notifications: notificationsData, journeyBasePath, viewBasePath } = options
  const notifications = notificationsData || require('../data/notifications')
  const linksBasePath = journeyBasePath || basePath
  const viewLinksBasePath = viewBasePath || linksBasePath

  router.get(`${basePath}/dashboard`, (req, res) => {
    const data = req.session.data || {}
    FILTER_KEYS.forEach(key => {
      if (req.query[key] !== undefined) data[key] = req.query[key]
    })
    if (Object.prototype.hasOwnProperty.call(req.query, 'filterPeriod')) {
      const range = getDateRangeForFilterPeriod(data.filterPeriod)
      if (range) {
        data.filterStartDate = range.filterStartDate
        data.filterEndDate = range.filterEndDate
      } else {
        data.filterStartDate = ''
        data.filterEndDate = ''
      }
    }
    if (req.query.sort !== undefined) data.sort = req.query.sort
    const filterData = {
      keyword: data.filterKeyword,
      commodity: data.filterCommodity,
      origin: data.filterOrigin,
      notificationType: data.filterNotificationType,
      consignee: data.filterConsignee,
      destination: data.filterDestination,
      status: data.filterStatus,
      startDate: data.filterStartDate,
      endDate: data.filterEndDate,
      filterPeriod: data.filterPeriod
    }
    const submitted = data.submittedNotifications || []
    const speciesMaps = getSpeciesCommodityMaps()
    const sessionDraft = buildSessionDraftNotificationRow(data, basePath, speciesMaps)
    const removed = getRemovedRefSet(data)
    const notificationsVisible = notifications.filter(n => !removed.has(n.reference))
    let allNotifications = [...notificationsVisible, ...submitted]
    if (sessionDraft) {
      allNotifications = [sessionDraft, ...allNotifications]
    }
    const filtered = filterNotifications(filterData, allNotifications, notifications)
    const sortOption = data.sort || 'arrival-desc'
    const withDateCreated = filtered.map(n => ({
      ...n,
      dateCreated: ensureDateCreated(n)
    }))
    const sorted = sortNotifications(withDateCreated, sortOption)
    const normalised = sorted.map(n => ({
      ...n,
      commodity: normaliseCommodityDisplay(n.commodity, speciesMaps),
      dateCreated: n.dateCreated
    }))

    const perPage = 20
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const total = normalised.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const pageNum = Math.min(page, totalPages)
    const start = (pageNum - 1) * perPage
    const paginated = normalised.slice(start, start + perPage).map(n => ({
      ...n,
      viewHref: `${viewLinksBasePath}/notification/${encodeURIComponent(n.reference)}`
    }))

    req.session.data.resultsCount = total
    res.locals.notifications = paginated
    res.locals.dashboardPage = pageNum
    res.locals.dashboardTotalPages = totalPages
    const allParams = [...FILTER_KEYS, 'sort']
      .filter(k => data[k] != null && data[k] !== '')
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`)
    res.locals.dashboardQueryParams = allParams.join('&')
    const filterParamKeys = ['filterKeyword', 'filterCommodity', 'filterOrigin', 'filterNotificationType', 'filterConsignee', 'filterDestination', 'filterStatus']
    res.locals.filterQueryBase = filterParamKeys
      .filter(k => data[k])
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`)
      .join('&')

    const euCountries = require('../data/eu-countries.js')
    const originsFromData = [...new Set(allNotifications.map(n => n.origin).filter(Boolean))]
    const euuCountries = ['Iceland', 'Liechtenstein', 'Norway', 'Switzerland']
    const baseOriginCountries = [...euCountries, ...euuCountries]
    res.locals.originCountries = [...new Set([...baseOriginCountries, ...originsFromData])].sort()

    const notificationTypes = require('../data/notification-types.js')
    res.locals.notificationTypes = notificationTypes
    res.locals.notificationTypeItems = [{ value: '', text: 'Show all' }].concat(
      notificationTypes.map(type => ({ value: type, text: type }))
    )

    const hasCustomDates = (data.filterStartDate || '').trim() !== '' || (data.filterEndDate || '').trim() !== ''
    const isDefaultDateRange = !data.filterPeriod && !hasCustomDates
    const activeFilters = []
    const buildClearUrl = (...excludeKeys) => {
      const excludeSet = new Set(excludeKeys)
      const params = [...FILTER_KEYS, 'sort']
        .filter(k => !excludeSet.has(k) && data[k] != null && data[k] !== '')
        .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`)
      return `${basePath}/dashboard${params.length ? '?' + params.join('&') : ''}`
    }
    if ((data.filterKeyword || '').trim()) {
      activeFilters.push({ label: 'Keyword: ' + data.filterKeyword.trim(), clearHref: buildClearUrl('filterKeyword') })
    }
    if ((data.filterCommodity || '').trim()) {
      activeFilters.push({ label: 'Commodity: ' + data.filterCommodity.trim(), clearHref: buildClearUrl('filterCommodity') })
    }
    if ((data.filterOrigin || '').trim()) {
      activeFilters.push({ label: 'Country of origin: ' + data.filterOrigin.trim(), clearHref: buildClearUrl('filterOrigin') })
    }
    if ((data.filterNotificationType || '').trim()) {
      activeFilters.push({ label: 'Notification type: ' + data.filterNotificationType.trim(), clearHref: buildClearUrl('filterNotificationType') })
    }
    if ((data.filterConsignee || '').trim()) {
      activeFilters.push({ label: 'Consignee / Consignor: ' + data.filterConsignee.trim(), clearHref: buildClearUrl('filterConsignee') })
    }
    if ((data.filterDestination || '').trim()) {
      activeFilters.push({ label: 'Place of destination: ' + data.filterDestination.trim(), clearHref: buildClearUrl('filterDestination') })
    }
    if (data.filterStatus && data.filterStatus !== '') {
      activeFilters.push({ label: 'Status: ' + (data.filterStatus === 'draft' ? 'Draft' : 'Submitted'), clearHref: buildClearUrl('filterStatus') })
    }
    if (!isDefaultDateRange && (data.filterPeriod || data.filterStartDate || data.filterEndDate)) {
      const periodLabels = { 'last-1-hour': 'Last 1 hour', 'last-24-hours': 'Last 24 hours', 'last-7-days': 'Last 7 days', 'last-30-days': 'Last 30 days' }
      if (data.filterPeriod) {
        const dateLabel = periodLabels[data.filterPeriod] || 'Custom range'
        activeFilters.push({ label: 'Date created: ' + dateLabel, clearHref: buildClearUrl('filterPeriod', 'filterStartDate', 'filterEndDate') })
      } else {
        activeFilters.push({ label: 'Arrival date: Custom range', clearHref: buildClearUrl('filterPeriod', 'filterStartDate', 'filterEndDate') })
      }
    }
    res.locals.activeFilters = activeFilters
    res.locals.dashboardBasePath = basePath
    res.locals.journeyBasePath = linksBasePath

    res.render(templatePath)
  })

  router.get(`${basePath}/clear-filters`, (req, res) => {
    FILTER_KEYS.forEach(key => delete req.session.data[key])
    delete req.session.data.sort
    res.redirect(`${basePath}/dashboard`)
  })
}

module.exports = {
  registerDashboardRoutes,
  getDateRangeForFilterPeriod,
  ensureDateCreated,
  formatTodayUkDateLabel,
  arrivalMatchesFilterRange,
  rebuildSessionPreservingSubmittedAndFilters
}
