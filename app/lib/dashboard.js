//
// Shared dashboard logic for notification lists (filter, sort, paginate)
//

const FILTER_KEYS = ['filterKeyword', 'filterCommodity', 'filterOrigin', 'filterConsignee', 'filterDestination', 'filterStatus', 'filterStartDate', 'filterEndDate', 'filterPeriod']

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function parseArrivalDate (str) {
  if (!str || typeof str !== 'string') return null
  const match = str.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/)
  if (!match) return null
  const monthIndex = MONTHS.findIndex(m => m.toLowerCase() === match[2].toLowerCase())
  if (monthIndex < 0) return null
  return new Date(parseInt(match[3], 10), monthIndex, parseInt(match[1], 10)).getTime()
}

function getSpeciesToCodeMap () {
  const commoditiesData = require('../data/commodities.js')
  const map = {}
  for (const [key, details] of Object.entries(commoditiesData)) {
    if (details.code && details.species) {
      details.species.forEach(s => { map[s] = details.code })
    }
  }
  return map
}

function normaliseCommodityDisplay (commodity, speciesToCode) {
  if (!commodity || typeof commodity !== 'string') return commodity || ''
  if (/\(\d+\)$/.test(commodity.trim())) return commodity
  const code = speciesToCode[commodity.trim()]
  return code ? `${commodity} (${code})` : commodity
}

function sortNotifications (list, sortOption) {
  const sorted = [...list]
  const byArrival = (a, b) => {
    const ta = parseArrivalDate(a.arrival) || 0
    const tb = parseArrivalDate(b.arrival) || 0
    return ta - tb
  }
  if (sortOption === 'arrival-desc') {
    sorted.sort((a, b) => byArrival(b, a))
  } else if (sortOption === 'arrival-asc') {
    sorted.sort(byArrival)
  } else if (sortOption === 'reference') {
    sorted.sort((a, b) => String(a.reference || '').localeCompare(b.reference || ''))
  }
  return sorted
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

    return true
  })
}

function registerDashboardRoutes (router, basePath, options) {
  const { templatePath, notifications: notificationsData } = options
  const notifications = notificationsData || require('../data/notifications')

  router.get(`${basePath}/dashboard`, (req, res) => {
    const data = req.session.data || {}
    FILTER_KEYS.forEach(key => {
      if (req.query[key] !== undefined) data[key] = req.query[key]
    })
    if (req.query.sort !== undefined) data.sort = req.query.sort
    const toYYYYMMDD = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const today = new Date()
    const defaultStart = toYYYYMMDD(new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000))
    const defaultEnd = toYYYYMMDD(today)
    if (data.filterPeriod) {
      const d = new Date(today)
      if (data.filterPeriod === 'last-1-hour') {
        data.filterStartDate = defaultEnd
        data.filterEndDate = defaultEnd
      } else if (data.filterPeriod === 'last-24-hours') {
        d.setDate(d.getDate() - 1)
        data.filterStartDate = toYYYYMMDD(d)
        data.filterEndDate = defaultEnd
      } else if (data.filterPeriod === 'last-7-days') {
        d.setDate(d.getDate() - 7)
        data.filterStartDate = toYYYYMMDD(d)
        data.filterEndDate = defaultEnd
      } else if (data.filterPeriod === 'last-30-days') {
        d.setDate(d.getDate() - 30)
        data.filterStartDate = toYYYYMMDD(d)
        data.filterEndDate = defaultEnd
      }
    }
    if (!data.filterStartDate) data.filterStartDate = defaultStart
    if (!data.filterEndDate) data.filterEndDate = defaultEnd
    const filterData = {
      keyword: data.filterKeyword,
      commodity: data.filterCommodity,
      origin: data.filterOrigin,
      consignee: data.filterConsignee,
      destination: data.filterDestination,
      status: data.filterStatus,
      startDate: data.filterStartDate,
      endDate: data.filterEndDate
    }
    const submitted = data.submittedNotifications || []
    const allNotifications = [...notifications, ...submitted]
    const filtered = filterNotifications(filterData, allNotifications, notifications)
    const sortOption = data.sort || 'arrival-desc'
    const sorted = sortNotifications(filtered, sortOption)
    const speciesToCode = getSpeciesToCodeMap()
    const normalised = sorted.map(n => ({
      ...n,
      commodity: normaliseCommodityDisplay(n.commodity, speciesToCode)
    }))

    const perPage = 20
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const total = normalised.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const pageNum = Math.min(page, totalPages)
    const start = (pageNum - 1) * perPage
    const paginated = normalised.slice(start, start + perPage)

    req.session.data.resultsCount = total
    res.locals.notifications = paginated
    res.locals.dashboardPage = pageNum
    res.locals.dashboardTotalPages = totalPages
    const allParams = [...FILTER_KEYS, 'sort']
      .filter(k => data[k] != null && data[k] !== '')
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`)
    res.locals.dashboardQueryParams = allParams.join('&')
    const filterParamKeys = ['filterKeyword', 'filterCommodity', 'filterOrigin', 'filterConsignee', 'filterDestination', 'filterStatus']
    res.locals.filterQueryBase = filterParamKeys
      .filter(k => data[k])
      .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(data[k])}`)
      .join('&')

    const euCountries = require('../data/eu-countries.js')
    const originsFromData = [...new Set(allNotifications.map(n => n.origin).filter(Boolean))]
    const euuCountries = ['Iceland', 'Liechtenstein', 'Norway', 'Switzerland']
    const baseOriginCountries = [...euCountries, ...euuCountries]
    res.locals.originCountries = [...new Set([...baseOriginCountries, ...originsFromData])].sort()

    const isDefaultDateRange = (data.filterStartDate === defaultStart && data.filterEndDate === defaultEnd) || (!data.filterPeriod && !data.filterStartDate && !data.filterEndDate)
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
      const dateLabel = data.filterPeriod ? (periodLabels[data.filterPeriod] || 'Custom date range') : 'Custom date range'
      activeFilters.push({ label: 'Date range: ' + dateLabel, clearHref: buildClearUrl('filterPeriod', 'filterStartDate', 'filterEndDate') })
    }
    res.locals.activeFilters = activeFilters
    res.locals.dashboardBasePath = basePath

    res.render(templatePath)
  })

  router.get(`${basePath}/clear-filters`, (req, res) => {
    FILTER_KEYS.forEach(key => delete req.session.data[key])
    delete req.session.data.sort
    res.redirect(`${basePath}/dashboard`)
  })
}

module.exports = { registerDashboardRoutes }
