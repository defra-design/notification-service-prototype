const originHeadingsByImportType = {
  'live-animal-or-germinal-products': 'Origin of the live animal or germinal products',
  'products-of-animal-origin-or-animal-by-products': 'Origin of the product of animal origin or animal by-product',
  'high-risk-food-or-feed-of-non-animal-origin': 'Origin of the high risk food or feed of non-animal origin',
  'plants-plant-products-and-other-objects': 'Origin of the plants, plant products and other objects'
}

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function formatDayMonthYear (day, month, year) {
  const d = parseInt(day, 10)
  const m = parseInt(month, 10)
  const y = parseInt(year, 10)
  if (!d || !m || !y || !monthNames[m - 1]) return ''
  return `${d} ${monthNames[m - 1]} ${y}`
}

module.exports = function (router) {
  router.post('/chedd-traces/01-what-are-you-importing', (req, res) => {
    req.session.data['import-type'] = req.body['import-type']
    res.redirect('/chedd-traces/02-origin-animal-or-product')
  })

  router.get('/chedd-traces/02-origin-animal-or-product', (req, res) => {
    const importType = req.session.data['import-type']
    res.render('chedd-traces/02-origin-animal-or-product', {
      originHeading: originHeadingsByImportType[importType] || 'Origin of the animal or product'
    })
  })

  router.post('/chedd-traces/02-origin-animal-or-product', (req, res) => {
    const tracesCountries = require('../../data/traces-countries.js')
    const value = req.body['origin-country']
    const match = tracesCountries.find(country => country.value === value)

    req.session.data.countryOfOrigin = value
    req.session.data.countryOfOriginText = match ? match.text : value

    res.redirect('/chedd-traces/03-origin-import')
  })

  router.post('/chedd-traces/03-origin-import', (req, res) => {
    const tracesCountries = require('../../data/traces-countries.js')
    const value = req.body['origin-country']
    const match = tracesCountries.find(country => country.value === value)

    req.session.data.countryOfOrigin = value
    req.session.data.countryOfOriginText = match ? match.text : value

    res.redirect('/chedd-traces/04-commodity-search')
  })

  router.get('/chedd-traces/04-commodity-search', (req, res) => {
    const commoditiesData = require('../../data/commodities-ched-d.js')

    if (req.query.returnTo === '08-commodity') {
      req.session.data.commodityReturnTo = '08-commodity'
    }

    const commodityOptions = Object.entries(commoditiesData)
      .map(([key, details]) => ({
        value: key,
        text: `${details.commonName || key} (${details.code})`
      }))
      .sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }))

    res.render('chedd-traces/04-commodity-search', { commodityOptions })
  })

  router.post('/chedd-traces/04-commodity-search', (req, res) => {
    const commoditiesData = require('../../data/commodities-ched-d.js')

    const key = req.session.data.commodity
    const details = commoditiesData[key]

    if (!details) {
      return res.redirect('/chedd-traces/04-commodity-search')
    }

    req.session.data.commodities = req.session.data.commodities || []
    req.session.data.commodities.push({
      commodity: key,
      code: details.code,
      description: details.description
    })

    if (req.session.data.commodityReturnTo === '08-commodity') {
      delete req.session.data.commodityReturnTo
      return res.redirect('/chedd-traces/08-commodity')
    }

    res.redirect('/chedd-traces/05-commodity-add-another')
  })

  router.get('/chedd-traces/07-notification-hub', (req, res) => {
    res.render('chedd-traces/07-notification-hub', {
      commodityCount: (req.session.data.commodities || []).length
    })
  })

  router.get('/chedd-traces/08-commodity', (req, res) => {
    const commoditiesData = require('../../data/commodities-ched-d.js')
    const regionRules = require('../../data/region-of-origin-rules.js')
    const packageTypes = require('../../data/package-types.js')
    const countryOfOriginText = req.session.data.countryOfOriginText

    const commodities = (req.session.data.commodities || []).map(item => {
      const details = commoditiesData[item.commodity] || {}
      const rule = regionRules.find(r => r.commodity === item.commodity && r.country === countryOfOriginText)

      return {
        ...item,
        commonName: details.commonName || item.commodity,
        unit: details.unit || 'kg',
        regionOfOriginRequired: !!rule,
        regionOfOriginLabel: rule ? rule.label : null,
        regionOfOriginHint: rule ? rule.hint : null
      }
    })

    res.render('chedd-traces/08-commodity', {
      commodities,
      countryOfOriginText,
      packageTypeItems: [{ value: '', text: 'Select type of package' }].concat(packageTypes)
    })
  })

  router.get('/chedd-traces/10-accompanying-documents', (req, res) => {
    const attachmentTypes = require('../../data/traces-attachment-types.js')

    if (!req.session.data.accompanyingDocuments) {
      req.session.data.accompanyingDocuments = [
        { type: 'Veterinary health certificate', reference: '12', date: '9 September 2024', attachment: 'file.pdf' }
      ]
    }

    res.render('chedd-traces/10-accompanying-documents', {
      documents: req.session.data.accompanyingDocuments,
      documentTypeItems: [{ value: '', text: 'Select document type' }].concat(attachmentTypes)
    })
  })

  router.post('/chedd-traces/10-accompanying-documents', (req, res) => {
    const attachmentTypes = require('../../data/traces-attachment-types.js')
    const match = attachmentTypes.find(t => t.value === req.body['new-document-type'])

    req.session.data.pendingDocument = {
      type: match ? match.text : req.body['new-document-type'],
      reference: req.body['new-document-reference'],
      date: formatDayMonthYear(req.body['new-document-date-day'], req.body['new-document-date-month'], req.body['new-document-date-year'])
    }

    res.redirect('/chedd-traces/11-accompanying-documents-upload')
  })

  router.post('/chedd-traces/11-accompanying-documents-upload', (req, res) => {
    const pending = req.session.data.pendingDocument || {}

    req.session.data.accompanyingDocuments = req.session.data.accompanyingDocuments || []
    req.session.data.accompanyingDocuments.push({
      type: pending.type || '',
      reference: pending.reference || '',
      date: pending.date || '',
      attachment: req.body['attachment-filename'] || 'Not provided'
    })

    delete req.session.data.pendingDocument

    res.redirect('/chedd-traces/10-accompanying-documents')
  })

  router.post('/chedd-traces/05-commodity-add-another', (req, res) => {
    const addAnother = req.session.data['add-another-commodity']

    if (addAnother === 'yes') {
      return res.redirect('/chedd-traces/04-commodity-search')
    }

    if (addAnother === 'no') {
      return res.redirect('/chedd-traces/06-main-reason-importing')
    }

    res.redirect('/chedd-traces/05-commodity-add-another')
  })
}
