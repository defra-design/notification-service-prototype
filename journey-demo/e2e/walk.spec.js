const { test, expect } = require('@playwright/test')
const journeyHelpers = require('./journey')

const {
  JOURNEYS,
  pause,
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
} = journeyHelpers

// One demo walk per journey variant, starting from the /intro front door. The
// video + trace are the deliverable; the assertions pin the URL at each step so
// the walk fails fast (with a useful error-context snapshot) if a page or field
// name has drifted, and confirm the journey reached confirmation and that the
// submitted notification is visible back inside /intro.
for (const journey of JOURNEYS) {
  test.describe(`walk — ${journey.label}`, () => {
    test('signs in via /intro, creates a notification end to end, and views it back on the /intro dashboard', async ({ page }) => {
      await resetSession(page)

      // --- /intro front door ---
      await fillImportNotificationStart(page)
      await fillSignIn(page)
      await goToCreateFromDashboard(page)

      // --- /v1-baseline/create/* — section 1: commodity + origin ---
      await fillOrigin(page, journey)
      await fillCommodity(page, journey)
      if (!journey.commodity.skipSpeciesPage) {
        await fillCommoditySpecies(page, journey)
      }
      await fillAnimalIdentification(page, journey)
      await fillCommodityHub(page)

      // --- task list (first visit, unlocked by finishing the first commodity) ---
      await goToAdditionalAnimalDetailsFromTaskList(page)

      // --- remainder of the journey chains on automatically from here ---
      await fillAdditionalAnimalDetails(page, journey)
      await fillImportReason(page, journey)
      await fillAddresses(page, journey)

      if (journey.addressBranch === 'cph') {
        await fillAddressCph(page, journey)
      } else {
        await fillPermanentAddresses(page)
      }

      await fillTransportAndArrival(page, journey)
      await fillAccompanyingDocuments(page, journey)
      await submitCheckYourAnswers(page)
      await fillDeclaration(page)

      const reference = await readConfirmationReference(page)
      expect(reference).toMatch(/^IMP\.GB\.\d{4}\.\d+$/)

      // --- close the loop back inside /intro ---
      await viewSubmittedNotificationFromIntroDashboard(page, reference)
      await expect(page.getByRole('heading', { name: 'Notification details' })).toBeVisible()
      await pause(page, 1500)
    })
  })
}

// A short second walk that shows another of /intro's own routes — opening an
// existing mock notification straight from the dashboard in its read-only
// view — without needing to fill the whole create form again.
test.describe('walk — /intro dashboard: view an existing notification', () => {
  test('opens a submitted mock notification from the dashboard in read-only view', async ({ page }) => {
    const reference = 'CHEDA.GB.2026.1000892'

    await resetSession(page)
    await page.goto('/intro/dashboard')
    await pause(page, 1300)

    // The dataset paginates at 20 rows, so filter to this reference rather than
    // assuming it falls on page 1.
    await page.locator('#filterKeyword').fill(reference)
    await pause(page, 400)
    await page.getByRole('button', { name: 'Search filters' }).click()
    await pause(page, 1300)

    const card = page.locator('.govuk-summary-card', { hasText: reference })
    await card.scrollIntoViewIfNeeded()
    await pause(page, 400)
    await card.getByRole('link', { name: 'View' }).click()
    await pause(page, 1300)

    await expect(page).toHaveURL(new RegExp(`/intro/notification/${reference.replace(/\./g, '\\.')}$`))
    await expect(page.getByRole('heading', { name: 'Notification details' })).toBeVisible()
    await pause(page, 1500)
  })
})
