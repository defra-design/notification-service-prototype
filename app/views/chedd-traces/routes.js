module.exports = function (router) {
  router.get('/chedd-traces/04-commodity-search', (req, res) => {
    const commoditiesData = require('../../data/commodities-ched-d.js')

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

    res.redirect('/chedd-traces/05-commodity-add-another')
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
