module.exports = function (router) {
  // Static mockup screens for the CHED-A (live animals) journey, sourced from
  // the Figma "Create a notification" flow. No session wiring yet — pages
  // link straight to the next screen, matching how chedd-traces started.

  router.get('/ched-a/04-search-commodity', (req, res) => {
    const commodityNames = require('../../data/commodity-list-eu.js')
    res.render('ched-a/04-search-commodity', { commodityNames })
  })

  router.get('/ched-a/09-arrival-details', (req, res) => {
    const { borderPortItems } = require('../../data/uk-border-ports.js')
    res.render('ched-a/09-arrival-details', { ukBorderPorts: borderPortItems })
  })
}
