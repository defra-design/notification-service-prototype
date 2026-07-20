//
// For guidance on how to create routes see:
// https://prototype-kit.service.gov.uk/docs/create-routes
//

const govukPrototypeKit = require('govuk-prototype-kit')
const router = govukPrototypeKit.requests.setupRouter()

const JOURNEY_PREFIXES = ['/v1-experimental', '/v1-baseline']

router.use((req, res, next) => {
  const path = req.path || ''
  const match = JOURNEY_PREFIXES.find(prefix => path.startsWith(prefix))
  if (match) res.locals.basePath = match
  next()
})

// Index – prototype home (GOV.UK logo links here)
router.get('/', (req, res) => {
  res.render('index')
})

// Sign in – how do you want to sign in?
router.get('/sign-in', (req, res) => {
  res.render('sign-in')
})

// Reference replica of https://www.gov.uk/import-goods-into-uk (step by step guidance)
router.get('/intro/import-goods-into-uk', (req, res) => {
  res.render('intro/import-goods-into-uk')
})

// Reference replicas of the pages linked from its "licence or certificate" step-nav section
const licenceGuidancePages = [
  'animals-and-animal-products',
  'plants-and-plant-products',
  'high-risk-food',
  'veterinary-medicines',
  'human-medicine',
  'controlled-drugs',
  'tissues-and-cells-for-human-application',
  'waste-shipments',
  'products-containing-f-gas',
  'precursor-chemicals',
  'hazardous-chemicals',
  'nuclear-material',
  'guns-knives-swords-and-other-weapons',
  'weapons-and-goods-for-torture-or-capital-punishment'
]
licenceGuidancePages.forEach(page => {
  router.get(`/intro/${page}`, (req, res) => {
    res.render(`intro/${page}`)
  })
})

// Reference replica of https://www.gov.uk/guidance/import-of-products-animals-food-and-feed-system
router.get('/intro/ipaffs', (req, res) => {
  res.render('intro/ipaffs')
})

// Checker - questions/answers (dummy pages, no logic yet)
router.get('/intro/checker-questions', (req, res) => {
  res.render('intro/checker-questions')
})

router.get('/intro/checker-answers', (req, res) => {
  res.render('intro/checker-answers')
})

// Import Notification Service (INS) start page
router.get('/intro/import-notification-start', (req, res) => {
  res.render('intro/import-notification-start')
})

// Defra ID sign in
router.get('/intro/sign-in', (req, res) => {
  res.render('intro/sign-in')
})

router.post('/intro/sign-in', (req, res) => {
  res.redirect('/intro/dashboard')
})

router.post('/sign-in', (req, res) => {
  res.redirect('/intro/dashboard')
})

// Dashboard shown after signing in via the intro/Defra ID front door – reuses the
// same filter/sort/pagination logic as the v1-baseline dashboard. "Create" still points
// into the v1-baseline journey (that's where the create flow lives), but "View" stays
// within /intro (see notification-details route below) since it uses its own
// notifications-intro.js dataset (type-prefixed references, see
// .claude/knowledge/decisions/notification-reference-format.md) rather than v1-baseline's
// notifications.js, which is kept on the legacy IMP format for design history.
const { registerDashboardRoutes } = require('./lib/dashboard.js')
const notificationsIntro = require('./data/notifications-intro.js')
registerDashboardRoutes(router, '/intro', {
  templatePath: 'intro/dashboard',
  journeyBasePath: '/v1-baseline',
  viewBasePath: '/intro',
  notifications: notificationsIntro
})

// Read-only notification details for a row on the intro dashboard, e.g.
// /intro/notification/CHEDA.GB.2026.1003455 — reuses v1-baseline's rich mock-data builders
// (buildFullViewSessionMockFromNotificationRow / buildCheckYourAnswersData / findNotificationRow /
// deleteNotificationByReference) to get the same level of detail as v1-baseline's own
// notification view, but renders it via intro/notification-details.html — a trimmed,
// read-only-only fork of v1-baseline/create/check-your-answers.html (2026-07-20) — so this
// journey's notification details screens can be changed independently of v1-baseline's
// create-flow check-your-answers page. Amend/Continue still hands off into v1-baseline's own
// create/task-list flow, the same way the dashboard's "Create" button already does, since
// that's the only place the edit journey exists.
const {
  findNotificationRow,
  deleteNotificationByReference,
  buildFullViewSessionMockFromNotificationRow,
  buildPlantNotificationViewData,
  preserveForNotificationListMutation
} = require('./lib/notification-view-helpers.js')
const { buildCheckYourAnswersData } = require('./views/v1-baseline/post-hub-routes.js')

