//
// v1-baseline – Option 2 flow: Commodity → Origin → Quantities → Hub (multi-commodity)
//

const BASE = '/v1-baseline'
const { isPetConsignment, isLivestockConsignment } = require('../../lib/create-helpers.js')
const { assignDraftNotificationReferenceIfNeeded } = require('../../lib/draft-notification-reference.js')

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

function strOk (v) {
  return v != null && String(v).trim() !== ''
}

function escapeHtmlForTaskList (s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getNotificationTaskListCompletion (data) {
  const commodities = data.commodities || []
  const commoditiesDone = commodities.length > 0
  const originDone = strOk(data.countryOfOrigin)
  const additionalAnimalDone = strOk(data.animalsCertifiedFor)
  const ir = data.importReason
  const importReasonDone = strOk(ir) &&
    (ir !== 'internal-market' || strOk(data.internalMarketPurpose))
  const docs = data.documents || []
  const documentsDone = docs.some(d => d && strOk(d.reference) && strOk(d.type)) ||
    !!data.accompanyingDocumentsConfirmed
  const hasConsignee = !!(data.consigneeId || (strOk(data.consigneeName) &&
    (strOk(data.consigneeAddress) || strOk(data.consigneeAddressLine1))))
  const podAddr = data.placeOfDestinationAddress
  const hasPodLines = strOk(data.placeOfDestinationAddressLine1) ||
    (podAddr && (Array.isArray(podAddr) ? podAddr.some(l => strOk(l)) : strOk(podAddr)))
  const hasDestination = !!(data.placeOfDestinationId || hasPodLines)
  const addressesDone = hasConsignee && hasDestination
  const sameAsPod = data.permanentAddressSameAsPOD === 'yes'
  const permanentAddressesForPetsDone = !isPetConsignment(data) || sameAsPod ||
    (strOk(data.permanentAddressName) && strOk(data.permanentAddressLine1) &&
      strOk(data.permanentAddressTown) && strOk(data.permanentAddressPostcode))
  const cphDone = !isLivestockConsignment(data) || strOk(data.cphNumber)
  const transportDone = strOk(data.transporterName) && strOk(data.arrivalDate)
  return {
    commoditiesDone,
    originDone,
    additionalAnimalDone,
    importReasonDone,
    documentsDone,
    addressesDone,
    permanentAddressesForPetsDone,
    cphDone,
    transportDone
  }
}

function validateNotificationTaskListForSubmission (data) {
  const t = getNotificationTaskListCompletion(data)
  const errorList = []
  const cons = '#task-section-consignment'
  const addr = '#task-section-addresses'
  const move = '#task-section-movement'
  if (!t.originDone) {
    errorList.push({
      href: cons,
      text: 'You must complete the consignment origin section before being able to continue'
    })
  }
  if (!t.commoditiesDone) {
    errorList.push({
      href: cons,
      text: 'You must complete the commodities section before being able to continue'
    })
  }
  if (!t.additionalAnimalDone) {
    errorList.push({
      href: cons,
      text: 'You must complete the additional animal details section before being able to continue'
    })
  }
  if (!t.importReasonDone) {
    errorList.push({
      href: cons,
      text: 'You must complete the reason for import section before being able to continue'
    })
  }
  if (!t.addressesDone) {
    errorList.push({
      href: addr,
      text: 'You must complete the addresses section before being able to continue'
    })
  }
  if (isLivestockConsignment(data) && !t.cphDone) {
    errorList.push({
      href: addr,
      text: 'You must complete the County Parish Holding number (CPH) section before being able to continue'
    })
  }
  if (isPetConsignment(data) && !t.permanentAddressesForPetsDone) {
    errorList.push({
      href: addr,
      text: 'You must complete the permanent addresses for these animals section before being able to continue'
    })
  }
  if (!t.transportDone) {
    errorList.push({
      href: move,
      text: 'You must complete the transport details section before being able to continue'
    })
  }
  return { ok: errorList.length === 0, errorList }
}

function buildExperimentalTaskListSections (data, basePath, opts) {
  const bp = `${basePath}/create`
  const showInlineTaskErrors = !!(opts && opts.showInlineTaskErrors)
  const {
    originDone,
    commoditiesDone,
    additionalAnimalDone,
    importReasonDone,
    documentsDone,
    addressesDone,
    permanentAddressesForPetsDone,
    cphDone,
    transportDone
  } = getNotificationTaskListCompletion(data)

  const statusCompleted = { text: 'Completed' }
  const statusIncomplete = { tag: { text: 'Incomplete', classes: 'govuk-tag--blue' } }
  const statusOptional = { tag: { text: 'Optional', classes: 'govuk-tag--grey' } }

  function buildRow (key, titleText, href, done, incompleteStatus, inlineErrorText) {
    const status = done ? statusCompleted : incompleteStatus
    if (showInlineTaskErrors && !done && inlineErrorText) {
      const errId = `task-inline-error-${key}`
      const safeTitle = escapeHtmlForTaskList(titleText)
      const safeMsg = escapeHtmlForTaskList(inlineErrorText)
      return {
        title: {
          html: `<p class="govuk-body govuk-!-margin-bottom-2 ns-task-list__error-intro"><strong id="${errId}">${safeMsg}</strong></p><a class="govuk-link govuk-task-list__link" href="${href}" aria-describedby="${errId}">${safeTitle}</a>`
        },
        status,
        classes: 'ns-task-list__item--error govuk-task-list__item--with-link'
      }
    }
    const o = {
      title: { text: titleText },
      status
    }
    if (href) o.href = href
    return o
  }

  return [
    {
      idPrefix: 'notification-consignment',
      sectionId: 'task-section-consignment',
      heading: '1. The consignment',
      items: [
        buildRow(
          'origin',
          'Where is this consignment coming from?',
          `${bp}/origin`,
          originDone,
          statusIncomplete,
          'You must complete the consignment origin section before being able to continue'
        ),
        buildRow(
          'commodities',
          'Your commodities',
          `${bp}/commodity-hub`,
          commoditiesDone,
          statusIncomplete,
          'You must complete the commodities section before being able to continue'
        ),
        buildRow(
          'additional-animals',
          'Additional animal details',
          `${bp}/additional-animal-details`,
          additionalAnimalDone,
          statusIncomplete,
          'You must complete the additional animal details section before being able to continue'
        ),
        buildRow(
          'import-reason',
          'Main reason for importing the animals',
          `${bp}/import-reason`,
          importReasonDone,
          statusIncomplete,
          'You must complete the reason for import section before being able to continue'
        )
      ]
    },
    {
      idPrefix: 'notification-addresses',
      sectionId: 'task-section-addresses',
      heading: '2. Addresses',
      items: [
        buildRow(
          'addresses',
          'Addresses',
          `${bp}/addresses`,
          addressesDone,
          statusIncomplete,
          'You must complete the addresses section before being able to continue'
        ),
        ...(isLivestockConsignment(data)
          ? [buildRow(
            'cph',
            'County Parish Holding number (CPH)',
            `${bp}/address-cph`,
            cphDone,
            statusIncomplete,
            'You must complete the County Parish Holding number (CPH) section before being able to continue'
          )]
          : []),
        ...(isPetConsignment(data)
          ? [buildRow(
            'permanent-addresses',
            'Permanent addresses for these animals',
            `${bp}/permanent-addresses-for-animals`,
            permanentAddressesForPetsDone,
            statusIncomplete,
            'You must complete the permanent addresses for these animals section before being able to continue'
          )]
          : [])
      ]
    },
    {
      idPrefix: 'notification-movement',
      sectionId: 'task-section-movement',
      heading: '3. Movement',
      items: [
        buildRow(
          'transport',
          'Transport details',
          `${bp}/transport-and-arrival`,
          transportDone,
          statusIncomplete,
          'You must complete the transport details section before being able to continue'
        ),
        buildRow(
          'accompanying-docs',
          'Accompanying documents (Optional)',
          `${bp}/accompanying-documents`,
          documentsDone,
          statusOptional,
          null
        )
      ]
    }
  ]
}

module.exports = (router) => {
  router.use(BASE, (req, res, next) => {
    res.locals.basePath = BASE
    res.locals.taskListAccessible = !!(req.session.data && req.session.data.taskListUnlocked)
    next()
  })

  router.get(`${BASE}/start`, (req, res) => {
    res.render('v1-baseline/start')
  })

  const {
    registerDashboardRoutes,
    rebuildSessionPreservingSubmittedAndFilters,
    ensureDateCreated,
    formatTodayUkDateLabel
  } = require('../../lib/dashboard.js')
  const notifications = require('../../data/notifications')
  const {
    findNotificationRow,
    deleteNotificationByReference,
    preserveForNotificationListMutation,
    buildFullViewSessionMockFromNotificationRow
  } = require('../../lib/notification-view-helpers.js')
  const { buildCheckYourAnswersData, registerPostHubRoutes } = require('./post-hub-routes.js')

  function buildNotificationDetailsSnapshot (ref, data) {
    const found = findNotificationRow(ref, data, notifications)
    if (!found) return null
    if (found.kind === 'session-draft') {
      const viewData = buildCheckYourAnswersData(data, `${BASE}/create`)
      viewData.basePath = BASE
      viewData.readOnly = true
      viewData.readOnlyPageTitle = 'Notification details'
      viewData.viewPageCaption = `${ref} (Draft)`
      viewData.viewBackLinkHref = `${BASE}/dashboard`
      viewData.amendHref = `${BASE}/notification/${encodeURIComponent(ref)}/amend`
      viewData.readOnlyPrimaryButtonText = 'Continue notification'
      viewData.notificationDeleteHref = `${BASE}/notification/${encodeURIComponent(ref)}/delete`
      viewData.viewNotificationReference = ref
      viewData.readOnlyShowCopyAsNew = false
      viewData.notificationDateCreatedDisplay = formatTodayUkDateLabel()
      return viewData
    }
    const row = found.row
    const sessionLike = buildFullViewSessionMockFromNotificationRow(row)
    const viewData = buildCheckYourAnswersData(sessionLike, `${BASE}/create`)
    viewData.basePath = BASE
    viewData.readOnly = true
    viewData.readOnlyPageTitle = 'Notification details'
    viewData.viewPageCaption = row.status === 'draft' ? `${ref} (Draft)` : ref
    viewData.viewBackLinkHref = `${BASE}/dashboard`
    viewData.amendHref = `${BASE}/notification/${encodeURIComponent(ref)}/amend`
    viewData.readOnlyPrimaryButtonText =
      row.status === 'draft' ? 'Continue notification' : 'Amend this notification'
    viewData.notificationDeleteHref = `${BASE}/notification/${encodeURIComponent(ref)}/delete`
    viewData.viewNotificationReference = ref
    const isSubmitted =
      found.kind === 'submitted' || (found.kind === 'static' && row.status === 'submitted')
    viewData.readOnlyShowCopyAsNew = isSubmitted
    viewData.copyAsNewHref = isSubmitted ? '#' : null
    const createdLabel = ensureDateCreated(row)
    viewData.notificationDateCreatedDisplay = createdLabel || 'Not provided'
    return viewData
  }

  registerDashboardRoutes(router, BASE, {
    templatePath: 'v1-baseline/dashboard',
    notifications
  })

  router.get(`${BASE}/create/new`, (req, res) => {
    const data = req.session.data || {}
    req.session.data = rebuildSessionPreservingSubmittedAndFilters(data)
    res.redirect(`${BASE}/create/origin`)
  })

  router.get(`${BASE}/notification/:reference/amend`, (req, res) => {
    const ref = String(req.params.reference || '').trim()
    const data = req.session.data || {}
    const found = findNotificationRow(ref, data, notifications)
    if (!found) {
      return res.redirect(`${BASE}/dashboard`)
    }
    if (found.kind === 'session-draft') {
      return res.redirect(`${BASE}/create/task-list`)
    }
    if (!found.row) {
      return res.redirect(`${BASE}/dashboard`)
    }
    const next = preserveForNotificationListMutation(data)
    req.session.data = next
    const fullSession = buildFullViewSessionMockFromNotificationRow(found.row)
    const createdForRow = ensureDateCreated(found.row)
    if (createdForRow) fullSession.notificationDateCreated = createdForRow
    Object.assign(req.session.data, fullSession)
    req.session.data.taskListUnlocked = true
    req.session.data.draftNotificationReference = ref
    syncFirstCommodityToSession(req.session.data)
    res.redirect(`${BASE}/create/task-list`)
  })

  router.post(`${BASE}/notification/:reference/delete`, (req, res) => {
    const ref = String(req.params.reference || '').trim()
    const data = req.session.data || {}
    const snapshot = buildNotificationDetailsSnapshot(ref, data)
    if (!snapshot) {
      return res.redirect(`${BASE}/dashboard`)
    }
    const result = deleteNotificationByReference(ref, data, notifications)
    if (!result.ok) {
      return res.redirect(`${BASE}/dashboard`)
    }
    if (result.mode === 'session-draft') {
      req.session.data = rebuildSessionPreservingSubmittedAndFilters(data)
    }
    if (!req.session.data) req.session.data = {}
    req.session.data.deletedNotificationSnapshot = snapshot
    res.redirect(`${BASE}/notification/deleted`)
  })

  router.get(`${BASE}/notification/deleted`, (req, res) => {
    const data = req.session.data || {}
    const snapshot = data.deletedNotificationSnapshot
    if (!snapshot) {
      return res.redirect(`${BASE}/dashboard`)
    }
    delete data.deletedNotificationSnapshot
    res.render('v1-baseline/create/check-your-answers', {
      ...snapshot,
      showDeletionSuccessBanner: true,
      readOnlyHideActions: true,
      pageTitleOnly: 'Notification deleted',
      readOnlyIntro: ''
    })
  })

  router.get(`${BASE}/notification/demo/full-view`, (req, res) => {
    const notificationFullViewMock = require('../../data/notification-full-view-mock.js')
    const viewData = buildCheckYourAnswersData(notificationFullViewMock, `${BASE}/create`)
    viewData.basePath = BASE
    viewData.readOnly = true
    viewData.readOnlyPageTitle = 'Notification details'
    viewData.viewPageCaption = 'IMP.GB.2026.1003455'
    viewData.viewBackLinkHref = `${BASE}/dashboard`
    viewData.amendHref = `${BASE}/notification/IMP.GB.2026.1003455/amend`
    viewData.readOnlyPrimaryButtonText = 'Amend this notification'
    viewData.notificationDeleteHref = `${BASE}/notification/demo/full-view/delete`
    viewData.readOnlyShowCopyAsNew = true
    viewData.copyAsNewHref = '#'
    res.render('v1-baseline/create/check-your-answers', viewData)
  })

  router.post(`${BASE}/notification/demo/full-view/delete`, (req, res) => {
    const notificationFullViewMock = require('../../data/notification-full-view-mock.js')
    const snapshot = buildCheckYourAnswersData(notificationFullViewMock, `${BASE}/create`)
    snapshot.basePath = BASE
    snapshot.readOnly = true
    snapshot.readOnlyPageTitle = 'Notification details'
    snapshot.viewPageCaption = 'IMP.GB.2026.1003455'
    snapshot.viewBackLinkHref = `${BASE}/dashboard`
    snapshot.amendHref = `${BASE}/notification/IMP.GB.2026.1003455/amend`
    snapshot.readOnlyPrimaryButtonText = 'Amend this notification'
    snapshot.notificationDeleteHref = `${BASE}/notification/demo/full-view/delete`
    snapshot.readOnlyShowCopyAsNew = true
    snapshot.copyAsNewHref = '#'
    if (!req.session.data) req.session.data = {}
    req.session.data.deletedNotificationSnapshot = snapshot
    res.redirect(`${BASE}/notification/deleted`)
  })

  router.get(`${BASE}/notification/:reference`, (req, res) => {
    const ref = String(req.params.reference || '').trim()
    const data = req.session.data || {}
    const viewData = buildNotificationDetailsSnapshot(ref, data)
    if (!viewData) {
      return res.redirect(`${BASE}/dashboard`)
    }
    res.render('v1-baseline/create/check-your-answers', viewData)
  })

  router.post(`${BASE}/create/task-list`, (req, res) => {
    const next = (req.body && req.body.taskListNext) || ''
    if (next === 'dashboard') {
      const data = req.session.data || {}
      delete data.taskListErrorList
      return res.redirect(`${BASE}/dashboard`)
    }
    if (next !== 'check') {
      return res.redirect(`${BASE}/create/task-list`)
    }
    const data = req.session.data || {}
    const validation = validateNotificationTaskListForSubmission(data)
    if (!validation.ok) {
      req.session.data = req.session.data || {}
      req.session.data.taskListErrorList = validation.errorList
      return res.redirect(`${BASE}/create/task-list`)
    }
    delete data.taskListErrorList
    res.redirect(`${BASE}/create/check-your-answers`)
  })

  router.get(`${BASE}/create/task-list`, (req, res) => {
    const data = req.session.data || {}
    if (data.taskListUnlocked) {
      assignDraftNotificationReferenceIfNeeded(data)
    }
    const ref = (data.draftNotificationReference || '').trim()
    const taskListCaption = ref ? `${ref} (Draft)` : null
    const errorList = data.taskListErrorList
    if (data.taskListErrorList) delete data.taskListErrorList
    const hasTaskListErrors = !!(errorList && errorList.length)
    res.render('v1-baseline/create/task-list', {
      taskSections: buildExperimentalTaskListSections(data, BASE, {
        showInlineTaskErrors: hasTaskListErrors
      }),
      taskListCaption,
      errorList: hasTaskListErrors ? errorList : null
    })
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
    const backHref = fromHub ? `${BASE}/create/commodity-hub` : `${BASE}/create/origin`
    res.render('v1-baseline/create/commodity', {
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
    } else {
      res.redirect(`${BASE}/create/animal-identification`)
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
      return res.redirect(`${BASE}/create/animal-identification`)
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
    res.render('v1-baseline/create/commodity-species', {
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
    res.redirect(`${BASE}/create/animal-identification`)
  })

  // === 1. Origin (before commodity) ===
  router.get(`${BASE}/create/origin`, (req, res) => {
    if (req.query.returnTo === 'check-your-answers') {
      req.session.data = req.session.data || {}
      req.session.data.returnTo = 'check-your-answers'
      if (req.query.anchor) req.session.data.returnToAnchor = req.query.anchor
    }
    delete req.session.data.errors
    delete req.session.data.errorList
    const euCountries = require('../../data/eu-countries.js')
    const euCountryCodes = require('../../data/eu-country-codes.js')
    const euuCountries = ['Iceland', 'Liechtenstein', 'Norway', 'Switzerland']
    const originCountries = [...euCountries, ...euuCountries].sort()
    const originCountryCodes = { ...euCountryCodes, Iceland: 'IS', Liechtenstein: 'LI', Norway: 'NO', Switzerland: 'CH' }
    const commodity = req.session.data.commodity
    const commoditySpecies = req.session.data.commoditySpecies
    const hasSpecies = Array.isArray(commoditySpecies) ? commoditySpecies.length > 0 : !!commoditySpecies
    const backHref = (commodity && hasSpecies) ? `${BASE}/create/commodity` : null
    res.render('v1-baseline/create/origin', {
      euCountries: originCountries,
      euCountryCodes: originCountryCodes,
      backHref
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
    delete req.session.data.errors
    delete req.session.data.errorList
    const data = req.session.data || {}
    if (data.returnTo === 'check-your-answers') {
      delete data.returnTo
      const anchor = data.returnToAnchor
      delete data.returnToAnchor
      const url = `${BASE}/create/check-your-answers`
      return res.redirect(anchor ? `${url}#${anchor}` : url)
    }
    res.redirect(`${BASE}/create/commodity`)
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
    if (req.query.returnTo === 'check-your-answers') {
      req.session.data = req.session.data || {}
      req.session.data.returnTo = 'check-your-answers'
      if (req.query.anchor) req.session.data.returnToAnchor = req.query.anchor
      req.session.data.taskListUnlocked = true
      assignDraftNotificationReferenceIfNeeded(req.session.data)
    }
    const { items, totalAnimals, totalPackages } = buildCommoditiesForHub(req)
    if (items.length === 0) {
      return res.redirect(`${BASE}/create/commodity`)
    }
    res.render('v1-baseline/create/commodity-hub', {
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
    const remaining = req.session.data.commodities || []
    if (remaining.length === 0) {
      clearCommoditySession(req.session.data)
      req.session.data.commodityFromHub = false
      delete req.session.data.taskListUnlocked
      delete req.session.data.draftNotificationReference
      delete req.session.data.accompanyingDocumentsConfirmed
      delete req.session.data.errors
      delete req.session.data.errorList
      return res.redirect(`${BASE}/create/commodity`)
    }
    res.redirect(`${BASE}/create/commodity-hub`)
  })

  router.get(`${BASE}/create/commodity-hub-prefill`, (req, res) => {
    req.session.data = req.session.data || {}
    req.session.data.commodities = [{
      commodity: 'Cow',
      commoditySpecies: ['Bos taurus'],
      commodityType: 'domestic',
      quantities: { quantity_bos_taurus: 1, packages_bos_taurus: 1 }
    }]
    delete req.session.data.commodity
    delete req.session.data.commoditySpecies
    delete req.session.data.commodityType
    delete req.session.data.commodityFromHub
    delete req.session.data.commodityEditIndex
    delete req.session.data.animalIdCommodityIndex
    delete req.session.data.errors
    delete req.session.data.errorList
    res.redirect(`${BASE}/create/commodity-hub-continue`)
  })

  router.get(`${BASE}/create/commodity-hub-continue`, (req, res) => {
    const data = req.session.data || {}
    if (!syncFirstCommodityToSession(data)) {
      return res.redirect(`${BASE}/create/commodity-hub`)
    }
    if (!data.importType) data.importType = 'live-animals'
    data.taskListUnlocked = true
    assignDraftNotificationReferenceIfNeeded(data)
    if (data.returnTo === 'check-your-answers') {
      delete data.returnTo
      const anchor = data.returnToAnchor
      delete data.returnToAnchor
      const url = `${BASE}/create/check-your-answers`
      return res.redirect(anchor ? `${url}#${anchor}` : url)
    }
    res.redirect(`${BASE}/create/task-list`)
  })

  router.get(`${BASE}/create/import-type`, (req, res) => {
    res.redirect(`${BASE}/create/commodity-hub`)
  })

  // Post-hub routes (animal-identification through confirmation)
  registerPostHubRoutes(router, BASE)

  // Prefill for quick testing
  router.get(`${BASE}/create/commodity-prefill`, (req, res) => {
    req.session.data.commodity = 'Cow'
    req.session.data.commoditySpecies = ['Bos taurus']
    req.session.data.commodityType = 'domestic'
    delete req.session.data.commodityFromHub
    delete req.session.data.commodityEditIndex
    delete req.session.data.errors
    delete req.session.data.errorList
    res.redirect(`${BASE}/create/animal-identification`)
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
    res.redirect(`${BASE}/create/commodity`)
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
