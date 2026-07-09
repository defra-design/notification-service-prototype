//
// For guidance on how to create functions see:
// https://prototype-kit.service.gov.uk/docs/functions
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFunction = govukPrototypeKit.views.addFunction

const tracesCountries = require('./data/traces-countries.js')
const { borderPortItems } = require('./data/uk-border-ports.js')
const { bcpItems } = require('./data/border-control-posts-ched-d.js')
const packageTypes = require('./data/package-types.js')

// Add your functions here
addFunction('tracesCountries', () => tracesCountries)
addFunction('ukBorderPorts', () => borderPortItems)
addFunction('chedDBorderControlPosts', () => bcpItems)
addFunction('packageTypes', () => packageTypes)
