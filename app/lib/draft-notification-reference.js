//
// Session-scoped draft IMP reference for in-progress notifications (task list / dashboard)
//

function assignDraftNotificationReferenceIfNeeded (data) {
  if (!data) return
  if (data.draftNotificationReference && String(data.draftNotificationReference).trim() !== '') return
  const year = new Date().getFullYear()
  const suffix = String(Math.floor(1000000 + Math.random() * 9000000))
  data.draftNotificationReference = `IMP.GB.${year}.${suffix}`
}

module.exports = { assignDraftNotificationReferenceIfNeeded }
