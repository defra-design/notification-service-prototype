//
// Page-object helpers for the notification journey demo walk.
//
// This walk starts at the /intro front door (the guidance page a real trader lands on),
// signs in, lands on the /intro dashboard, then drives the full /v1-baseline/create/*
// notification-creation journey with realistic typed/selected data through to
// confirmation, then returns to /intro to close the loop.
//
// Data-driven variants exercise two of the create journey's conditional branches:
//   - cattle (Cow, Bos taurus) → explicit commodity + species picker pages, ear
//     tag/passport animal identification, livestock CPH address branch
//   - cat (Felis catus)        → commodity+species chosen in one typeahead pick (skips
//     the species page), pet microchip/passport/tattoo identification, the pet
//     permanent-address branch instead of CPH
//
const { expect } = require('@playwright/test')

const JOURNEYS = [
  {
    id: 'cattle-cph',
    label: 'Cattle from Germany — commodity/species pages, livestock CPH address branch',
    consignmentReference: 'DEMO-CATTLE-001',
    country: 'Germany',
    commodity: {
      search: 'Cow',
      option: 'Cow (0102)',
      skipSpeciesPage: false,
      speciesValue: 'Bos taurus',
      speciesLabel: 'Bos taurus',
      speciesKey: 'bos_taurus'
    },
    identification: {
      type: 'default',
      animals: [
        { earTag: '123456000001', passport: 'UK 123456 7 00001' },
        { earTag: '123456000002', passport: 'UK 123456 7 00002' }
      ],
      packages: '1'
    },
    certifiedFor: 'breeding-production',
    unweanedAnimals: 'no',
    importReason: 'internal-market',
    internalMarketPurpose: 'breeding',
    placeOfOrigin: { search: 'Bovine Exports', match: 'Bovine Exports GmbH' },
    consignor: { search: 'Bovine Exports', match: 'Bovine Exports GmbH' },
    consignee: { search: 'Aberdeen Livestock', match: 'Aberdeen Livestock Ltd' },
    importerSameAsConsignee: true,
    placeOfDestination: { search: 'Aberdeen Balai', match: 'Aberdeen Balai Centre' },
    contactAddress: { search: 'Animal and Plant', match: 'Animal and Plant Health Agency' },
    addressBranch: 'cph',
    cphNumber: '12/345/6789',
    transporter: { search: 'Aberdeen Livestock', match: 'Aberdeen Livestock Ltd' },
    port: { search: 'Heathrow', option: 'Heathrow Airport' },
    arrivalInDays: 21,
    documentType: 'veterinary-health-certificate',
    documentReference: 'CHED-CATTLE-2026-001',
    documentIssuedDaysAgo: 5
  },
  {
    id: 'cat-permanent-address',
    label: 'Pet cat from France — single typeahead pick, pet identification, permanent-address branch',
    consignmentReference: 'DEMO-PET-002',
    country: 'France',
    commodity: {
      search: 'Felis catus',
      option: 'Cat (Felis catus)',
      skipSpeciesPage: true,
      speciesLabel: 'Felis catus',
      speciesKey: 'felis_catus'
    },
    identification: {
      type: 'pet',
      animals: [
        { microchip: '982000123456701', passport: 'GBR-PPT-CAT-001', tattoo: 'TATCAT-1' }
      ],
      packages: '1'
    },
    certifiedFor: 'pets',
    unweanedAnimals: null,
    importReason: 're-entry',
    internalMarketPurpose: null,
    placeOfOrigin: { search: 'AgriLivestock', match: 'AgriLivestock France SARL' },
    consignor: { search: 'AgriLivestock', match: 'AgriLivestock France SARL' },
    consignee: { search: 'Bristol Animal', match: 'Bristol Animal Imports' },
    importerSameAsConsignee: true,
    placeOfDestination: { search: 'Bristol Quarantine', match: 'Bristol Quarantine Facility' },
    contactAddress: { search: 'Cathcart', match: '100, Cathcart' },
    addressBranch: 'permanent',
    transporter: { search: 'Bristol Animal', match: 'Bristol Animal Imports' },
    port: { search: 'Bristol', option: 'Bristol Airport' },
    arrivalInDays: 14,
    documentType: 'import-permit',
    documentReference: 'PET-IMPORT-2026-002',
    documentIssuedDaysAgo: 10
  }
]

