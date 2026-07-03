module.exports = function (router) {
  router.get('/chedd-traces/04-commodity-search', (req, res) => {
    const commoditiesData = require('../../data/commodities-eu.js')

    const commodityOptions = Object.entries(commoditiesData)
      .map(([key, details]) => ({
        value: key,
        text: `${details.commonName || key} (${details.code})`
      }))
      .sort((a, b) => a.text.localeCompare(b.text, undefined, { sensitivity: 'base' }))

    res.render('chedd-traces/04-commodity-search', { commodityOptions })
  })
}
