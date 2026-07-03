//
// For guidance on how to create functions see:
// https://prototype-kit.service.gov.uk/docs/functions
//

const govukPrototypeKit = require('govuk-prototype-kit')
const addFunction = govukPrototypeKit.views.addFunction

const tracesCountries = require('./data/traces-countries.js')

// Add your functions here
addFunction('tracesCountries', () => tracesCountries)