// --- pacing ---------------------------------------------------------------
// The audience is non-technical product owners: type like a person and pause on
// each new page so the walk-through is easy to follow. (waitForTimeout is
// deliberate here — pacing IS the point of this suite, not a race workaround.)
const TYPE_DELAY = 70    // ms per character while typing
const FIELD_PAUSE = 450  // ms after filling or choosing a field
const STEP_PAUSE = 1300  // ms after the page changes, to take it in
const SCROLL_PAUSE = 350 // ms for the scroll-to-centre to settle

function pause (page, ms) {
  return page.waitForTimeout(ms)
}

// Scrolls a target to the middle of the frame before we touch it, so it (and
// the page around it) stays comfortably in shot rather than at the very bottom
// edge, where Playwright's default "scroll just enough" leaves it.
async function scrollTo (locator) {
  await locator.scrollIntoViewIfNeeded()
  await locator.evaluate((el) => el.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  await locator.page().waitForTimeout(SCROLL_PAUSE)
}

async function clickAt (locator) {
  await scrollTo(locator)
  await locator.click()
}

async function checkAt (locator) {
  await scrollTo(locator)
  await locator.check()
}

// Types a value character by character into a text box, as a person would.
async function typeInto (locator, value) {
  await scrollTo(locator)
  await locator.click()
  await locator.fill('')
  await locator.pressSequentially(String(value), { delay: TYPE_DELAY })
}

// --- low-level primitives -------------------------------------------------

async function fillText (page, name, value) {
  await typeInto(page.locator(`input[name="${name}"]`).first(), value)
  await pause(page, FIELD_PAUSE)
}

async function fillTextById (page, id, value) {
  await typeInto(page.locator(`#${id}`), value)
  await pause(page, FIELD_PAUSE)
}

// Native date inputs (type="date") don't play nicely with character-by-character
// typing across locales — Playwright's fill() handles the yyyy-mm-dd value
// directly regardless of the browser's display locale.
async function fillDateInput (locator, isoDate) {
  await scrollTo(locator)
  await locator.fill(isoDate)
  await pause(locator.page(), FIELD_PAUSE)
}

async function pickRadio (page, name, value) {
  await checkAt(page.locator(`input[name="${name}"][value="${value}"]`))
  await pause(page, FIELD_PAUSE)
}

async function pickCheckbox (page, name, value) {
  await checkAt(page.locator(`input[name="${name}"][value="${value}"]`))
  await pause(page, FIELD_PAUSE)
}

async function selectValue (page, id, value) {
  const select = page.locator(`#${id}`)
  await scrollTo(select)
  await select.selectOption(value)
  await pause(page, FIELD_PAUSE)
}

// Clicks the page's primary forward button, whichever label this app uses for it
// ("Save and continue" on most create-journey pages, "Confirm and submit" on
// check-your-answers, "Submit notification" on declaration, plain "Continue" on
// the commodity hub, "Sign in"/"Start now" on the intro front door).
async function clickContinue (page) {
  const button = page
    .getByRole('button', { name: /save and continue|continue|accept and submit|confirm and submit|submit notification|sign in|start now/i })
    .first()
  await clickAt(button)
  await pause(page, STEP_PAUSE)
}

// Drives one of this app's accessible-autocomplete-enhanced fields (country of
// origin, commodity/species search, port of entry): types the search term one
// key at a time (the widget filters its list on each input event), then clicks
// the matching rendered option, which writes the value the server reads.
async function pickFromAutocomplete (page, fieldId, searchText, optionExactText) {
  const input = page.locator(`#${fieldId}`)
  const option = page.getByRole('option', { name: optionExactText, exact: true })
  await scrollTo(input)
  await input.click()
  await input.fill('')
  await input.pressSequentially(searchText, { delay: TYPE_DELAY })
  try {
    await option.waitFor({ state: 'visible', timeout: 4000 })
  } catch {
    // The widget's blur/debounce timer can occasionally close the list before we
    // click. Re-trigger a render while keeping focus (no blur): delete and retype
    // the last character.
    await input.press('Backspace')
    await input.pressSequentially(searchText.slice(-1), { delay: TYPE_DELAY })
    await option.waitFor({ state: 'visible', timeout: 8000 })
  }
  await clickAt(option)
  await pause(page, FIELD_PAUSE)
}

// Searches one of the address "add a ..." lookup pages by name and selects the
// matching row. All of these pages are plain GET search forms (not autocomplete
// widgets) with a table of results and a "Select" link per row.
async function searchAndSelectAddress (page, { nameFieldId = 'searchName', search, match }) {
  await typeInto(page.locator(`#${nameFieldId}`), search)
  await pause(page, FIELD_PAUSE)
  await clickAt(page.getByRole('button', { name: 'Search' }))
  await pause(page, STEP_PAUSE)
  const row = page.locator('tr', { hasText: match })
  await clickAt(row.getByRole('link', { name: 'Select', exact: true }))
  await pause(page, STEP_PAUSE)
}

function isoDateInDays (days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// --- front door (/intro) ---------------------------------------------------

async function resetSession (page) {
  await page.goto('/clear-data')
  await pause(page, 400)
}

async function fillImportNotificationStart (page) {
  await page.goto('/intro/import-notification-start')
  await pause(page, STEP_PAUSE)
  await clickContinue(page) // "Start now" -> /intro/sign-in
}

async function fillSignIn (page) {
  await expect(page).toHaveURL(/\/intro\/sign-in$/)
  await fillText(page, 'email', 'trader@example-exports.co.uk')
  await typeInto(page.locator('#password'), 'Password123!')
  await pause(page, FIELD_PAUSE)
  await clickContinue(page) // "Sign in" -> /intro/dashboard
}

async function goToCreateFromDashboard (page) {
  await expect(page).toHaveURL(/\/intro\/dashboard$/)
  await pause(page, STEP_PAUSE)
  // Rendered as a govukButton(href: ...), i.e. an <a role="button">, not a plain link.
  await clickAt(page.getByRole('button', { name: 'Create an import notification' }))
  await pause(page, STEP_PAUSE) // -> /v1-baseline/create/origin
}

// --- create journey (/v1-baseline/create/*) --------------------------------

async function fillOrigin (page, journey) {
  await expect(page).toHaveURL(/\/create\/origin$/)
  await pickFromAutocomplete(page, 'countryOfOrigin', journey.country, journey.country)
  await pickRadio(page, 'regionOfOriginRequired', 'no')
  await fillText(page, 'consignmentReference', journey.consignmentReference)
  await clickContinue(page)
}

async function fillCommodity (page, journey) {
  await expect(page).toHaveURL(/\/create\/commodity$/)
  await pickFromAutocomplete(page, 'commodity', journey.commodity.search, journey.commodity.option)
  await clickContinue(page)
}

async function fillCommoditySpecies (page, journey) {
  await expect(page).toHaveURL(/\/create\/commodity-species/)
  await pickCheckbox(page, 'commoditySpecies', journey.commodity.speciesValue)
  await clickContinue(page)
}

async function fillAnimalIdentification (page, journey) {
  await expect(page).toHaveURL(/\/create\/animal-identification$/)
  const { type, animals, packages } = journey.identification
  const key = journey.commodity.speciesKey
  const speciesLabel = journey.commodity.speciesLabel

  // Add extra animal rows up front (client-side clone via "Add another X").
  for (let i = 1; i < animals.length; i++) {
    await clickAt(page.getByRole('link', { name: `Add another ${speciesLabel}` }))
    await pause(page, FIELD_PAUSE)
  }

  for (let i = 0; i < animals.length; i++) {
    const n = i + 1
    const animal = animals[i]
    if (type === 'pet') {
      await fillTextById(page, `microchip-microchip_${key}_${n}`, animal.microchip)
      await fillTextById(page, `passport-passport_${key}_${n}`, animal.passport)
      await fillTextById(page, `tattoo-tattoo_${key}_${n}`, animal.tattoo)
    } else {
      await fillTextById(page, `ear-tag-earTag_${key}_${n}`, animal.earTag)
      await fillTextById(page, `passport-passport_${key}_${n}`, animal.passport)
    }
  }

  await fillTextById(page, `numberOfPackages_${key}`, packages)
  await clickContinue(page) // -> /create/commodity-hub
}

async function fillCommodityHub (page) {
  await expect(page).toHaveURL(/\/create\/commodity-hub$/)
  await clickAt(page.getByRole('button', { name: 'Continue', exact: true }))
  await pause(page, STEP_PAUSE) // -> /create/task-list
}

async function goToAdditionalAnimalDetailsFromTaskList (page) {
  await expect(page).toHaveURL(/\/create\/task-list$/)
  await clickAt(page.getByRole('link', { name: 'Additional animal details' }))
  await pause(page, STEP_PAUSE)
}

async function fillAdditionalAnimalDetails (page, journey) {
  await expect(page).toHaveURL(/\/create\/additional-animal-details$/)
  await pickRadio(page, 'animalsCertifiedFor', journey.certifiedFor)
  if (journey.unweanedAnimals) {
    await pickRadio(page, 'unweanedAnimals', journey.unweanedAnimals)
  }
  await clickContinue(page)
}

async function fillImportReason (page, journey) {
  await expect(page).toHaveURL(/\/create\/import-reason$/)
  await pickRadio(page, 'importReason', journey.importReason)
  if (journey.internalMarketPurpose) {
    await pickRadio(page, 'internalMarketPurpose', journey.internalMarketPurpose)
  }
  await clickContinue(page)
}

async function fillAddresses (page, journey) {
  await expect(page).toHaveURL(/\/create\/addresses$/)

  await clickAt(page.getByRole('link', { name: 'Add a place of origin' }))
  await pause(page, STEP_PAUSE)
  await searchAndSelectAddress(page, { nameFieldId: 'poSearchName', ...journey.placeOfOrigin })
  await expect(page).toHaveURL(/\/create\/addresses/)

  await clickAt(page.getByRole('link', { name: 'Add a consignor' }))
  await pause(page, STEP_PAUSE)
  await searchAndSelectAddress(page, journey.consignor)
  await expect(page).toHaveURL(/\/create\/addresses/)

  await clickAt(page.getByRole('link', { name: 'Add a consignee' }))
  await pause(page, STEP_PAUSE)
  await searchAndSelectAddress(page, journey.consignee)
  await expect(page).toHaveURL(/\/create\/addresses/)

  if (journey.importerSameAsConsignee) {
    await clickAt(page.getByRole('link', { name: 'Same as consignee' }))
    await pause(page, STEP_PAUSE)
  }

  await clickAt(page.getByRole('link', { name: 'Add a place of destination' }))
  await pause(page, STEP_PAUSE)
  await searchAndSelectAddress(page, journey.placeOfDestination)
  await expect(page).toHaveURL(/\/create\/addresses/)

  await clickAt(page.getByRole('link', { name: 'Add a contact address for consignment' }))
  await pause(page, STEP_PAUSE)
  await searchAndSelectAddress(page, journey.contactAddress)
  await expect(page).toHaveURL(/\/create\/addresses/)

  await clickContinue(page)
}

async function fillAddressCph (page, journey) {
  await expect(page).toHaveURL(/\/create\/address-cph$/)
  await fillText(page, 'cphNumber', journey.cphNumber)
  await clickContinue(page)
}

async function fillPermanentAddresses (page) {
  await expect(page).toHaveURL(/\/create\/permanent-addresses-for-animals$/)
  await pickRadio(page, 'permanentAddressSameAsPOD', 'yes')
  await clickContinue(page)
}

async function fillTransportAndArrival (page, journey) {
  await expect(page).toHaveURL(/\/create\/transport-and-arrival$/)
  await clickAt(page.getByRole('link', { name: 'Add a transporter' }))
  await pause(page, STEP_PAUSE)
  await searchAndSelectAddress(page, journey.transporter)
  await expect(page).toHaveURL(/\/create\/transport-and-arrival$/)

  await pickFromAutocomplete(page, 'ukBorderPort', journey.port.search, journey.port.option)
  await fillDateInput(page.locator('#arrivalDate'), isoDateInDays(journey.arrivalInDays))
  await clickContinue(page)
}

async function fillAccompanyingDocuments (page, journey) {
  await expect(page).toHaveURL(/\/create\/accompanying-documents$/)
  await selectValue(page, 'document-type-0', journey.documentType)
  await fillText(page, 'documentReference_0', journey.documentReference)
  await fillDateInput(page.locator('#document-date-0'), isoDateInDays(-journey.documentIssuedDaysAgo))
  await clickContinue(page) // -> /create/check-your-answers
}

async function submitCheckYourAnswers (page) {
  await expect(page).toHaveURL(/\/create\/check-your-answers$/)
  await pause(page, STEP_PAUSE)
  await clickContinue(page) // "Confirm and submit" -> /create/declaration
}

async function fillDeclaration (page) {
  await expect(page).toHaveURL(/\/create\/declaration$/)
  await checkAt(page.locator('#declaration-accepted'))
  await pause(page, FIELD_PAUSE)
  await clickContinue(page) // "Submit notification" -> /create/confirmation
}

async function readConfirmationReference (page) {
  await expect(page).toHaveURL(/\/create\/confirmation$/)
  await pause(page, STEP_PAUSE)
  const reference = (await page.locator('#reference-number').textContent() || '').trim()
  return reference
}

// Closes the loop back inside /intro: lands on the dashboard, filters to the
// notification just submitted (session data is shared between /intro and
// /v1-baseline, so it already appears there) and opens its read-only view.
async function viewSubmittedNotificationFromIntroDashboard (page, reference) {
  await page.goto('/intro/dashboard')
  await pause(page, STEP_PAUSE)
  await typeInto(page.locator('#filterKeyword'), reference)
  await clickAt(page.getByRole('button', { name: 'Search filters' }))
  await pause(page, STEP_PAUSE)
  const card = page.locator('.govuk-summary-card', { hasText: reference })
  await expect(card).toBeVisible()
  await clickAt(card.getByRole('link', { name: 'View' }))
  await pause(page, STEP_PAUSE)
  await expect(page).toHaveURL(/\/intro\/notification\//)
}

module.exports = {
  JOURNEYS,
  pause,
  scrollTo,
  clickAt,
  checkAt,
  resetSession,
  fillImportNotificationStart,
  fillSignIn,
  goToCreateFromDashboard,
  fillOrigin,
  fillCommodity,
  fillCommoditySpecies,
  fillAnimalIdentification,
  fillCommodityHub,
  goToAdditionalAnimalDetailsFromTaskList,
  fillAdditionalAnimalDetails,
  fillImportReason,
  fillAddresses,
  fillAddressCph,
  fillPermanentAddresses,
  fillTransportAndArrival,
  fillAccompanyingDocuments,
  submitCheckYourAnswers,
  fillDeclaration,
  readConfirmationReference,
  viewSubmittedNotificationFromIntroDashboard
}
