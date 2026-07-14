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

router.post('/sign-in', (req, res) => {
  res.redirect('/v1-baseline/dashboard')
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
