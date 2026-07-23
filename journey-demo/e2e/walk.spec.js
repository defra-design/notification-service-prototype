const { test, expect } = require('@playwright/test')
const journeyHelpers = require('./journey')

const {
  pause,
  resetSession,
  goToIntroIndexAndStartJourney,
  followAnimalsAndAnimalProductsGuidance,
  goToImportNotificationServiceFromGuidance,
  fillImportNotificationStart,
  fillSignIn,
  viewNotificationFromDashboard,
  viewNotificationFromDashboardTwo,
  goBackToDashboard
} = journeyHelpers

// Two demo walks, both confined entirely to pages under app/views/intro/* — no
// /v1-baseline/create/* page is ever visited. The video + trace are the
// deliverable; the assertions pin the URL/heading at each step so the walk
// fails fast (with a useful error-context snapshot) if a page or link has
// drifted.

test.describe('walk — /intro guidance to sign-in and dashboard', () => {
  test('follows the step-by-step guidance through to sign-in, then views an existing notification on the /intro dashboard', async ({ page }) => {
    await resetSession(page)

    // --- step-by-step guidance replica ---
    await goToIntroIndexAndStartJourney(page)
    await followAnimalsAndAnimalProductsGuidance(page)
    await goToImportNotificationServiceFromGuidance(page)

    // --- INS start page -> sign in -> dashboard ---
    await fillImportNotificationStart(page)
    await fillSignIn(page)
    await expect(page).toHaveURL(/\/intro\/dashboard$/)

    // --- view an existing (CHED A) mock notification, then return ---
    await viewNotificationFromDashboard(page, 'CHEDA.GB.2026.1000608')
    await expect(page.getByRole('heading', { name: 'Notification details' })).toBeVisible()
    await pause(page, 1500)

    await goBackToDashboard(page)
    await pause(page, 800)
  })
})

test.describe('walk — /intro dashboard-two: search, filter, and view a plant notification', () => {
  test('filters dashboard-two to a CHED PP notification and opens its read-only plant view', async ({ page }) => {
    await resetSession(page)

    await viewNotificationFromDashboardTwo(page, 'CHEDPP.GB.2026.1000145')
    await expect(page.getByRole('heading', { name: 'Notification details' })).toBeVisible()

    // Confirms this reference rendered through the plant-specific view (EPPO-coded
    // commodity table), not the animal/CHED-A shaped one.
    await expect(page.getByText('EPPO code')).toBeVisible()
    await pause(page, 1500)
  })
})