function syncFirstCommodityToIntroSession (data) {
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

function buildIntroNotificationViewData (row, ref) {
  const sessionLike = buildFullViewSessionMockFromNotificationRow(row)
  const isSubmitted = row.status === 'submitted'
  // row.type is only set for the intro dashboard's mock rows (app/data/notifications-intro.js);
  // notifications submitted via the real v1-baseline create journey don't set it, since that
  // journey only ever produces CHED-A-shaped notifications today.
  const declarationType = row.type || 'CHED A'
  const isPlantDeclaration = declarationType === 'CHED PP'
  const viewData = isPlantDeclaration
    ? buildPlantNotificationViewData(sessionLike, '/intro')
    : buildCheckYourAnswersData(sessionLike, '/intro')
  viewData.basePath = '/intro'
  viewData.readOnly = true
  viewData.readOnlyPageTitle = 'Notification details'
  viewData.declarationType = declarationType
  viewData.viewPageCaption = isSubmitted ? `${declarationType} · ${ref}` : `${declarationType} · ${ref} (Draft)`
  viewData.viewBackLinkHref = '/intro/dashboard'
  viewData.amendHref = `/intro/notification/${encodeURIComponent(ref)}/amend`
  viewData.readOnlyPrimaryButtonText = isSubmitted ? 'Amend this notification' : 'Continue notification'
  viewData.notificationDeleteHref = `/intro/notification/${encodeURIComponent(ref)}/delete`
  viewData.readOnlyShowCopyAsNew = isSubmitted
  viewData.copyAsNewHref = isSubmitted ? '#' : null
  viewData.notificationDateCreatedDisplay = row.dateCreated || 'Not provided'
  return viewData
}

// Registered before the generic /intro/notification/:reference route below, otherwise
// Express would match "deleted" as a :reference value first (same ordering v1-baseline
// uses for its own /notification/deleted vs /notification/:reference).
router.get('/intro/notification/deleted', (req, res) => {
  const data = req.session.data || {}
  const snapshot = data.deletedNotificationSnapshot
  if (!snapshot) {
    return res.redirect('/intro/dashboard')
  }
  delete data.deletedNotificationSnapshot
  res.render('intro/notification-details', {
    ...snapshot,
    showDeletionSuccessBanner: true,
    readOnlyHideActions: true,
    pageTitleOnly: 'Notification deleted',
    readOnlyIntro: ''
  })
})

router.get('/intro/notification/:reference', (req, res) => {
  const ref = String(req.params.reference || '').trim()
  const data = req.session.data || {}
  const found = findNotificationRow(ref, data, notificationsIntro)
  if (!found || !found.row) {
    return res.redirect('/intro/dashboard')
  }
  res.render('intro/notification-details', buildIntroNotificationViewData(found.row, ref))
})

router.get('/intro/notification/:reference/amend', (req, res) => {
  const ref = String(req.params.reference || '').trim()
  const data = req.session.data || {}
  const found = findNotificationRow(ref, data, notificationsIntro)
  if (!found || !found.row) {
    return res.redirect('/intro/dashboard')
  }
  req.session.data = preserveForNotificationListMutation(data)
  const fullSession = buildFullViewSessionMockFromNotificationRow(found.row)
  if (found.row.dateCreated) fullSession.notificationDateCreated = found.row.dateCreated
  Object.assign(req.session.data, fullSession)
  req.session.data.taskListUnlocked = true
  req.session.data.draftNotificationReference = ref
  syncFirstCommodityToIntroSession(req.session.data)
  res.redirect('/v1-baseline/create/task-list')
})

router.post('/intro/notification/:reference/delete', (req, res) => {
  const ref = String(req.params.reference || '').trim()
  const data = req.session.data || {}
  const found = findNotificationRow(ref, data, notificationsIntro)
  if (!found || !found.row) {
    return res.redirect('/intro/dashboard')
  }
  const snapshot = buildIntroNotificationViewData(found.row, ref)
  const result = deleteNotificationByReference(ref, data, notificationsIntro)
  if (!result.ok) {
    return res.redirect('/intro/dashboard')
  }
  if (!req.session.data) req.session.data = {}
  req.session.data.deletedNotificationSnapshot = snapshot
  res.redirect('/intro/notification/deleted')
})

// Clear session data and redirect back (useful for resetting prototype state)
router.get('/clear-data', (req, res) => {
  req.session.data = {}
  const returnUrl = req.get('Referrer') || '/'
  res.redirect(returnUrl)
})

// Version routes – legacy /v1-experimental URLs redirect to v1-baseline (merged journey)
require('./views/v1-experimental/routes')(router)
require('./views/v1-baseline/routes')(router)
require('./views/chedd-traces/routes')(router)
require('./views/ched-a/routes')(router)
