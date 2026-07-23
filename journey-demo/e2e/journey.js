//
// Page-object helpers for the /intro journey demo walk.
//
// Scoped entirely to pages under app/views/intro/* — the guidance/step-by-step
// pages, the sign-in front door, and both dashboard variants. Nothing here
// drives the /v1-baseline/create/* notification-creation journey; "Create"
// links on the dashboards lead out of /intro and are deliberately not
// followed.
//
const { expect } = require('@playwright/test')

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

// Types a value character by character into a text box, as a person would.
async function typeInto (locator, value) {
  await scrollTo(locator)
  await locator.click()
  await locator.fill('')
  await locator.pressSequentially(String(value), { delay: TYPE_DELAY })
}

async function fillText (page, name, value) {
  await typeInto(page.locator(`input[name="${name}"]`).first(), value)
  await pause(page, FIELD_PAUSE)
}

// Clicks the page's primary forward button/link, whichever label this app uses
// for it on /intro pages. "Start journey" (index.html) is a plain <a>, but
// "Start now" and "Sign in" are both rendered via the govukButton macro, which
// always sets role="button" even on an <a> — so match both roles for all three.
const PRIMARY_ACTION_NAME = /start journey|start now|sign in/i
async function clickContinue (page) {
  const button = page
    .getByRole('link', { name: PRIMARY_ACTION_NAME })
    .or(page.getByRole('button', { name: PRIMARY_ACTION_NAME }))
    .first()
  await clickAt(button)
  await pause(page, STEP_PAUSE)
}

// --- /intro walk ------------------------------------------------------------

async function resetSession (page) {
  await page.goto('/clear-data')
  await pause(page, 400)
}

// /intro's own index page — a menu of the journey's key entry points.
async function goToIntroIndexAndStartJourney (page) {
  await page.goto('/intro')
  await expect(page.getByRole('heading', { name: 'Product introduction' })).toBeVisible()
  await pause(page, STEP_PAUSE)
  await clickContinue(page) // "Start journey" -> /intro/import-goods-into-uk
}

// The step-by-step guidance replica page links out to one licence-guidance
// page per goods category (animals and animal products, plants and plant
// products, etc.) — follow the "animals and animal products" one.
async function followAnimalsAndAnimalProductsGuidance (page) {
  await expect(page).toHaveURL(/\/intro\/import-goods-into-uk$/)
  await expect(page.getByRole('heading', { name: 'Import goods into the UK: step by step' })).toBeVisible()
  await pause(page, STEP_PAUSE)
  // The licence-guidance links (including "animals and animal products") sit
  // inside Step 6's collapsed step-nav panel, so expand every step first.
  await clickAt(page.getByRole('button', { name: 'Show all steps' }))
  await pause(page, FIELD_PAUSE)
  await clickAt(page.getByRole('link', { name: 'animals and animal products' }))
  await pause(page, STEP_PAUSE) // -> /intro/animals-and-animal-products
}

// That licence-guidance page itself links on to the Import Notification
// Service start page.
async function goToImportNotificationServiceFromGuidance (page) {
  await expect(page).toHaveURL(/\/intro\/animals-and-animal-products$/)
  await expect(page.getByRole('heading', { name: 'Guidance on importing live animals or animal products' })).toBeVisible()
  await pause(page, STEP_PAUSE)
  await clickAt(page.getByRole('link', { name: 'Import Notification Service (INS)' }))
  await pause(page, STEP_PAUSE) // -> /intro/import-notification-start
}

async function fillImportNotificationStart (page) {
  await expect(page).toHaveURL(/\/intro\/import-notification-start$/)
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

// Filters the (original) /intro dashboard to a specific reference and opens
// its read-only view.
async function viewNotificationFromDashboard (page, reference) {
  await page.goto('/intro/dashboard')
  await pause(page, STEP_PAUSE)
  await typeInto(page.locator('#filterKeyword'), reference)
  await clickAt(page.getByRole('button', { name: 'Search filters' }))
  await pause(page, STEP_PAUSE)
  const card = page.locator('.govuk-summary-card', { hasText: reference })
  await expect(card).toBeVisible()
  await clickAt(card.getByRole('link', { name: 'View', exact: true }))
  await pause(page, STEP_PAUSE)
  await expect(page).toHaveURL(/\/intro\/notification\//)
}

// Same idea, but against the "dashboard two" design exploration, whose search
// box submits via an icon-only button and whose card link reads "View
// notification" rather than plain "View".
async function viewNotificationFromDashboardTwo (page, reference) {
  await page.goto('/intro/dashboard-two')
  await pause(page, STEP_PAUSE)
  await typeInto(page.locator('#filterKeyword'), reference)
  await clickAt(page.getByRole('button', { name: 'Search', exact: true }))
  await pause(page, STEP_PAUSE)
  const card = page.locator('.dashboard-two-card', { hasText: reference })
  await expect(card).toBeVisible()
  await clickAt(card.getByRole('link', { name: 'View notification' }))
  await pause(page, STEP_PAUSE)
  await expect(page).toHaveURL(/\/intro\/notification\//)
}

// The notification-details read-only page's back link returns to the
// (original) /intro dashboard.
async function goBackToDashboard (page) {
  await clickAt(page.getByRole('link', { name: 'Back' }))
  await pause(page, STEP_PAUSE)
  await expect(page).toHaveURL(/\/intro\/dashboard$/)
}

module.exports = {
  pause,
  scrollTo,
  clickAt,
  resetSession,
  goToIntroIndexAndStartJourney,
  followAnimalsAndAnimalProductsGuidance,
  goToImportNotificationServiceFromGuidance,
  fillImportNotificationStart,
  fillSignIn,
  viewNotificationFromDashboard,
  viewNotificationFromDashboardTwo,
  goBackToDashboard
}
