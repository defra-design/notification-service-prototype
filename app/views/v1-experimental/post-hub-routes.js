//
// Post-hub routes – animal identification through confirmation (reuses v1-baseline create templates)
//

const { PET_COMMODITIES, getCommoditySpeciesArray, isPetConsignment, isLivestockConsignment } = require('../../lib/create-helpers.js')
const { assignDraftNotificationReferenceIfNeeded } = require('../../lib/draft-notification-reference.js')

function formatDate (isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return isoDate || 'Not provided'
  const [y, m, d] = isoDate.split('-').map(Number)
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return `${d} ${months[m - 1]} ${y}`
}

function getPermanentAddressViewData (data) {
  const commoditiesEu = require('../../data/commodities-eu.js')
  const names = Array.isArray(data.commodities) && data.commodities.length > 0
    ? data.commodities.map(c => c.commodity).filter(Boolean)
    : (data.commodity ? [data.commodity] : [])
  const firstPet = names.find(n => PET_COMMODITIES.has(n))
  const details = firstPet ? commoditiesEu[firstPet] : null
  const animalLabel = details ? (details.commonName || firstPet) : null
  const podParts = []
  if (data.placeOfDestinationName) podParts.push(data.placeOfDestinationName)
  if (data.placeOfDestinationAddress) {
    const addr = Array.isArray(data.placeOfDestinationAddress) ? data.placeOfDestinationAddress.join(', ') : data.placeOfDestinationAddress
    podParts.push(addr)
  } else if (data.placeOfDestinationAddressLine1) {
    const lines = [data.placeOfDestinationAddressLine1, data.placeOfDestinationAddressLine2, data.placeOfDestinationTown, data.placeOfDestinationPostcode].filter(Boolean)
    podParts.push(lines.join(', '))
  }
  if (data.placeOfDestinationCountry) podParts.push(data.placeOfDestinationCountry)
  const podAddressDisplay = podParts.length ? podParts.join(', ') : null
  const podAddressLines = podParts
  return { animalLabel, podAddressDisplay, podAddressLines }
}

function buildCheckYourAnswersData (data, base) {
  const row = (key, value) => ({ key: { text: key }, value: { text: value } })
  const rowHtml = (key, html) => ({ key: { text: key }, value: { html } })
  const escapeHtml = (s) => typeof s !== 'string' ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
  const formatAddressHtml = (name, address, country) => {
    const parts = []
    if (name) parts.push(`<strong>${escapeHtml(name)}</strong>`)
    const addrLines = Array.isArray(address) ? address.filter(Boolean) : (address ? String(address).split(',').map(s => s.trim()).filter(Boolean) : [])
    addrLines.forEach(line => parts.push(escapeHtml(line)))
    if (country) parts.push(escapeHtml(country))
    return parts.length ? parts.join('<br>') : 'Not provided'
  }
  const documentTypes = require('../../data/document-types.js')
  const getDocumentTypeLabel = (val) => (documentTypes.find(d => d.value === val) || {}).text || val || 'Not provided'

  const originRows = [
    row('Country of origin', data.countryOfOrigin || 'Not provided'),
    row('Region of consignment', data.regionOfOriginRequired === 'yes' ? (data.regionOfOriginCode || data.regionOfOrigin || 'Not provided') : 'Not required')
  ]
  const refNum = (data.consignmentReference || '').trim()
  if (refNum) originRows.push(row('Your internal reference number', refNum))

  const { getInternalMarketPurposeLabel } = require('../../data/internal-market-purposes.js')
  const mainReasonLabels = {
    'internal-market': 'Internal market',
    're-entry': 'Re-entry',
    transit: 'Transit',
    'temporary-admission-horses': 'Temporary admission horses',
    breeding: 'Breeding',
    'racing-competition': 'Racing, competition, show or training'
  }
  const mainReasonLabel = mainReasonLabels[data.importReason] || data.importReason || 'Not provided'
  const importReasonRows = [row('Main reason for importing the animals', mainReasonLabel)]
  if (data.importReason === 'internal-market' && data.internalMarketPurpose) {
    importReasonRows.push(row('Purpose in the internal market', getInternalMarketPurposeLabel(data.internalMarketPurpose)))
  }

  const commoditiesData = require('../../data/commodities.js')
  const commoditiesEu = require('../../data/commodities-eu.js')
  const toKey = (s) => String(s || '').replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '')
  const commodities = Array.isArray(data.commodities) ? data.commodities : []
  const commodityDetails = data.commodity ? (commoditiesEu[data.commodity] || commoditiesData[data.commodity]) : null
  const descriptionSummaryRows = []
  const uniqueCommodityKeys = [...new Set(commodities.map(c => c.commodity).filter(Boolean))]
  if (uniqueCommodityKeys.length === 1 && commodityDetails) {
    descriptionSummaryRows.push(row('Commodity code', commodityDetails.code || 'Not provided'))
    descriptionSummaryRows.push(row('Common name', commodityDetails.commonName || data.commodity || 'Not provided'))
    descriptionSummaryRows.push(row('Classification', commodityDetails.description || 'Not provided'))
  } else if (uniqueCommodityKeys.length === 1 && data.commodity) {
    descriptionSummaryRows.push(row('Commodity', data.commodity))
  } else if (uniqueCommodityKeys.length > 1) {
    const codes = uniqueCommodityKeys.map(k => (commoditiesEu[k] || commoditiesData[k])?.code || k).filter(Boolean)
    const names = uniqueCommodityKeys.map(k => (commoditiesEu[k] || commoditiesData[k])?.commonName || k)
    if (codes.length > 0) descriptionSummaryRows.push(row('Commodity codes', codes.join(', ')))
    if (names.length > 0) descriptionSummaryRows.push(row('Species', names.join(', ')))
  } else if (commodities.length === 0 && data.commodity) {
    if (commodityDetails) {
      descriptionSummaryRows.push(row('Commodity code', commodityDetails.code || 'Not provided'))
      descriptionSummaryRows.push(row('Common name', commodityDetails.commonName || data.commodity || 'Not provided'))
      descriptionSummaryRows.push(row('Classification', commodityDetails.description || 'Not provided'))
    } else {
      descriptionSummaryRows.push(row('Commodity', data.commodity))
    }
  }
  const rawSpecies = data.commoditySpecies
  const commoditySpecies = Array.isArray(rawSpecies) ? rawSpecies : (rawSpecies ? [rawSpecies] : [])
  const typeLabel = data.commodityType === 'game' ? 'Game' : 'Domestic'
  const descriptionTableRows = []
  let totalAnimals = 0
  let totalPackages = 0
  if (commodities.length > 0) {
    commodities.forEach((item) => {
      const type = item.commodityType === 'game' ? 'Game' : 'Domestic'
      const quantities = item.quantities || {}
      ;(item.commoditySpecies || []).forEach(s => {
        const key = toKey(s)
        const qty = parseInt(quantities[`quantity_${key}`], 10) || 0
        const pkg = parseInt(quantities[`packages_${key}`], 10) || 0
        totalAnimals += qty
        totalPackages += pkg
        descriptionTableRows.push([
          { text: `${s}, ${type}` },
          { text: String(qty), format: 'numeric' },
          { text: String(pkg), format: 'numeric' }
        ])
      })
    })
  } else {
    commoditySpecies.forEach(s => {
      const key = toKey(s)
      const qty = parseInt(data[`quantity_${key}`], 10) || 0
      const pkg = parseInt(data[`packages_${key}`], 10) || 0
      totalAnimals += qty
      totalPackages += pkg
      descriptionTableRows.push([
        { text: `${s}, ${typeLabel}` },
        { text: String(qty), format: 'numeric' },
        { text: String(pkg), format: 'numeric' }
      ])
    })
  }
  const hasNoDescriptionData = !data.commodity && commoditySpecies.length === 0 && commodities.length === 0
  if (hasNoDescriptionData) {
    descriptionTableRows.length = 0
    descriptionTableRows.push(
      [{ text: 'Bos taurus, Domestic' }, { text: '24', format: 'numeric' }, { text: '3', format: 'numeric' }],
      [{ text: 'Total', classes: 'govuk-table__header' }, { text: '24', format: 'numeric' }, { text: '3', format: 'numeric' }]
    )
  } else if (descriptionTableRows.length > 0) {
    descriptionTableRows.push([
      { text: 'Total', classes: 'govuk-table__header' },
      { text: String(totalAnimals), format: 'numeric' },
      { text: String(totalPackages), format: 'numeric' }
    ])
  }

  const cphRows = [row('County Parish Holding number (CPH)', data.cphNumber || 'Not provided')]

  const permAddrLines = [data.permanentAddressLine1, data.permanentAddressLine2, data.permanentAddressLine3, data.permanentAddressTown, data.permanentAddressPostcode].filter(Boolean)
  const permanentAddressHtml = data.permanentAddressSameAsPOD === 'yes'
    ? 'Same as place of destination'
    : formatAddressHtml(data.permanentAddressName, permAddrLines, null)
  const permanentAddressRows = [rowHtml('Permanent address', permanentAddressHtml || 'Not provided')]
  if (data.permanentAddressSameAsPOD !== 'yes' && data.permanentAddressTelephone) {
    permanentAddressRows.push(row('Telephone number', data.permanentAddressTelephone))
  }
  if (data.permanentAddressSameAsPOD !== 'yes' && data.permanentAddressEmail) {
    permanentAddressRows.push(row('Email address', data.permanentAddressEmail))
  }

  const allSpeciesForId = []
  if (commodities.length > 0) {
    commodities.forEach((item) => {
      const type = item.commodityType === 'game' ? 'Game' : 'Domestic'
      const quantities = item.quantities || {}
      const details = item.commodity ? (commoditiesEu[item.commodity] || commoditiesData[item.commodity]) : null
      const codeNorm = details && details.code ? String(details.code).replace(/\s/g, '') : ''
      const isEarTagOnly = details && ['010410', '0103'].includes(details.code)
      const isHorseIdentification = details && details.code === '0101' && item.commodity === 'Horse'
      const isPetIdentification = codeNorm === '01061900' && (item.commodity === 'Cat' || item.commodity === 'Dog')
      ;(item.commoditySpecies || []).forEach((s) => {
        allSpeciesForId.push({ speciesName: s, speciesAndType: `${s}, ${type}`, key: toKey(s), quantities, isEarTagOnly, isHorseIdentification, isPetIdentification })
      })
    })
  } else {
    const details = commodityDetails
    const codeNorm = details && details.code ? String(details.code).replace(/\s/g, '') : ''
    const isEarTagOnly = details && ['010410', '0103'].includes(details.code)
    const isHorseIdentification = details && details.code === '0101' && data.commodity === 'Horse'
    const isPetIdentification = codeNorm === '01061900' && (data.commodity === 'Cat' || data.commodity === 'Dog')
    commoditySpecies.forEach((s) => {
      allSpeciesForId.push({
        speciesName: s,
        speciesAndType: `${s}, ${typeLabel}`,
        key: toKey(s),
        quantities: {},
        isEarTagOnly,
        isHorseIdentification,
        isPetIdentification
      })
    })
  }

  const animalIdentificationGroups = []
  for (const spec of allSpeciesForId) {
    const key = spec.key
    const animalCount = parseInt(data[`animalCount_${key}`] || spec.quantities[`quantity_${key}`] || data[`quantity_${key}`], 10) || 1
    const identificationRows = []
    if (spec.isHorseIdentification) {
      for (let i = 1; i <= animalCount; i++) {
        const microchip = data[`microchip_${key}_${i}`] || '-'
        const passport = data[`passport_${key}_${i}`] || '-'
        if (i === 1 && microchip === '-' && passport === '-') break
        if (microchip === '-' && passport === '-') break
        identificationRows.push({ microchip, passport })
      }
      const useTable = identificationRows.length > 0
      const tableRows = identificationRows.map((r, i) => [
        { text: `${spec.speciesName} ${i + 1}` },
        { text: r.microchip },
        { text: r.passport }
      ])
      const summaryRows = []
      if (!identificationRows.length) {
        summaryRows.push(row('Details', 'Not yet provided'))
      } else if (!useTable) {
        summaryRows.push(rowHtml('Method of identification', 'Microchip<br>Passport'))
        identificationRows.forEach((r, i) => {
          summaryRows.push(row(`Animal ${i + 1} – Microchip`, r.microchip))
          summaryRows.push(row(`Animal ${i + 1} – Passport`, r.passport))
        })
      }
      animalIdentificationGroups.push({
        speciesLabel: spec.speciesAndType,
        tableRows,
        summaryRows,
        useTable,
        isEarTagOnly: false,
        isHorseIdentification: true,
        isPetIdentification: false
      })
      continue
    }
    if (spec.isPetIdentification) {
      for (let i = 1; i <= animalCount; i++) {
        const microchip = data[`microchip_${key}_${i}`] || '-'
        const passport = data[`passport_${key}_${i}`] || '-'
        const tattoo = data[`tattoo_${key}_${i}`] || '-'
        if (i === 1 && microchip === '-' && passport === '-' && tattoo === '-') break
        if (microchip === '-' && passport === '-' && tattoo === '-') break
        identificationRows.push({ microchip, passport, tattoo })
      }
      const useTable = identificationRows.length > 0
      const tableRows = identificationRows.map((r, i) => [
        { text: `${spec.speciesName} ${i + 1}` },
        { text: r.microchip },
        { text: r.passport },
        { text: r.tattoo }
      ])
      const summaryRows = []
      if (!identificationRows.length) {
        summaryRows.push(row('Details', 'Not yet provided'))
      } else if (!useTable) {
        summaryRows.push(rowHtml('Method of identification', 'Microchip<br>Passport<br>Tattoo'))
        identificationRows.forEach((r, i) => {
          summaryRows.push(row(`Animal ${i + 1} – Microchip`, r.microchip))
          summaryRows.push(row(`Animal ${i + 1} – Passport`, r.passport))
          summaryRows.push(row(`Animal ${i + 1} – Tattoo`, r.tattoo))
        })
      }
      animalIdentificationGroups.push({
        speciesLabel: spec.speciesAndType,
        tableRows,
        summaryRows,
        useTable,
        isEarTagOnly: false,
        isHorseIdentification: false,
        isPetIdentification: true
      })
      continue
    }
    for (let i = 1; i <= animalCount; i++) {
      const earTag = data[`earTag_${key}_${i}`] || '-'
      const passport = spec.isEarTagOnly ? null : (data[`passport_${key}_${i}`] || '-')
      if (spec.isEarTagOnly) {
        if (i === 1 && earTag === '-') break
        if (earTag === '-') break
        identificationRows.push({ earTag, passport: null })
      } else {
        if (i === 1 && earTag === '-' && passport === '-') break
        if (earTag === '-' && passport === '-') break
        identificationRows.push({ earTag, passport })
      }
    }
    const useTable = identificationRows.length > 0
    const tableRows = spec.isEarTagOnly
      ? identificationRows.map((r, i) => [{ text: `${spec.speciesName} ${i + 1}` }, { text: r.earTag }])
      : identificationRows.map((r, i) => [{ text: `${spec.speciesName} ${i + 1}` }, { text: r.earTag }, { text: r.passport }])
    const summaryRows = []
    if (!identificationRows.length) {
      summaryRows.push(row('Details', 'Not yet provided'))
    } else if (!useTable) {
      summaryRows.push(rowHtml('Method of identification', spec.isEarTagOnly ? 'Ear tag' : 'Ear tag<br>Passport'))
      identificationRows.forEach((r, i) => {
        summaryRows.push(row(`Animal ${i + 1} – Ear tag`, r.earTag))
        if (!spec.isEarTagOnly) summaryRows.push(row(`Animal ${i + 1} – Passport`, r.passport))
      })
    }
    animalIdentificationGroups.push({
      speciesLabel: spec.speciesAndType,
      tableRows,
      summaryRows,
      useTable,
      isEarTagOnly: spec.isEarTagOnly,
      isHorseIdentification: false,
      isPetIdentification: false
    })
  }

  if (animalIdentificationGroups.length === 0) {
    animalIdentificationGroups.push({
      speciesLabel: '',
      tableRows: [],
      summaryRows: [row('Details', 'Not yet provided')],
      useTable: false,
      isEarTagOnly: false,
      isHorseIdentification: false,
      isPetIdentification: false
    })
  }

  const commodityIdCards = []
  let idGroupIndex = 0
  if (commodities.length > 0) {
    commodities.forEach((item) => {
      const d = item.commodity ? (commoditiesEu[item.commodity] || commoditiesData[item.commodity]) : {}
      const type = (item.commodityType || 'domestic') === 'game' ? 'Game' : 'Domestic'
      const quantities = item.quantities || {}
      const species = []
      ;(item.commoditySpecies || []).forEach((s) => {
        const key = toKey(s)
        const qty = parseInt(quantities[`quantity_${key}`], 10) || 0
        const pkg = parseInt(quantities[`packages_${key}`], 10) || 0
        const speciesAndType = `${s}, ${type}`
        const group = animalIdentificationGroups[idGroupIndex++]
        if (!group || qty === 0) return
        species.push({
          speciesAndType,
          animalCount: qty,
          packageCount: pkg,
          quantitySummaryRows: [
            { key: { text: 'Number of animals' }, value: { text: String(qty) } },
            { key: { text: 'Number of packages' }, value: { text: String(pkg) } }
          ],
          idTableRows: group.tableRows || [],
          isEarTagOnly: group.isEarTagOnly,
          isHorseIdentification: !!group.isHorseIdentification,
          isPetIdentification: !!group.isPetIdentification
        })
      })
      if (species.length > 0) {
        commodityIdCards.push({
          commonName: d.commonName || item.commodity || 'Not provided',
          commodityCode: d.code || '',
          species
        })
      }
    })
  } else if (data.commodity && commoditySpecies.length > 0) {
    const d = commodityDetails || {}
    const quantities = data
    const species = []
    commoditySpecies.forEach((s) => {
      const key = toKey(s)
      const qty = parseInt(data[`quantity_${key}`], 10) || 0
      const pkg = parseInt(data[`packages_${key}`], 10) || 0
      const speciesAndType = `${s}, ${typeLabel}`
      const group = animalIdentificationGroups[idGroupIndex++]
      if (!group || qty === 0) return
      species.push({
        speciesAndType,
        animalCount: qty,
        packageCount: pkg,
        quantitySummaryRows: [
          { key: { text: 'Number of animals' }, value: { text: String(qty) } },
          { key: { text: 'Number of packages' }, value: { text: String(pkg) } }
        ],
        idTableRows: group.tableRows || [],
        isEarTagOnly: group.isEarTagOnly,
        isHorseIdentification: !!group.isHorseIdentification,
        isPetIdentification: !!group.isPetIdentification
      })
    })
    if (species.length > 0) {
      commodityIdCards.push({
        commonName: d.commonName || data.commodity || 'Not provided',
        commodityCode: d.code || '',
        species
      })
    }
  }

  const certifiedForOptions = require('../../data/certified-for-options.js')
  const certOpt = Array.isArray(certifiedForOptions) ? certifiedForOptions.find(o => o.value === data.animalsCertifiedFor) : null
  const certifiedForLabel = certOpt ? certOpt.text : (data.animalsCertifiedFor || 'Not provided')
  const showUnweaned = data.commodity !== 'Dog'
  const unweanedLabel = data.unweanedAnimals === 'yes' ? 'Yes' : data.unweanedAnimals === 'no' ? 'No' : 'Not provided'
  const additionalAnimalRows = [row('Certified for', certifiedForLabel)]
  if (showUnweaned) additionalAnimalRows.push(row('Unweaned animals', unweanedLabel))

  const docs = data.documents || []
  const cell = (t) => ({ text: String(t ?? '-') })
  let documentsTableRows = docs.filter(d => d.type).map(d => [
    cell(getDocumentTypeLabel(d.type)),
    cell(d.reference),
    cell(d.date ? formatDate(d.date) : '-'),
    cell((d.attachments && d.attachments.length) ? `${d.attachments.length} attachment${d.attachments.length !== 1 ? 's' : ''}` : '-')
  ])
  if (documentsTableRows.length === 0) {
    documentsTableRows = [
      [cell('Veterinary health certificate'), cell('VHC-2024-001'), cell('14 June 2025'), cell('1 attachment')],
      [cell('Commercial invoice'), cell('INV-7892'), cell('14 June 2025'), cell('-')],
      [cell('Import permit'), cell('GB-IMP-2024-456'), cell('1 September 2025'), cell('2 attachments')]
    ]
  }

  const selectedConsignor = data.consignor || (data.consignorName && { name: data.consignorName, address: data.consignorAddress, country: data.consignorCountry })
  const consignorAddr = formatAddressHtml(selectedConsignor?.name || data.consignorName, selectedConsignor?.address || data.consignorAddress, selectedConsignor?.country || data.consignorCountry)
  const consigneeAddr = (() => {
    const hasFromSearch = data.consigneeId && data.consigneeName && data.consigneeAddress && data.consigneeCountry
    const hasFromForm = data.consigneeName && data.consigneeAddressLine1 && data.consigneeTown && data.consigneePostcode
    if (hasFromSearch) {
      return formatAddressHtml(data.consigneeName, data.consigneeAddress, data.consigneeCountry)
    }
    if (hasFromForm) {
      const lines = [data.consigneeAddressLine1, data.consigneeAddressLine2, data.consigneeTown].filter(Boolean)
      if (data.consigneePostcode) lines.push(data.consigneePostcode + ' United Kingdom')
      return formatAddressHtml(data.consigneeName, lines, null)
    }
    return 'Not provided'
  })()
  const importerAddr = data.importerAddress
    ? formatAddressHtml(data.importerName, data.importerAddress, data.importerCountry)
    : formatAddressHtml(data.importerName, [data.importerAddressLine1, data.importerAddressLine2, data.importerTown, data.importerPostcode].filter(Boolean), null) || (data.importerName ? formatAddressHtml(data.importerName, null, null) : 'Not provided')
  const placeAddr = data.placeOfDestinationAddress
    ? formatAddressHtml(data.placeOfDestinationName, data.placeOfDestinationAddress, data.placeOfDestinationCountry)
    : formatAddressHtml(data.placeOfDestinationName, [data.placeOfDestinationAddressLine1, data.placeOfDestinationAddressLine2, data.placeOfDestinationTown, data.placeOfDestinationPostcode].filter(Boolean), null) || (data.placeOfDestinationName ? formatAddressHtml(data.placeOfDestinationName, null, null) : 'Not provided')

  const addressRows = [
    rowHtml('Consignee/exporter', consignorAddr),
    rowHtml('Consignee', consigneeAddr),
    rowHtml('Importer', importerAddr),
    rowHtml('Place of destination', placeAddr)
  ]
  if (data.consigneeBusinessRegistration) {
    addressRows.push(row('Consignee business registration', data.consigneeBusinessRegistration))
  }

  const contactAddresses = require('../../data/contact-addresses.js')
  const additional = Array.isArray(data.contactAddressesAdditional) ? data.contactAddressesAdditional : []
  const allContactAddresses = [...contactAddresses, ...additional]
  const selectedContact = data.contactAddressId && allContactAddresses.find(c => String(c.id) === String(data.contactAddressId))
  const contactAddrHtml = selectedContact
    ? formatAddressHtml(selectedContact.name, selectedContact.addressLines || [], selectedContact.country)
    : (data.consignorName ? formatAddressHtml(data.consignorName, data.consignorAddress, data.consignorCountry) : 'Not provided')
  addressRows.push(rowHtml('Contact details for consignment', contactAddrHtml))

  let transporterTypeDisplay = data.transporterType
  if (!transporterTypeDisplay) {
    const consignees = require('../../data/consignees.js')
    const normalize = (s) => (s || '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ')
    const nameA = normalize(data.transporterName)
    const addrA = normalize(data.transporterAddress)
    const transporterRecord = data.transporterId
      ? consignees.find(c => String(c.id) === String(data.transporterId))
      : consignees.find(c => {
          const matchName = c.name && nameA && normalize(c.name) === nameA
          const matchAddr = c.address && addrA && normalize(c.address) === addrA
          return matchName || matchAddr
        })
    transporterTypeDisplay = transporterRecord && transporterRecord.transporterType ? transporterRecord.transporterType : null
  }
  transporterTypeDisplay = transporterTypeDisplay
    ? (transporterTypeDisplay === 'Commercial transporter'
      ? 'Commercial transporter'
      : transporterTypeDisplay === 'Private transporter'
        ? 'Private transporter'
        : transporterTypeDisplay)
    : 'Not provided'
  const { getBorderPortLabel } = require('../../data/uk-border-ports.js')
  const arrivalRows = [
    row('Port of entry', getBorderPortLabel(data.ukBorderPort)),
    row('Arrival date at destination', formatDate(data.arrivalDate))
  ]
  const transporterAddrHtml = formatAddressHtml(
    null,
    data.transporterAddress || [data.transporterAddressLine1, data.transporterAddressLine2, data.transporterTown, data.transporterPostcode].filter(Boolean),
    data.transporterCountry
  )
  const transporterApprovalDisplay = transporterTypeDisplay === 'Private transporter'
    ? 'Not required'
    : (data.transporterApprovalNumber || 'Not provided')
  const transporterRows = [
    row('Transporter name', data.transporterName || 'Not provided'),
    rowHtml('Transporter address', transporterAddrHtml),
    row('Type', transporterTypeDisplay),
    row('Approval number', transporterApprovalDisplay)
  ]
  const transportAndArrivalRows = transporterRows.concat(arrivalRows)

  const notificationDateCreatedRaw = (data.notificationDateCreated != null && data.notificationDateCreated !== '')
    ? String(data.notificationDateCreated).trim()
    : ''

  return {
    originRows,
    importReasonRows,
    descriptionSummaryRows,
    descriptionTableRows,
    animalIdentificationGroups,
    commodityIdCards,
    additionalAnimalRows,
    documentsTableRows,
    addressRows,
    cphRows,
    permanentAddressRows,
    arrivalRows,
    transporterRows,
    transportAndArrivalRows,
    isPetConsignment: isPetConsignment(data),
    isLivestockConsignment: isLivestockConsignment(data),
    notificationDateCreatedDisplay: notificationDateCreatedRaw
  }
}

function registerPostHubRoutes (router, base) {
  const create = (path) => `${base}/create${path}`

  function storeReturnToIfPresent (req) {
    if (req.query.returnTo === 'check-your-answers') {
      req.session.data = req.session.data || {}
      req.session.data.returnTo = 'check-your-answers'
      if (req.query.anchor) req.session.data.returnToAnchor = req.query.anchor
    }
  }

  function getRedirectPath (data, defaultPath) {
    if (data && data.returnTo === 'check-your-answers') {
      delete data.returnTo
      const anchor = data.returnToAnchor
      delete data.returnToAnchor
      const url = create('/check-your-answers')
      return anchor ? `${url}#${anchor}` : url
    }
    return create(defaultPath)
  }

  function completeDeclarationAndGoToConfirmation (req, res) {
    delete req.session.data.errors
    delete req.session.data.errorList
    delete req.session.data.draftNotificationReference
    const data = req.session.data || {}
    req.session.data.declarationDate = new Date().toISOString().split('T')[0]
    const year = new Date().getFullYear()
    const suffix = String(Math.floor(1000000 + Math.random() * 9000000))
    const referenceNumber = `IMP.GB.${year}.${suffix}`
    req.session.data.lastReferenceNumber = referenceNumber

    const commoditiesEu = require('../../data/commodities-eu.js')
    const commoditiesData = require('../../data/commodities.js')
    let commodityKey = data.commodity
    if (!commodityKey && Array.isArray(data.commodities) && data.commodities.length > 0) {
      commodityKey = data.commodities[0].commodity
    }
    const commodityDetails = commodityKey ? (commoditiesEu[commodityKey] || commoditiesData[commodityKey]) : null
    const commodityCode = commodityDetails ? commodityDetails.code : (data.commodityCode || '')
    const commodityName = commodityDetails?.commonName || commodityKey || 'Live animals'
    const commodityDisplay = commodityCode ? `${commodityName} (${commodityCode})` : commodityName

    const now = new Date()
    const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const submitted = {
      reference: referenceNumber,
      commodity: commodityDisplay,
      origin: data.countryOfOrigin || 'Not provided',
      consignee: data.consigneeName || (data.consignee && data.consignee.name) || 'Not provided',
      consignor: data.consignorName || (data.consignor && data.consignor.name) || 'Not provided',
      arrival: formatDate(data.arrivalDate) || 'Not provided',
      dateCreated: formatDate(todayIso),
      status: 'submitted'
    }
    if (!Array.isArray(data.submittedNotifications)) data.submittedNotifications = []
    data.submittedNotifications.push(submitted)

    res.redirect(create('/confirmation'))
  }

  function postTransportAndArrival (req, res) {
    const data = req.session.data || {}
    const hasTransporter = !!(data.transporterName && (data.transporterId || data.transporterAddressLine1))
    const arrivalDate = (data.arrivalDate || '').trim()
    const ukBorderPort = (data.ukBorderPort || '').trim()
    const errors = {}
    const errorList = []
    if (!hasTransporter) {
      errors.transporter = true
      errorList.push({ href: '#transporter-details', text: 'Add a transporter before continuing' })
    }
    if (!ukBorderPort) {
      errors.ukBorderPort = 'Select a port or border point'
      errorList.push({ href: '#ukBorderPort', text: 'Select a port or border point' })
    }
    if (!arrivalDate) {
      errors.arrivalDate = 'Enter the arrival date at destination'
      errorList.push({ href: '#arrivalDate', text: 'Enter the arrival date at destination' })
    }
    if (errorList.length > 0) {
      data.errors = errors
      data.errorList = errorList
      return res.redirect(create('/transport-and-arrival'))
    }
    delete data.errors
    delete data.errorList
    res.redirect(getRedirectPath(data, '/accompanying-documents'))
  }

  function getTransportAndArrivalView (req, res) {
    storeReturnToIfPresent(req)
    const data = req.session.data || {}

    const transporterId = req.query.transporter
    if (req.query.removeTransporter === '1') {
      delete data.transporterId
      delete data.transporterName
      delete data.transporterAddress
      delete data.transporterCountry
      delete data.transporterType
      delete data.transporterApprovalNumber
      delete data.transporterAddressLine1
      delete data.transporterAddressLine2
      delete data.transporterTown
      delete data.transporterPostcode
    } else if (transporterId) {
      const consignees = require('../../data/consignees.js')
      const selected = consignees.find(c => String(c.id) === String(transporterId))
      if (selected) {
        data.transporterId = selected.id
        data.transporterName = selected.name
        data.transporterAddress = selected.address
        data.transporterCountry = selected.country
        data.transporterType = selected.transporterType || ''
        data.transporterApprovalNumber = selected.approvalNumber || ''
      }
      return res.redirect(create('/transport-and-arrival'))
    }

    const hasTransporter = !!(data.transporterName && (data.transporterId || data.transporterAddressLine1))
    const typeDisplay = data.transporterType === 'Commercial transporter' ? 'Commercial' : data.transporterType === 'Private transporter' ? 'Private' : ''
    const approvalDisplay = data.transporterType === 'Private transporter' ? 'Not required' : (data.transporterApprovalNumber || '')
    const escapeHtmlT = (s) => typeof s !== 'string' ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    const transporterChangeHref = create('/address-consignee-search?returnTo=transport-and-arrival')
    const transporterAddressText = Array.isArray(data.transporterAddress)
      ? data.transporterAddress.filter(Boolean).join(', ')
      : (data.transporterAddress || '')
    const transporterRows = [
      { key: { text: 'Transporter name' }, value: { text: data.transporterName || '—' } },
      {
        key: { text: 'Transporter address' },
        value: { html: escapeHtmlT(transporterAddressText) + (transporterAddressText && data.transporterCountry ? '<br>' : '') + escapeHtmlT(data.transporterCountry || '') }
      },
      { key: { text: 'Type' }, value: { text: typeDisplay || '—' } }
    ]
    if (typeDisplay !== 'Private') {
      transporterRows.push({ key: { text: 'Approval number' }, value: { text: approvalDisplay || '—' } })
    }
    const d = new Date()
    d.setDate(d.getDate() + 3)
    const minArrivalDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const { borderPortItems } = require('../../data/uk-border-ports.js')
    let backHref = create('/addresses')
    if (isPetConsignment(data)) backHref = create('/permanent-addresses-for-animals')
    else if (isLivestockConsignment(data)) backHref = create('/address-cph')
    res.render('v1-experimental/create/transport-and-arrival', {
      hasTransporter,
      transporterRows,
      transporterChangeHref,
      minArrivalDate,
      borderPortItems,
      backHref
    })
  }

  const toKey = (s) => String(s || '').replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '')

  function commodityHasMultipleSpecies (commodityKey, commodityType, commoditiesData) {
    const d = commodityKey ? commoditiesData[commodityKey] : null
    if (!d) return false
    if (d.speciesByType) {
      const type = commodityType === 'game' ? 'Game' : 'Domestic'
      const arr = d.speciesByType[type] || Object.values(d.speciesByType || {}).flat()
      return (Array.isArray(arr) ? arr : []).length > 1
    }
    if (d.species && Array.isArray(d.species)) return d.species.length > 1
    return false
  }

  function buildSpeciesRowsFromCurrentCommodity (data, commoditiesData) {
    const commodity = data.commodity
    const commoditySpecies = Array.isArray(data.commoditySpecies) ? data.commoditySpecies : (data.commoditySpecies ? [data.commoditySpecies] : [])
    const commodityType = data.commodityType || 'domestic'
    const details = commodity ? commoditiesData[commodity] : null
    if (!details || commoditySpecies.length === 0) return []
    const typeLabel = commodityType === 'game' ? 'Game' : 'Domestic'
    const isPetIdentification = details.code === '01061900'
    const isGameBirdIdentification = details.code === '01063980'
    const isHorseIdentification = details.code === '0101' && commodity === 'Horse'
    const isEarTagOnlyIdentification = ['010410', '0103'].includes(details.code)
    const speciesRows = []
    for (const s of commoditySpecies) {
      const key = toKey(s)
      const animalCountKey = `animalCount_${key}`
      const qtyKey = `quantity_${key}`
      const quantity = parseInt(data[animalCountKey] ?? data[qtyKey], 10) || 1
      const animals = []
      for (let i = 1; i <= quantity; i++) {
        const animal = { index: i }
        if (isPetIdentification) {
          animal.microchipKey = `microchip_${key}_${i}`
          animal.passportKey = `passport_${key}_${i}`
          animal.tattooKey = `tattoo_${key}_${i}`
        } else if (isGameBirdIdentification) {
          animal.flockIdKey = `flockId_${key}_${i}`
          animal.hatchingDateKey = `hatchingDate_${key}_${i}`
        } else if (isHorseIdentification) {
          animal.microchipKey = `microchip_${key}_${i}`
          animal.passportKey = `passport_${key}_${i}`
        } else if (isEarTagOnlyIdentification) {
          animal.earTagKey = `earTag_${key}_${i}`
        } else {
          animal.earTagKey = `earTag_${key}_${i}`
          animal.passportKey = `passport_${key}_${i}`
        }
        animals.push(animal)
      }
      speciesRows.push({
        key,
        speciesName: s,
        speciesAndType: `${s}, ${typeLabel}`,
        quantity,
        animals,
        commodityDetails: details,
        isPetIdentification,
        isGameBirdIdentification,
        isHorseIdentification,
        isEarTagOnlyIdentification
      })
    }
    return speciesRows
  }

  function buildSpeciesRowsFromCommodities (commodities, data, commoditiesData) {
    const speciesRows = []
    for (const item of commodities) {
      const details = item.commodity ? commoditiesData[item.commodity] : null
      if (!details) continue
      const commodityType = item.commodityType || 'domestic'
      const typeLabel = commodityType === 'game' ? 'Game' : 'Domestic'
      const isPetIdentification = details.code === '01061900'
      const isGameBirdIdentification = details.code === '01063980'
      const isHorseIdentification = details.code === '0101' && item.commodity === 'Horse'
      const isEarTagOnlyIdentification = ['010410', '0103'].includes(details.code)
      const itemSpecies = item.commoditySpecies || []
      const itemQuantities = item.quantities || {}
      for (const s of itemSpecies) {
        const key = toKey(s)
        const qtyKey = `quantity_${key}`
        const animalCountKey = `animalCount_${key}`
        const quantity = parseInt(data[animalCountKey] ?? itemQuantities[qtyKey] ?? data[qtyKey], 10) || 0
        if (quantity <= 0) continue
        const animals = []
        for (let i = 1; i <= quantity; i++) {
          const animal = { index: i }
          if (isPetIdentification) {
            animal.microchipKey = `microchip_${key}_${i}`
            animal.passportKey = `passport_${key}_${i}`
            animal.tattooKey = `tattoo_${key}_${i}`
          } else if (isGameBirdIdentification) {
            animal.flockIdKey = `flockId_${key}_${i}`
            animal.hatchingDateKey = `hatchingDate_${key}_${i}`
          } else if (isHorseIdentification) {
            animal.microchipKey = `microchip_${key}_${i}`
            animal.passportKey = `passport_${key}_${i}`
          } else if (isEarTagOnlyIdentification) {
            animal.earTagKey = `earTag_${key}_${i}`
          } else {
            animal.earTagKey = `earTag_${key}_${i}`
            animal.passportKey = `passport_${key}_${i}`
          }
          animals.push(animal)
        }
        speciesRows.push({
          key,
          speciesName: s,
          speciesAndType: `${s}, ${typeLabel}`,
          quantity,
          animals,
          commodityDetails: details,
          isPetIdentification,
          isGameBirdIdentification,
          isHorseIdentification,
          isEarTagOnlyIdentification
        })
      }
    }
    return speciesRows
  }

  // --- animal-identification ---
  router.get(create('/animal-identification'), (req, res) => {
    storeReturnToIfPresent(req)
    delete req.session.data.errors
    delete req.session.data.errorList
    const data = req.session.data
    const commodities = data.commodities || []
    const commoditiesData = require('../../data/commodities-eu.js')
    const fromHub = data.commodityFromHub
    const editIdx = data.commodityEditIndex
    const commodityIndex = data.animalIdCommodityIndex

    let speciesRows
    let backHref

    const useCurrentCommodity = (fromHub || editIdx !== undefined || commodities.length === 0) &&
      data.commodity && (Array.isArray(data.commoditySpecies) ? data.commoditySpecies.length > 0 : !!data.commoditySpecies)

    if (useCurrentCommodity) {
      speciesRows = buildSpeciesRowsFromCurrentCommodity(data, commoditiesData)
      const commoditiesDataLocal = require('../../data/commodities-eu.js')
      const commodityDetails = data.commodity ? commoditiesDataLocal[data.commodity] : null
      const speciesCount = commodityDetails && commodityDetails.species ? commodityDetails.species.length : 0
      if (fromHub || editIdx !== undefined) {
        backHref = speciesCount > 1 ? `${base}/create/commodity-species` : `${base}/create/commodity`
      } else {
        backHref = `${base}/create/origin`
      }
    } else {
      const idx = typeof commodityIndex === 'number' && commodityIndex >= 0 && commodityIndex < commodities.length
        ? commodityIndex
        : 0
      const item = commodities[idx]
      if (!item) {
        return res.redirect(create('/commodity-hub'))
      }
      speciesRows = buildSpeciesRowsFromCommodities([item], data, commoditiesData)
      backHref = create('/commodity-hub')
    }

    if (speciesRows.length === 0) {
      return res.redirect(create('/commodity-hub'))
    }

    const commodityDetails = speciesRows[0].commodityDetails
    const goodsSummaryRows = []
    const seenKey = new Set()
    for (const s of speciesRows) {
      const details = s.commodityDetails || commodityDetails
      const key = `${details?.code || ''}|${details?.commonName || ''}|${details?.description || ''}`
      if (!seenKey.has(key)) {
        seenKey.add(key)
        const same = speciesRows.filter(r => {
          const d = r.commodityDetails || commodityDetails
          return `${d?.code || ''}|${d?.commonName || ''}|${d?.description || ''}` === key
        })
        const speciesNames = same.map(r => r.speciesName).filter(Boolean)
        let commodityKey = data.commodity || (commodities[typeof commodityIndex === 'number' ? commodityIndex : 0]?.commodity)
        if (!commodityKey && details) {
          commodityKey = Object.keys(commoditiesData).find(k => {
            const d = commoditiesData[k]
            return d && d.code === details.code && (d.commonName === details.commonName || d.code === details.code)
          })
        }
        const commodityType = useCurrentCommodity ? (data.commodityType || 'domestic') : (commodities[typeof commodityIndex === 'number' ? commodityIndex : 0]?.commodityType || 'domestic')
        const idx = typeof commodityIndex === 'number' ? commodityIndex : 0
        const addSpeciesHref = useCurrentCommodity
          ? create('/commodity-species') + '?from=animal-id'
          : create('/add-species') + (commodityKey ? `?commodity=${encodeURIComponent(commodityKey)}&index=${idx}` : '')
        const canAddMoreSpecies = commodityHasMultipleSpecies(commodityKey, commodityType, commoditiesData)
        goodsSummaryRows.push({
          commodityDetails: details,
          speciesList: speciesNames,
          speciesCount: speciesNames.length,
          addSpeciesHref: canAddMoreSpecies ? addSpeciesHref : null
        })
      }
    }
    const showActionsColumn = goodsSummaryRows.some(r => r.addSpeciesHref)
    res.render('v1-experimental/create/animal-identification', {
      commodityDetails,
      speciesRows,
      goodsSummaryRows,
      showActionsColumn,
      backHref,
      prefillHref: create('/animal-identification-prefill')
    })
  })

  function runAnimalIdentificationPrefill (req, res, opts) {
    const andContinue = opts && opts.andContinue
    const data = req.session.data
    const commodities = data.commodities || []
    const commoditiesData = require('../../data/commodities-eu.js')
    if (!data.commodity || !(Array.isArray(data.commoditySpecies) ? data.commoditySpecies.length : !!data.commoditySpecies)) {
      data.commodity = data.commodity || 'Cow'
      data.commoditySpecies = Array.isArray(data.commoditySpecies) && data.commoditySpecies.length ? data.commoditySpecies : ['Bos taurus']
      data.commodityType = data.commodityType || 'domestic'
      data.animalCount_bos_taurus = data.animalCount_bos_taurus || '1'
      data.numberOfPackages_bos_taurus = data.numberOfPackages_bos_taurus || '1'
    }
    const fromHub = data.commodityFromHub
    const editIdx = data.commodityEditIndex
    const commodityIndex = data.animalIdCommodityIndex
    const useCurrentCommodity = (fromHub || editIdx !== undefined || commodities.length === 0) &&
      data.commodity && (Array.isArray(data.commoditySpecies) ? data.commoditySpecies.length > 0 : !!data.commoditySpecies)
    let speciesRows
    if (useCurrentCommodity) {
      speciesRows = buildSpeciesRowsFromCurrentCommodity(data, commoditiesData)
    } else {
      const idx = typeof commodityIndex === 'number' && commodityIndex >= 0 && commodityIndex < commodities.length ? commodityIndex : 0
      speciesRows = buildSpeciesRowsFromCommodities([commodities[idx] || {}], data, commoditiesData)
    }
    if (speciesRows.length === 0) return res.redirect(create('/commodity-hub'))
    const HERD_MARK = '123456'
    const CHECK_DIGIT = '7'
    let animalCounter = 0
    speciesRows.forEach(s => {
      if (!data[`animalCount_${s.key}`]) data[`animalCount_${s.key}`] = '1'
      if (data[`numberOfPackages_${s.key}`] === undefined || data[`numberOfPackages_${s.key}`] === '') data[`numberOfPackages_${s.key}`] = '1'
      const quantity = parseInt(data[`animalCount_${s.key}`], 10) || 1
      const commodity = useCurrentCommodity ? data.commodity : (commodities[commodityIndex || 0] || {}).commodity
      const isCattle = commodity === 'Cow'
      for (let i = 1; i <= quantity; i++) {
        animalCounter++
        if (s.isPetIdentification) {
          data[`microchip_${s.key}_${i}`] = `9820001234567${String(i).padStart(2, '0')}`
          data[`passport_${s.key}_${i}`] = `PASSPORT-${s.key}-${i}`
          data[`tattoo_${s.key}_${i}`] = `TAT${s.key.slice(0, 4).toUpperCase()}-${i}`
        } else if (s.isGameBirdIdentification) {
          data[`flockId_${s.key}_${i}`] = `FLOCK-${s.key.slice(0, 6).toUpperCase()}-${String(i).padStart(3, '0')}`
          data[`hatchingDate_${s.key}_${i}`] = `${15 + (i % 14)} ${4 + (i % 9)} 2025`
        } else if (s.isHorseIdentification) {
          data[`microchip_${s.key}_${i}`] = `9820001234567${String(i).padStart(2, '0')}`
          data[`passport_${s.key}_${i}`] = `GBR-XIV-${String(i).padStart(6, '0')}`
        } else if (s.isEarTagOnlyIdentification) {
          data[`earTag_${s.key}_${i}`] = `UK0 ${s.key.slice(0, 6).toUpperCase()} ${String(i).padStart(6, '0')}`
        } else if (isCattle) {
          data[`earTag_${s.key}_${i}`] = `${HERD_MARK}${String(animalCounter).padStart(6, '0')}`
          data[`passport_${s.key}_${i}`] = `UK ${HERD_MARK} ${CHECK_DIGIT} ${String(animalCounter).padStart(5, '0')}`
        } else {
          data[`earTag_${s.key}_${i}`] = `PRE-${s.key}-${i}`
          data[`passport_${s.key}_${i}`] = `PASSPORT-${s.key}-${i}`
        }
      }
    })
    delete data.errors
    delete data.errorList
    if (!andContinue) return res.redirect(create('/animal-identification'))
    const saveQuantitiesFromSession = (item) => {
      if (!item.commoditySpecies) return
      item.quantities = item.quantities || {}
      item.commoditySpecies.forEach(s => {
        const key = toKey(s)
        const count = parseInt(req.session.data[`animalCount_${key}`], 10)
        const packages = parseInt(req.session.data[`numberOfPackages_${key}`], 10)
        if (!isNaN(count) && count > 0) item.quantities[`quantity_${key}`] = count
        if (!isNaN(packages) && packages >= 0) item.quantities[`packages_${key}`] = packages
      })
    }
    if (useCurrentCommodity) {
      const quantities = {}
      speciesRows.forEach(s => {
        const count = parseInt(req.session.data[`animalCount_${s.key}`], 10)
        const packages = parseInt(req.session.data[`numberOfPackages_${s.key}`], 10)
        if (!isNaN(count) && count > 0) quantities[`quantity_${s.key}`] = count
        if (!isNaN(packages) && packages >= 0) quantities[`packages_${s.key}`] = packages
      })
      const entry = {
        commodity: data.commodity,
        commoditySpecies: Array.isArray(data.commoditySpecies) ? data.commoditySpecies : [data.commoditySpecies],
        commodityType: data.commodityType || 'domestic',
        quantities
      }
      const commoditiesArr = data.commodities || []
      if (typeof editIdx === 'number' && editIdx >= 0 && editIdx < commoditiesArr.length) {
        commoditiesArr[editIdx] = entry
      } else {
        commoditiesArr.push(entry)
      }
      data.commodities = commoditiesArr
      delete data.commodity
      delete data.commoditySpecies
      delete data.commodityType
      delete data.commodityFromHub
      delete data.commodityEditIndex
      Object.keys(data).filter(k => k.startsWith('quantity_') || k.startsWith('packages_') || k.startsWith('animalCount_') || k.startsWith('numberOfPackages_')).forEach(k => delete data[k])
      return res.redirect(create('/commodity-hub'))
    }
    const idx = typeof commodityIndex === 'number' && commodityIndex >= 0 ? commodityIndex : 0
    const item = commodities[idx]
    if (item) saveQuantitiesFromSession(item)
    const nextIdx = idx + 1
    if (nextIdx < commodities.length) {
      data.animalIdCommodityIndex = nextIdx
      const nextItem = commodities[nextIdx]
      data.commodity = nextItem.commodity
      data.commoditySpecies = nextItem.commoditySpecies || []
      data.commodityType = nextItem.commodityType || 'domestic'
      if (nextItem.quantities) {
        Object.assign(data, nextItem.quantities)
        ;(nextItem.commoditySpecies || []).forEach(s => {
          const key = toKey(s)
          const qty = nextItem.quantities[`quantity_${key}`]
          if (qty !== undefined) data[`animalCount_${key}`] = qty
          const pkg = nextItem.quantities[`packages_${key}`]
          if (pkg !== undefined) data[`numberOfPackages_${key}`] = pkg
        })
      }
      return res.redirect(create('/animal-identification'))
    }
    delete data.animalIdCommodityIndex
    return res.redirect(getRedirectPath(data, '/additional-animal-details'))
  }

  router.get(create('/animal-identification-prefill'), runAnimalIdentificationPrefill)

  router.post(create('/animal-identification-prefill'), (req, res) => {
    if (req.body && typeof req.body === 'object') {
      Object.assign(req.session.data, req.body)
    }
    runAnimalIdentificationPrefill(req, res, { andContinue: true })
  })

  router.post(create('/animal-identification'), (req, res) => {
    const data = req.session.data
    const commodities = data.commodities || []
    const commoditiesData = require('../../data/commodities-eu.js')
    const fromHub = data.commodityFromHub
    const editIdx = data.commodityEditIndex
    const commodityIndex = data.animalIdCommodityIndex

    const useCurrentCommodity = (fromHub || editIdx !== undefined || commodities.length === 0) &&
      data.commodity && (Array.isArray(data.commoditySpecies) ? data.commoditySpecies.length > 0 : !!data.commoditySpecies)

    let speciesRows
    if (useCurrentCommodity) {
      speciesRows = buildSpeciesRowsFromCurrentCommodity(data, commoditiesData)
    } else {
      const idx = typeof commodityIndex === 'number' && commodityIndex >= 0 && commodityIndex < commodities.length ? commodityIndex : 0
      speciesRows = buildSpeciesRowsFromCommodities([commodities[idx] || {}], data, commoditiesData)
    }

    if (speciesRows.length === 0) {
      return res.redirect(create('/commodity-hub'))
    }

    const errors = {}
    const errorList = []
    speciesRows.forEach(s => {
      s.animals.forEach(a => {
        if (s.isHorseIdentification) {
          const microchipVal = req.session.data[a.microchipKey]
          const passportVal = req.session.data[a.passportKey]
          const microchipMissing = !microchipVal || String(microchipVal).trim() === ''
          const passportMissing = !passportVal || String(passportVal).trim() === ''
          if (microchipMissing) errors[a.microchipKey] = 'Enter the microchip number'
          if (passportMissing) errors[a.passportKey] = 'Enter the passport number'
          if (microchipMissing || passportMissing) {
            const animalLabel = `${s.speciesAndType} ${a.index}`
            const missingParts = []
            if (microchipMissing) missingParts.push('microchip')
            if (passportMissing) missingParts.push('passport')
            const firstHref = microchipMissing ? `#microchip-${a.microchipKey}` : `#passport-${a.passportKey}`
            const message = missingParts.length === 2
              ? `Enter the microchip and passport for ${animalLabel}`
              : `Enter the ${missingParts[0]} for ${animalLabel}`
            errorList.push({ href: firstHref, text: message })
          }
        } else if (s.isGameBirdIdentification) {
          const flockIdVal = req.session.data[a.flockIdKey]
          const hatchingDateVal = req.session.data[a.hatchingDateKey]
          const flockIdMissing = !flockIdVal || String(flockIdVal).trim() === ''
          const hatchingDateMissing = !hatchingDateVal || String(hatchingDateVal).trim() === ''
          if (flockIdMissing) errors[a.flockIdKey] = 'Enter the flock id'
          if (hatchingDateMissing) errors[a.hatchingDateKey] = 'Enter the hatching date'
          if (flockIdMissing || hatchingDateMissing) {
            const animalLabel = `${s.speciesAndType} ${a.index}`
            const missingParts = []
            if (flockIdMissing) missingParts.push('flock id')
            if (hatchingDateMissing) missingParts.push('hatching date')
            errorList.push({ href: `#flock-id-${a.flockIdKey}`, text: `Enter the ${missingParts.join(' and ')} for ${animalLabel}` })
          }
        } else if (s.isEarTagOnlyIdentification) {
          const earTagVal = req.session.data[a.earTagKey]
          const earTagMissing = !earTagVal || String(earTagVal).trim() === ''
          if (earTagMissing) {
            errors[a.earTagKey] = 'Enter the ear tag number'
            const animalLabel = `${s.speciesAndType} ${a.index}`
            errorList.push({ href: `#ear-tag-${a.earTagKey}`, text: `Enter the ear tag for ${animalLabel}` })
          }
        } else if (s.isPetIdentification) {
          const passportVal = req.session.data[a.passportKey]
          const passportMissing = !passportVal || String(passportVal).trim() === ''
          const microchipVal = req.session.data[a.microchipKey]
          const tattooVal = req.session.data[a.tattooKey]
          const microchipMissing = !microchipVal || String(microchipVal).trim() === ''
          const tattooMissing = !tattooVal || String(tattooVal).trim() === ''
          if (microchipMissing) errors[a.microchipKey] = 'Enter the microchip number'
          if (passportMissing) errors[a.passportKey] = 'Enter the passport number'
          if (tattooMissing) errors[a.tattooKey] = 'Enter the tattoo number'
          if (microchipMissing || passportMissing || tattooMissing) {
            const animalLabel = `${s.speciesAndType} ${a.index}`
            const missingParts = []
            if (microchipMissing) missingParts.push('microchip')
            if (passportMissing) missingParts.push('passport')
            if (tattooMissing) missingParts.push('tattoo')
            const message = `Enter the ${missingParts.join(', ')} for ${animalLabel}`
            errorList.push({ href: `#microchip-${a.microchipKey}`, text: message })
          }
        } else {
          const earTagVal = req.session.data[a.earTagKey]
          const passportVal = req.session.data[a.passportKey]
          const earTagMissing = !earTagVal || String(earTagVal).trim() === ''
          const passportMissing = !passportVal || String(passportVal).trim() === ''
          if (earTagMissing) errors[a.earTagKey] = 'Enter the ear tag number'
          if (passportMissing) errors[a.passportKey] = 'Enter the passport number'
          if (earTagMissing || passportMissing) {
            const animalLabel = `${s.speciesAndType} animal ${a.index}`
            const missingParts = []
            if (earTagMissing) missingParts.push('ear tag')
            if (passportMissing) missingParts.push('passport')
            const message = missingParts.length === 2
              ? `Enter the ear tag and passport for ${animalLabel}`
              : `Enter the ${missingParts[0]} for ${animalLabel}`
            errorList.push({ href: `#ear-tag-${a.earTagKey}`, text: message })
          }
        }
      })
    })

    if (Object.keys(errors).length > 0) {
      req.session.data.errors = errors
      req.session.data.errorList = errorList
      return res.redirect(create('/animal-identification'))
    }

    const saveQuantitiesFromSession = (item) => {
      if (!item.commoditySpecies) return
      item.quantities = item.quantities || {}
      item.commoditySpecies.forEach(s => {
        const key = toKey(s)
        const count = parseInt(req.session.data[`animalCount_${key}`], 10)
        const packages = parseInt(req.session.data[`numberOfPackages_${key}`], 10)
        if (!isNaN(count) && count > 0) {
          item.quantities[`quantity_${key}`] = count
        }
        if (!isNaN(packages) && packages >= 0) {
          item.quantities[`packages_${key}`] = packages
        }
      })
    }

    if (useCurrentCommodity) {
      const quantities = {}
      speciesRows.forEach(s => {
        const count = parseInt(req.session.data[`animalCount_${s.key}`], 10)
        const packages = parseInt(req.session.data[`numberOfPackages_${s.key}`], 10)
        if (!isNaN(count) && count > 0) quantities[`quantity_${s.key}`] = count
        if (!isNaN(packages) && packages >= 0) quantities[`packages_${s.key}`] = packages
      })
      const entry = {
        commodity: data.commodity,
        commoditySpecies: Array.isArray(data.commoditySpecies) ? data.commoditySpecies : [data.commoditySpecies],
        commodityType: data.commodityType || 'domestic',
        quantities
      }
      const commoditiesArr = data.commodities || []
      if (typeof editIdx === 'number' && editIdx >= 0 && editIdx < commoditiesArr.length) {
        commoditiesArr[editIdx] = entry
      } else {
        commoditiesArr.push(entry)
      }
      data.commodities = commoditiesArr
      delete data.commodity
      delete data.commoditySpecies
      delete data.commodityType
      delete data.commodityFromHub
      delete data.commodityEditIndex
      Object.keys(data).filter(k => k.startsWith('quantity_') || k.startsWith('packages_') || k.startsWith('animalCount_') || k.startsWith('numberOfPackages_')).forEach(k => delete data[k])
      delete req.session.data.errors
      delete req.session.data.errorList
      res.redirect(create('/commodity-hub'))
    } else {
      const idx = typeof commodityIndex === 'number' && commodityIndex >= 0 ? commodityIndex : 0
      const item = commodities[idx]
      if (item) saveQuantitiesFromSession(item)
      const nextIdx = idx + 1
      if (nextIdx < commodities.length) {
        data.animalIdCommodityIndex = nextIdx
        const nextItem = commodities[nextIdx]
        data.commodity = nextItem.commodity
        data.commoditySpecies = nextItem.commoditySpecies || []
        data.commodityType = nextItem.commodityType || 'domestic'
        if (nextItem.quantities) {
          Object.assign(data, nextItem.quantities)
          ;(nextItem.commoditySpecies || []).forEach(s => {
            const key = toKey(s)
            const qty = nextItem.quantities[`quantity_${key}`]
            if (qty !== undefined) data[`animalCount_${key}`] = qty
            const pkg = nextItem.quantities[`packages_${key}`]
            if (pkg !== undefined) data[`numberOfPackages_${key}`] = pkg
          })
        }
        delete req.session.data.errors
        delete req.session.data.errorList
        res.redirect(create('/animal-identification'))
      } else {
        delete data.animalIdCommodityIndex
        delete req.session.data.errors
        delete req.session.data.errorList
        res.redirect(getRedirectPath(req.session.data, '/additional-animal-details'))
      }
    }
  })

  router.get(create('/additional-animal-details-prefill'), (req, res) => {
    const data = req.session.data || {}
    data.animalsCertifiedFor = 'breeding-production'
    data.unweanedAnimals = 'no'
    delete data.errors
    delete data.errorList
    res.redirect(create('/import-reason'))
  })

  // --- additional-animal-details ---
  router.get(create('/additional-animal-details'), (req, res) => {
    storeReturnToIfPresent(req)
    delete req.session.data.errors
    delete req.session.data.errorList
    const commodity = req.session.data.commodity
    const commoditySpecies = getCommoditySpeciesArray(req.session.data)
    const commoditiesData = require('../../data/commodities-eu.js')
    const commodityDetails = commodity ? commoditiesData[commodity] : null

    if (!commodityDetails || commoditySpecies.length === 0) {
      return res.redirect(create('/commodity-hub'))
    }

    const quantityKey = (s) => `quantity_${s.replace(/\s+/g, '_').toLowerCase().replace(/[^a-z0-9_]/g, '')}`
    const hasQuantities = commoditySpecies.some(s => {
      const q = parseInt(req.session.data[quantityKey(s)], 10)
      return !isNaN(q) && q > 0
    })
    if (!hasQuantities) {
      return res.redirect(create('/commodity-hub'))
    }

    const certifiedForOptions = require('../../data/certified-for-options.js')
    const certifiedForItems = certifiedForOptions.getCertifiedForOptions
      ? certifiedForOptions.getCertifiedForOptions(commodity, commoditySpecies, commoditiesData)
      : certifiedForOptions

    const code = commodityDetails && commodityDetails.code ? String(commodityDetails.code).replace(/\s/g, '') : ''
    const isCatsOrDogs = code === '01061900' && (commodity === 'Cat' || commodity === 'Dog')
    const showUnweanedAnimals = !isCatsOrDogs

    res.render('v1-experimental/create/additional-animal-details', { certifiedForItems, showUnweanedAnimals })
  })

  router.post(create('/additional-animal-details'), (req, res) => {
    const animalsCertifiedFor = req.session.data.animalsCertifiedFor
    const unweanedAnimals = req.session.data.unweanedAnimals
    const commodity = req.session.data.commodity
    const commoditySpecies = getCommoditySpeciesArray(req.session.data)
    const commoditiesData = require('../../data/commodities-eu.js')
    const commodityDetails = commodity ? commoditiesData[commodity] : null
    const code = commodityDetails && commodityDetails.code ? String(commodityDetails.code).replace(/\s/g, '') : ''
    const isCatsOrDogs = code === '01061900' && (commodity === 'Cat' || commodity === 'Dog')
    const showUnweanedAnimals = !isCatsOrDogs

    const errors = {}
    const errorList = []

    if (!animalsCertifiedFor || animalsCertifiedFor.trim() === '') {
      errors.animalsCertifiedFor = 'Select what the animals are certified for'
      errorList.push({ href: '#animals-certified-for-1', text: 'Select what the animals are certified for' })
    }
    if (showUnweanedAnimals && (!unweanedAnimals || unweanedAnimals.trim() === '')) {
      errors.unweanedAnimals = 'Select if the consignment contains unweaned animals'
      errorList.push({ href: '#unweaned-animals-1', text: 'Select if the consignment contains unweaned animals' })
    }

    if (Object.keys(errors).length > 0) {
      req.session.data.errors = errors
      req.session.data.errorList = errorList
      return res.redirect(create('/additional-animal-details'))
    }

    delete req.session.data.errors
    delete req.session.data.errorList
    res.redirect(getRedirectPath(req.session.data, '/import-reason'))
  })

  router.get(create('/import-reason-prefill'), (req, res) => {
    const data = req.session.data || {}
    data.importReason = 'internal-market'
    data.internalMarketPurpose = 'breeding'
    delete data.errors
    delete data.errorList
    res.redirect(create('/addresses'))
  })

  // --- import-reason ---
  router.get(create('/import-reason'), (req, res) => {
    storeReturnToIfPresent(req)
    const data = req.session.data
    if (data.importReason === 'breeding' || data.importReason === 'racing-competition') {
      data.internalMarketPurpose = data.importReason
      data.importReason = 'internal-market'
    }
    const commoditySpecies = getCommoditySpeciesArray(req.session.data)
    const horseSpecies = require('../../data/commodity-list.js').horseSpecies
    const showTemporaryAdmissionHorses = commoditySpecies.some(s => horseSpecies.includes(s))

    const commoditiesEu = require('../../data/commodities-eu.js')
    const {
      cow0102InternalMarketPurposes,
      sessionIsCow0102Only
    } = require('../../data/internal-market-purposes.js')
    const useCow0102Purposes = sessionIsCow0102Only(req.session.data, commoditiesEu)

    const internalMarketSubPurposes = useCow0102Purposes
      ? cow0102InternalMarketPurposes.map(p => ({
          value: p.value,
          text: p.text,
          hint: { text: p.hint }
        }))
      : [
          {
            value: 'breeding',
            text: 'Breeding',
            hint: { text: 'Animals for reproduction, intended to contribute to a genetic pool, improve livestock or produce offspring.' }
          },
          {
            value: 'racing-competition',
            text: 'Racing, competition, show or training',
            hint: { text: 'Animals participating in competitive or training events.' }
          }
        ]

    const purposeItems = internalMarketSubPurposes.map(p => ({
      value: p.value,
      text: p.text,
      hint: p.hint ? { text: p.hint.text } : undefined,
      checked: req.session.data.internalMarketPurpose === p.value
    }))

    const escapeHtml = (s) => String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')

    const purposeError = req.session.data.errors && req.session.data.errors.internalMarketPurpose
    const purposeConditionalHtml = `
      <div class="govuk-form-group govuk-!-margin-top-3 ${purposeError ? 'govuk-form-group--error' : ''}">
        <fieldset class="govuk-fieldset" ${purposeError ? 'aria-describedby="internal-market-purpose-error"' : ''}>
          <legend class="govuk-fieldset__legend govuk-fieldset__legend--s">
            Purpose in the internal market
          </legend>
          ${purposeError ? `<p id="internal-market-purpose-error" class="govuk-error-message"><span class="govuk-visually-hidden">Error:</span> ${escapeHtml(purposeError)}</p>` : ''}
          <div class="govuk-radios govuk-radios--small" data-module="govuk-radios">
            ${purposeItems.map((item, i) => `
              <div class="govuk-radios__item">
                <input class="govuk-radios__input" id="internal-market-purpose-${i}" name="internalMarketPurpose" type="radio" value="${escapeHtml(item.value)}" ${item.checked ? 'checked' : ''}>
                <label class="govuk-label govuk-radios__label" for="internal-market-purpose-${i}">${escapeHtml(item.text)}</label>
                ${item.hint ? `<div class="govuk-hint govuk-radios__hint">${escapeHtml(item.hint.text)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </fieldset>
      </div>
    `

    const importReasonItems = [
      {
        value: 'internal-market',
        text: 'Internal market',
        hint: { text: 'The consignment is intended for sale or use in Great Britain (England, Scotland or Wales).' },
        conditional: { html: purposeConditionalHtml }
      },
      {
        value: 're-entry',
        text: 'Re-entry',
        hint: { text: 'The consignment is authorised for re-entry or includes rejected exports that are re-entering Great Britain.' }
      },
      {
        value: 'transit',
        text: 'Transit',
        hint: { text: 'For animals moving through Great Britain for direct travel to a third country, that will enter Great Britain at one port or airport and leave from a different one within England, Scotland or Wales.' }
      }
    ]
    if (showTemporaryAdmissionHorses) {
      importReasonItems.push({
        value: 'temporary-admission-horses',
        text: 'Temporary admission horses',
        hint: { text: 'For horses authorised for temporary entry.' }
      })
    }

    res.render('v1-experimental/create/import-reason', {
      importReasonItems
    })
  })

  router.post(create('/import-reason'), (req, res) => {
    const importReason = req.session.data.importReason
    const internalMarketPurpose = req.session.data.internalMarketPurpose
    const commoditySpecies = getCommoditySpeciesArray(req.session.data)
    const horseSpecies = require('../../data/commodity-list.js').horseSpecies
    const showTemporaryAdmissionHorses = commoditySpecies.some(s => horseSpecies.includes(s))
    const commoditiesEu = require('../../data/commodities-eu.js')
    const { cow0102InternalMarketPurposes, sessionIsCow0102Only } = require('../../data/internal-market-purposes.js')
    const useCow0102Purposes = sessionIsCow0102Only(req.session.data, commoditiesEu)
    const allowedTopReasons = ['internal-market', 're-entry', 'transit']
    if (showTemporaryAdmissionHorses) allowedTopReasons.push('temporary-admission-horses')
    const allowedInternalPurposes = useCow0102Purposes
      ? cow0102InternalMarketPurposes.map(p => p.value)
      : ['breeding', 'racing-competition']
    const errors = {}
    const errorList = []

    if (!importReason || importReason.trim() === '') {
      errors.importReason = 'Select the main reason for importing the animals'
      errorList.push({ href: '#import-reason-1', text: 'Select the main reason for importing the animals' })
    } else if (!allowedTopReasons.includes(importReason)) {
      errors.importReason = 'Select a valid reason for importing the animals'
      errorList.push({ href: '#import-reason-1', text: 'Select a valid reason for importing the animals' })
    } else if (importReason === 'internal-market' && (!internalMarketPurpose || !allowedInternalPurposes.includes(internalMarketPurpose))) {
      errors.internalMarketPurpose = 'Select the purpose in the internal market'
      errorList.push({ href: '#internal-market-purpose-0', text: 'Select the purpose in the internal market' })
    } else if (importReason === 'temporary-admission-horses' && !showTemporaryAdmissionHorses) {
      errors.importReason = 'Temporary admission horses is only available when importing horses'
      errorList.push({ href: '#import-reason-1', text: 'Select a valid reason for importing the animals' })
    }

    if (Object.keys(errors).length > 0) {
      req.session.data.errors = errors
      req.session.data.errorList = errorList
      return res.redirect(create('/import-reason'))
    }

    if (importReason !== 'internal-market') {
      delete req.session.data.internalMarketPurpose
    }
    delete req.session.data.errors
    delete req.session.data.errorList
    res.redirect(getRedirectPath(req.session.data, '/addresses'))
  })

  // --- accompanying-documents ---
  router.get(create('/accompanying-documents-prefill'), (req, res) => {
    const data = req.session.data
    data.documents = [{
      type: 'veterinary-health-certificate',
      reference: 'CHED-PP-2024-001',
      date: '2024-03-15',
      attachments: ['Sample health certificate.pdf']
    }]
    delete data.errors
    delete data.errorList
    res.redirect(getRedirectPath(data, '/check-your-answers'))
  })

  router.get(create('/accompanying-documents'), (req, res) => {
    storeReturnToIfPresent(req)
    delete req.session.data.errors
    delete req.session.data.errorList
    const documentTypes = require('../../data/document-types.js')
    const documentTypeItems = [{ value: '', text: 'Select document type' }].concat(documentTypes)
    const sessionDocuments = req.session.data.documents
    let documents = (sessionDocuments && sessionDocuments.length) ? sessionDocuments : [{ type: '', reference: '', date: '' }]
    documents = documents.map(doc => {
      const d = doc || {}
      if (d.date) return { ...d, date: d.date }
      if (d.dateDay && d.dateMonth && d.dateYear) {
        const y = String(d.dateYear).padStart(4, '0')
        const m = String(d.dateMonth).padStart(2, '0')
        const day = String(d.dateDay).padStart(2, '0')
        return { ...d, date: `${y}-${m}-${day}` }
      }
      return { ...d, date: d.date || '' }
    })
    res.render('v1-experimental/create/accompanying-documents', {
      documentTypeItems,
      documents
    })
  })

  router.post(create('/accompanying-documents'), (req, res) => {
    const data = req.session.data
    const documents = []
    const errors = {}
    const errorList = []
    let i = 0
    while (data[`documentType_${i}`] !== undefined) {
      const type = data[`documentType_${i}`]
      const reference = (data[`documentReference_${i}`] || '').trim()
      const date = (data[`documentDate_${i}`] || '').trim()
      const filenamesStr = data[`documentAttachmentFilenames_${i}`] || ''
      const attachments = filenamesStr ? filenamesStr.split(',').map(s => s.trim()).filter(Boolean) : []

      if (!type || type.trim() === '') {
        errors[`documentType_${i}`] = 'Select a document type'
        errorList.push({ href: `#document-type-${i}`, text: `Document ${i + 1}: Select a document type` })
      }
      if (reference === '') {
        errors[`documentReference_${i}`] = 'Enter the document reference'
        errorList.push({ href: `#document-reference-${i}`, text: `Document ${i + 1}: Enter the document reference` })
      }
      if (date === '') {
        errors[`documentDate_${i}`] = 'Enter the date of issue'
        errorList.push({ href: `#document-date-${i}`, text: `Document ${i + 1}: Enter the date of issue` })
      }

      documents.push({
        type: type || '',
        reference: reference,
        date: date,
        attachments
      })
      i++
    }
    if (documents.length === 0) {
      documents.push({ type: '', reference: '', date: '', attachments: [] })
    }
    data.documents = documents

    if (Object.keys(errors).length > 0) {
      req.session.data.errors = errors
      req.session.data.errorList = errorList
      return res.redirect(create('/accompanying-documents'))
    }

    delete data.errors
    delete data.errorList
    res.redirect(getRedirectPath(data, '/check-your-answers'))
  })

  // --- addresses ---
  router.get(create('/addresses'), (req, res) => {
    storeReturnToIfPresent(req)
    const data = req.session.data || {}
    delete data.errors
    delete data.errorList

    const consignorId = req.query.consignor
    if (req.query.removeConsignor === '1') {
      delete data.consignorId
      delete data.consignorName
      delete data.consignorAddress
      delete data.consignorCountry
      delete data.consignor
    } else if (consignorId) {
      const consignors = require('../../data/consignors.js')
      const selected = consignors.find(c => String(c.id) === String(consignorId))
      if (selected) {
        data.consignorId = selected.id
        data.consignorName = selected.name
        data.consignorAddress = selected.address
        data.consignorCountry = selected.country
        data.consignor = selected
      }
    }

    const consigneeId = req.query.consignee
    if (req.query.removeConsignee === '1') {
      delete data.consigneeId
      delete data.consigneeName
      delete data.consigneeAddress
      delete data.consigneeCountry
      delete data.consigneeAddressLine1
      delete data.consigneeAddressLine2
      delete data.consigneeTown
      delete data.consigneePostcode
      delete data.importerName
      delete data.importerAddress
      delete data.importerCountry
    } else if (consigneeId) {
      const consignees = require('../../data/consignees.js')
      const selectedConsignee = consignees.find(c => String(c.id) === String(consigneeId))
      if (selectedConsignee) {
        data.consigneeId = selectedConsignee.id
        data.consigneeName = selectedConsignee.name
        data.consigneeAddress = selectedConsignee.address
        data.consigneeCountry = selectedConsignee.country
      }
    }

    const importerId = req.query.importer
    if (importerId) {
      const consignees = require('../../data/consignees.js')
      const selectedImporter = consignees.find(c => String(c.id) === String(importerId))
      if (selectedImporter) {
        data.importerId = selectedImporter.id
        data.importerName = selectedImporter.name
        data.importerAddress = selectedImporter.address
        data.importerCountry = selectedImporter.country
      }
    }

    const selected = data.consignor || (data.consignorName && { name: data.consignorName, address: data.consignorAddress, country: data.consignorCountry })
    const consignorName = (selected && selected.name) || data.consignorName || ''
    const consignorAddress = (selected && selected.address) || data.consignorAddress || ''
    const consignorCountry = (selected && selected.country) || data.consignorCountry || ''
    const hasConsignor = !!(selected || data.consignorId)

    if (req.query.importerSameAsConsignee === '1') {
      const hasConsigneeCheck = !!(data.consigneeId && data.consigneeName && data.consigneeAddress && data.consigneeCountry) ||
        !!(data.consigneeName && data.consigneeAddressLine1 && data.consigneeTown && data.consigneePostcode)
      if (hasConsigneeCheck) {
        data.importerId = data.consigneeId
        data.importerName = data.consigneeName
        data.importerAddress = data.consigneeAddress
        data.importerCountry = data.consigneeCountry
        data.importerAddressLine1 = data.consigneeAddressLine1
        data.importerAddressLine2 = data.consigneeAddressLine2
        data.importerTown = data.consigneeTown
        data.importerPostcode = data.consigneePostcode
      }
    }
    if (req.query.removeImporter === '1') {
      delete data.importerId
      delete data.importerName
      delete data.importerAddress
      delete data.importerCountry
      delete data.importerAddressLine1
      delete data.importerAddressLine2
      delete data.importerTown
      delete data.importerPostcode
    }

    const hasConsigneeFromSearch = !!(data.consigneeId && data.consigneeName && data.consigneeAddress && data.consigneeCountry)
    const hasConsigneeFromForm = !!(data.consigneeName && data.consigneeAddressLine1 && data.consigneeTown && data.consigneePostcode)
    const hasConsignee = hasConsigneeFromSearch || hasConsigneeFromForm
    const consigneeAddressLines = []
    if (hasConsigneeFromSearch) {
      consigneeAddressLines.push(data.consigneeName, data.consigneeAddress, data.consigneeCountry)
    } else if (hasConsigneeFromForm) {
      if (data.consigneeName) consigneeAddressLines.push(data.consigneeName)
      if (data.consigneeAddressLine1) consigneeAddressLines.push(data.consigneeAddressLine1)
      if (data.consigneeAddressLine2) consigneeAddressLines.push(data.consigneeAddressLine2)
      if (data.consigneeTown) consigneeAddressLines.push(data.consigneeTown)
      if (data.consigneePostcode) consigneeAddressLines.push(data.consigneePostcode + ' United Kingdom')
    }

    const hasImporterFromConsignee = !!(data.importerName && (data.importerAddress || data.importerAddressLine1))
    const hasImporter = hasImporterFromConsignee

    const importerMatchesConsignee = hasConsignee && hasImporter && (
      (data.importerId && data.consigneeId && String(data.importerId) === String(data.consigneeId)) ||
      (data.importerName === data.consigneeName && data.importerAddress === data.consigneeAddress) ||
      (data.importerName === data.consigneeName && data.importerAddressLine1 === data.consigneeAddressLine1 && data.importerTown === data.consigneeTown)
    )
    const showSameAsConsignee = hasConsignee && !importerMatchesConsignee
    const importerAddressLines = []
    if (hasImporter) {
      if (data.importerAddress) {
        importerAddressLines.push(data.importerName, data.importerAddress, data.importerCountry || 'United Kingdom')
      } else {
        if (data.importerName) importerAddressLines.push(data.importerName)
        if (data.importerAddressLine1) importerAddressLines.push(data.importerAddressLine1)
        if (data.importerAddressLine2) importerAddressLines.push(data.importerAddressLine2)
        if (data.importerTown) importerAddressLines.push(data.importerTown)
        if (data.importerPostcode) importerAddressLines.push(data.importerPostcode + ' United Kingdom')
      }
    }

    const placeOfDestinationId = req.query.placeOfDestination
    if (req.query.removePlaceOfDestination === '1') {
      delete data.placeOfDestinationId
      delete data.placeOfDestinationName
      delete data.placeOfDestinationAddress
      delete data.placeOfDestinationCountry
      delete data.placeOfDestinationType
    } else if (req.query.placeOfDestinationSameAsConsignee === '1') {
      const hasConsigneeFromSearch = !!(data.consigneeId && data.consigneeName && data.consigneeAddress && data.consigneeCountry)
      const hasConsigneeFromForm = !!(data.consigneeName && data.consigneeAddressLine1 && data.consigneeTown && data.consigneePostcode)
      if (hasConsigneeFromSearch) {
        delete data.placeOfDestinationId
        data.placeOfDestinationName = data.consigneeName
        data.placeOfDestinationAddress = data.consigneeAddress
        data.placeOfDestinationCountry = data.consigneeCountry
        delete data.placeOfDestinationType
      } else if (hasConsigneeFromForm) {
        delete data.placeOfDestinationId
        data.placeOfDestinationName = data.consigneeName
        data.placeOfDestinationAddressLine1 = data.consigneeAddressLine1
        data.placeOfDestinationAddressLine2 = data.consigneeAddressLine2
        data.placeOfDestinationTown = data.consigneeTown
        data.placeOfDestinationPostcode = data.consigneePostcode
        data.placeOfDestinationCountry = 'United Kingdom'
        delete data.placeOfDestinationAddress
        delete data.placeOfDestinationType
      }
    } else if (placeOfDestinationId) {
      const placesOfDestination = require('../../data/places-of-destination.js')
      const selected = placesOfDestination.find(p => String(p.id) === String(placeOfDestinationId))
      if (selected) {
        data.placeOfDestinationId = selected.id
        data.placeOfDestinationName = selected.name
        data.placeOfDestinationAddress = selected.address
        data.placeOfDestinationCountry = selected.country
        data.placeOfDestinationType = selected.type
      }
    }
    const hasPlaceOfDestination = !!(data.placeOfDestinationName && (data.placeOfDestinationAddress || data.placeOfDestinationAddressLine1))
    const placeOfDestinationAddressLines = []
    if (hasPlaceOfDestination) {
      if (data.placeOfDestinationAddress) {
        placeOfDestinationAddressLines.push(data.placeOfDestinationName, data.placeOfDestinationAddress, (data.placeOfDestinationCountry || '') + (data.placeOfDestinationType ? ' (' + data.placeOfDestinationType + ')' : ''))
      } else {
        if (data.placeOfDestinationName) placeOfDestinationAddressLines.push(data.placeOfDestinationName)
        if (data.placeOfDestinationAddressLine1) placeOfDestinationAddressLines.push(data.placeOfDestinationAddressLine1)
        if (data.placeOfDestinationAddressLine2) placeOfDestinationAddressLines.push(data.placeOfDestinationAddressLine2)
        if (data.placeOfDestinationTown) placeOfDestinationAddressLines.push(data.placeOfDestinationTown)
        if (data.placeOfDestinationPostcode) placeOfDestinationAddressLines.push(data.placeOfDestinationPostcode + ' United Kingdom')
      }
    }

    const placeOfDestinationMatchesConsignee = hasConsignee && hasPlaceOfDestination && (
      (data.placeOfDestinationName === data.consigneeName && data.placeOfDestinationAddress === data.consigneeAddress) ||
      (data.placeOfDestinationName === data.consigneeName && data.placeOfDestinationAddressLine1 === data.consigneeAddressLine1 && data.placeOfDestinationTown === data.consigneeTown)
    )
    const showSameAsConsigneeForDestination = hasConsignee && !placeOfDestinationMatchesConsignee

    const contactAddresses = require('../../data/contact-addresses.js')
    const additional = Array.isArray(data.contactAddressesAdditional) ? data.contactAddressesAdditional : []
    const allContactAddresses = [...contactAddresses, ...additional]
    const contactAddressIdParam = req.query.contactAddress
    if (contactAddressIdParam) {
      const selected = allContactAddresses.find(c => String(c.id) === String(contactAddressIdParam))
      if (selected) {
        data.contactAddressId = selected.id
      }
    }
    const contactAddressId = (data.contactAddressId || '').trim()
    const selectedContact = contactAddressId && allContactAddresses.find(a => String(a.id) === String(contactAddressId))
    const hasContactAddress = !!selectedContact
    let contactAddressLines = []
    if (hasContactAddress) {
      contactAddressLines.push(selectedContact.name, ...(selectedContact.addressLines || [selectedContact.address] || []))
      if (selectedContact.country) contactAddressLines.push(selectedContact.country)
    }
    const showBranchAddedSuccess = !!data.branchAddressAdded
    if (data.branchAddressAdded) delete data.branchAddressAdded

    res.render('v1-experimental/create/addresses', {
      consignorName,
      consignorAddress,
      consignorCountry,
      hasConsignor,
      hasConsignee,
      consigneeAddressLines,
      hasImporter,
      importerAddressLines,
      showSameAsConsignee,
      hasPlaceOfDestination,
      placeOfDestinationAddressLines,
      showSameAsConsigneeForDestination,
      hasContactAddress,
      contactAddressLines,
      showBranchAddedSuccess,
      basePath: base
    })
  })

  router.post(create('/addresses'), (req, res) => {
    const data = req.session.data || {}
    const contactAddressId = (data.contactAddressId || '').trim()
    const errors = {}
    const errorList = []
    if (!contactAddressId) {
      errors.contactAddressId = 'Add a contact address for consignment'
      errorList.push({ href: '#contact-address', text: 'Add a contact address for consignment' })
    }
    if (errorList.length > 0) {
      data.errors = errors
      data.errorList = errorList
      return res.redirect(create('/addresses') + '#contact-address')
    }
    delete data.errors
    delete data.errorList
    let next = create('/transport-and-arrival')
    if (isPetConsignment(data)) next = create('/permanent-addresses-for-animals')
    else if (isLivestockConsignment(data)) next = create('/address-cph')
    res.redirect(next)
  })

  router.get(create('/address-prefill'), (req, res) => {
    const data = req.session.data || {}
    const consignors = require('../../data/consignors.js')
    const consignees = require('../../data/consignees.js')
    const placesOfDestination = require('../../data/places-of-destination.js')
    const consignor = consignors[0]
    const consignee = consignees[0]
    const place = placesOfDestination[0]
    data.consignorId = consignor.id
    data.consignorName = consignor.name
    data.consignorAddress = consignor.address
    data.consignorCountry = consignor.country
    data.consigneeId = consignee.id
    data.consigneeName = consignee.name
    data.consigneeAddress = consignee.address
    data.consigneeCountry = consignee.country
    data.importerId = consignee.id
    data.importerName = consignee.name
    data.importerAddress = consignee.address
    data.importerCountry = consignee.country
    data.placeOfDestinationId = place.id
    data.placeOfDestinationName = place.name
    data.placeOfDestinationAddress = place.address
    data.placeOfDestinationCountry = place.country
    data.placeOfDestinationType = place.type
    if (!Array.isArray(data.contactAddressesAdditional)) data.contactAddressesAdditional = []
    const prefillContact = {
      id: 'prefill-contact-1',
      name: 'Animal and Plant Health Agency',
      addressLines: ['Woodham Lane', 'New Haw', 'Surrey', 'Addlestone', 'KT15 3NB'],
      country: 'United Kingdom of Great Britain and Northern Ireland'
    }
    if (!data.contactAddressesAdditional.find(a => a.id === prefillContact.id)) {
      data.contactAddressesAdditional.push(prefillContact)
    }
    data.contactAddressId = prefillContact.id
    delete data.errors
    delete data.errorList
    let nextPath = '/transport-and-arrival'
    if (isPetConsignment(data)) nextPath = '/permanent-addresses-for-animals'
    else if (isLivestockConsignment(data)) nextPath = '/address-cph'
    res.redirect(getRedirectPath(data, nextPath))
  })

  // --- permanent-addresses-for-animals ---
  router.get(create('/permanent-addresses-for-animals'), (req, res) => {
    storeReturnToIfPresent(req)
    const data = req.session.data || {}
    delete data.errors
    delete data.errorList
    if (isLivestockConsignment(data)) return res.redirect(create('/address-cph'))
    if (!isPetConsignment(data)) return res.redirect(create('/addresses'))
    let viewData = getPermanentAddressViewData(data)
    if (!viewData.animalLabel) {
      viewData = {
        animalLabel: 'Dog (Canis familiaris)',
        podAddressDisplay: 'Greenfield Farm, Marsh Lane, Ashford, TN25 4PQ, United Kingdom',
        podAddressLines: ['Greenfield Farm', 'Marsh Lane, Ashford, TN25 4PQ', 'United Kingdom']
      }
    }
    res.render('v1-experimental/create/permanent-addresses-for-animals', { ...viewData, backHref: create('/addresses') })
  })

  router.post(create('/permanent-addresses-for-animals'), (req, res) => {
    const data = req.session.data || {}
    if (isLivestockConsignment(data)) return res.redirect(create('/address-cph'))
    if (!isPetConsignment(data)) return res.redirect(create('/addresses'))
    const sameAsPOD = data.permanentAddressSameAsPOD === 'yes'
    const errors = {}
    const errorList = []
    if (!sameAsPOD) {
      const name = (data.permanentAddressName || '').trim()
      const line1 = (data.permanentAddressLine1 || '').trim()
      const town = (data.permanentAddressTown || '').trim()
      const postcode = (data.permanentAddressPostcode || '').trim()
      if (!name) { errors.permanentAddressName = 'Enter the address name'; errorList.push({ href: '#permanentAddressName', text: 'Enter the address name' }) }
      if (!line1) { errors.permanentAddressLine1 = 'Enter address line 1'; errorList.push({ href: '#permanentAddressLine1', text: 'Enter address line 1' }) }
      if (!town) { errors.permanentAddressTown = 'Enter the city or town'; errorList.push({ href: '#permanentAddressTown', text: 'Enter the city or town' }) }
      if (!postcode) { errors.permanentAddressPostcode = 'Enter the postcode'; errorList.push({ href: '#permanentAddressPostcode', text: 'Enter the postcode' }) }
    }
    if (errorList.length > 0) {
      data.errors = errors
      data.errorList = errorList
      return res.redirect(create('/permanent-addresses-for-animals'))
    }
    delete data.errors
    delete data.errorList
    res.redirect(getRedirectPath(data, '/transport-and-arrival'))
  })

  // --- address-cph ---
  router.get(create('/address-cph-prefill'), (req, res) => {
    const data = req.session.data || {}
    if (isPetConsignment(data)) return res.redirect(create('/permanent-addresses-for-animals-prefill'))
    if (!isLivestockConsignment(data)) {
      delete data.errors
      delete data.errorList
      if (!Array.isArray(data.contactAddressesAdditional)) data.contactAddressesAdditional = []
      const prefillContact = { id: 'prefill-contact-1', name: 'Animal and Plant Health Agency', addressLines: ['Woodham Lane', 'New Haw', 'Surrey', 'Addlestone', 'KT15 3NB'], country: 'United Kingdom of Great Britain and Northern Ireland' }
      if (!data.contactAddressesAdditional.find(a => a.id === prefillContact.id)) data.contactAddressesAdditional.push(prefillContact)
      data.contactAddressId = prefillContact.id
      return res.redirect(create('/transport-and-arrival'))
    }
    data.cphNumber = '12/345/6789'
    delete data.errors
    delete data.errorList
    res.redirect(create('/transport-and-arrival'))
  })

  router.get(create('/address-cph'), (req, res) => {
    storeReturnToIfPresent(req)
    const data = req.session.data || {}
    delete data.errors
    delete data.errorList
    if (isPetConsignment(data)) return res.redirect(create('/permanent-addresses-for-animals'))
    if (!isLivestockConsignment(data)) return res.redirect(create('/addresses'))
    res.render('v1-experimental/create/address-cph')
  })

  router.post(create('/address-cph'), (req, res) => {
    const data = req.session.data || {}
    if (isPetConsignment(data)) return res.redirect(create('/permanent-addresses-for-animals'))
    if (!isLivestockConsignment(data)) return res.redirect(create('/addresses'))
    const cphNumber = (data.cphNumber || '').trim()
    const errors = {}
    const errorList = []
    if (!cphNumber) {
      errors.cphNumber = 'Enter the CPH number'
      errorList.push({ href: '#cphNumber', text: 'Enter the CPH number' })
    }
    if (errorList.length > 0) {
      data.errors = errors
      data.errorList = errorList
      return res.redirect(create('/address-cph'))
    }
    delete data.errors
    delete data.errorList
    res.redirect(getRedirectPath(data, '/transport-and-arrival'))
  })

  // --- contact-address-search ---
  router.get(create('/contact-address-search'), (req, res) => {
    const data = req.session.data || {}
    const contactAddresses = require('../../data/contact-addresses.js')
    const additional = Array.isArray(data.contactAddressesAdditional) ? data.contactAddressesAdditional : []
    const allContacts = contactAddresses.map(c => ({
      id: c.id,
      name: c.name,
      address: (c.addressLines || [c.address] || []).join(', '),
      country: c.country || ''
    })).concat(additional.map(c => ({
      id: c.id,
      name: c.name,
      address: (c.addressLines || [c.address] || []).join(', '),
      country: c.country || ''
    })))
    const searchName = (req.query.searchName || '').trim().toLowerCase()
    const searchAddress = (req.query.searchAddress || '').trim().toLowerCase()
    const searchCountry = (req.query.searchCountry || '').trim()
    const page = parseInt(req.query.page, 10) || 1
    const perPage = 10

    data.contactSearchName = req.query.searchName ?? data.contactSearchName
    data.contactSearchAddress = req.query.searchAddress ?? data.contactSearchAddress
    data.contactSearchCountry = req.query.searchCountry ?? data.contactSearchCountry

    let filtered = allContacts
    if (searchName) filtered = filtered.filter(c => (c.name || '').toLowerCase().includes(searchName))
    if (searchAddress) filtered = filtered.filter(c => (c.address || '').toLowerCase().includes(searchAddress))
    if (searchCountry) filtered = filtered.filter(c => c.country === searchCountry)

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const pageNum = Math.max(1, Math.min(page, totalPages))
    const start = (pageNum - 1) * perPage
    const results = filtered.slice(start, start + perPage)
    const euCountries = require('../../data/eu-countries.js')
    const countriesFromData = [...new Set(allContacts.map(c => c.country).filter(Boolean))]
    const countries = [...new Set([...euCountries, ...countriesFromData])].sort()

    res.render('v1-experimental/create/contact-address-search', {
      results,
      countries,
      page: pageNum,
      totalPages,
      total,
      searchName: req.query.searchName ?? data.contactSearchName ?? '',
      searchAddress: req.query.searchAddress ?? data.contactSearchAddress ?? '',
      searchCountry: req.query.searchCountry ?? data.contactSearchCountry ?? '',
      basePath: base
    })
  })

  // --- contact-address-add-branch ---
  router.get(create('/contact-address-add-branch'), (req, res) => {
    const data = req.session.data || {}
    delete data.errors
    delete data.errorList
    const euCountries = require('../../data/eu-countries.js')
    const euuCountries = ['Iceland', 'Liechtenstein', 'Norway', 'Switzerland']
    const uk = 'United Kingdom of Great Britain and Northern Ireland'
    const allCountries = [...euCountries, ...euuCountries, uk].filter((c, i, arr) => arr.indexOf(c) === i).sort()
    const countryItems = [
      { value: '', text: 'Please select your country' },
      ...allCountries.map((c) => ({ value: c, text: c }))
    ]
    res.render('v1-experimental/create/contact-address-add-branch', { countryItems })
  })

  router.post(create('/contact-address-add-branch'), (req, res) => {
    const data = req.session.data || {}
    const branchAddressName = (req.body.branchAddressName || '').trim()
    const branchAddressLine1 = (req.body.branchAddressLine1 || '').trim()
    const branchCity = (req.body.branchCity || '').trim()
    const branchPostcode = (req.body.branchPostcode || '').trim()
    const branchTelephone = (req.body.branchTelephone || '').trim()
    const branchCountry = (req.body.branchCountry || '').trim()
    const branchEmail = (req.body.branchEmail || '').trim()
    const branchAddressLine2 = (req.body.branchAddressLine2 || '').trim()
    const branchAddressLine3 = (req.body.branchAddressLine3 || '').trim()
    const errors = {}
    const errorList = []
    if (!branchAddressName) {
      errors.branchAddressName = 'Enter the branch address name'
      errorList.push({ href: '#branchAddressName', text: 'Enter the branch address name' })
    }
    if (!branchAddressLine1) {
      errors.branchAddressLine1 = 'Enter address line 1'
      errorList.push({ href: '#branchAddressLine1', text: 'Enter address line 1' })
    }
    if (!branchCity) {
      errors.branchCity = 'Enter the city or town'
      errorList.push({ href: '#branchCity', text: 'Enter the city or town' })
    }
    if (!branchPostcode) {
      errors.branchPostcode = 'Enter the postcode or ZIP code'
      errorList.push({ href: '#branchPostcode', text: 'Enter the postcode or ZIP code' })
    }
    if (!branchTelephone) {
      errors.branchTelephone = 'Enter the telephone number'
      errorList.push({ href: '#branchTelephone', text: 'Enter the telephone number' })
    }
    if (!branchCountry) {
      errors.branchCountry = 'Select a country'
      errorList.push({ href: '#branchCountry', text: 'Select a country' })
    }
    if (!branchEmail) {
      errors.branchEmail = 'Enter the email address'
      errorList.push({ href: '#branchEmail', text: 'Enter the email address' })
    }
    if (errorList.length > 0) {
      data.errors = errors
      data.errorList = errorList
      data.branchAddressName = branchAddressName || req.body.branchAddressName
      data.branchAddressLine1 = branchAddressLine1 || req.body.branchAddressLine1
      data.branchAddressLine2 = branchAddressLine2 || req.body.branchAddressLine2
      data.branchAddressLine3 = branchAddressLine3 || req.body.branchAddressLine3
      data.branchCity = branchCity || req.body.branchCity
      data.branchPostcode = branchPostcode || req.body.branchPostcode
      data.branchTelephone = branchTelephone || req.body.branchTelephone
      data.branchCountry = branchCountry || req.body.branchCountry
      data.branchEmail = branchEmail || req.body.branchEmail
      return res.redirect(create('/contact-address-add-branch'))
    }
    const addressLines = [branchAddressLine1]
    if (branchAddressLine2) addressLines.push(branchAddressLine2)
    if (branchAddressLine3) addressLines.push(branchAddressLine3)
    addressLines.push(branchCity)
    addressLines.push(branchPostcode)
    const branchAddr = {
      id: `branch-${Date.now()}`,
      name: branchAddressName,
      addressLines,
      country: branchCountry,
      telephone: branchTelephone,
      email: branchEmail
    }
    if (!Array.isArray(data.contactAddressesAdditional)) data.contactAddressesAdditional = []
    data.contactAddressesAdditional.push(branchAddr)
    data.contactAddressId = branchAddr.id
    data.branchAddressAdded = true
    delete data.errors
    delete data.errorList
    delete data.branchAddressName
    delete data.branchAddressLine1
    delete data.branchAddressLine2
    delete data.branchCity
    delete data.branchPostcode
    delete data.branchTelephone
    delete data.branchCountry
    delete data.branchEmail
    res.redirect(create('/addresses') + '#contact-address')
  })

  router.get(create('/contact-address-add-branch-prefill'), (req, res) => {
    const data = req.session.data || {}
    if (!Array.isArray(data.contactAddressesAdditional)) data.contactAddressesAdditional = []
    const branchId = `branch-${Date.now()}`
    data.contactAddressesAdditional.push({
      id: branchId,
      name: 'Sample Branch Office',
      addressLines: ['123 High Street', 'Manchester', 'M1 2AB'],
      country: 'United Kingdom of Great Britain and Northern Ireland',
      telephone: '0161 123 4567',
      email: 'branch@example.com'
    })
    data.contactAddressId = branchId
    data.branchAddressAdded = true
    delete data.errors
    delete data.errorList
    res.redirect(create('/addresses') + '#contact-address')
  })

  // --- transport (combined transporter + arrival) ---
  router.get(create('/transport-arrival-prefill'), (req, res) => {
    const data = req.session.data || {}
    const d = new Date()
    d.setDate(d.getDate() + 3)
    data.arrivalDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    data.ukBorderPort = 'dover'
    delete data.errors
    delete data.errorList
    res.redirect(getRedirectPath(data, '/accompanying-documents'))
  })

  router.get(create('/transport-and-arrival-prefill'), (req, res) => {
    const data = req.session.data || {}
    delete data.errors
    delete data.errorList
    if (!data.transporterName || !data.transporterType) {
      const consignees = require('../../data/consignees.js')
      const sample = consignees.find(c => c.transporterType) || consignees[0]
      if (sample) {
        data.transporterId = sample.id
        data.transporterName = sample.name
        data.transporterAddress = sample.address
        data.transporterCountry = sample.country
        data.transporterType = sample.transporterType || ''
        data.transporterApprovalNumber = sample.approvalNumber || ''
      }
    }
    const d = new Date()
    d.setDate(d.getDate() + 3)
    data.arrivalDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    data.ukBorderPort = 'dover'
    res.redirect(getRedirectPath(data, '/accompanying-documents'))
  })

  router.get(create('/transport-transporter-prefill'), (req, res) => {
    const data = req.session.data || {}
    delete data.errors
    delete data.errorList
    if (!data.transporterName || !data.transporterType) {
      const consignees = require('../../data/consignees.js')
      const sample = consignees.find(c => c.transporterType) || consignees[0]
      if (sample) {
        data.transporterId = sample.id
        data.transporterName = sample.name
        data.transporterAddress = sample.address
        data.transporterCountry = sample.country
        data.transporterType = sample.transporterType || ''
        data.transporterApprovalNumber = sample.approvalNumber || ''
      }
    }
    res.redirect(create('/transport-and-arrival'))
  })

  router.get(create('/transport-arrival'), (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    res.redirect(302, create('/transport-and-arrival') + qs)
  })

  router.get(create('/transport-transporter'), (req, res) => {
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''
    res.redirect(302, create('/transport-and-arrival') + qs)
  })

  router.get(create('/transport-and-arrival'), (req, res) => {
    getTransportAndArrivalView(req, res)
  })

  router.post(create('/transport-and-arrival'), postTransportAndArrival)
  router.post(create('/transport-arrival'), postTransportAndArrival)
  router.post(create('/transport-transporter'), postTransportAndArrival)

  // --- transport-add-transporter ---
  router.get(create('/transport-add-transporter'), (req, res) => {
    const data = req.session.data || {}
    delete data.errors
    delete data.errorList
    const euCountries = require('../../data/eu-countries.js')
    const countryItems = [{ value: '', text: 'Select country' }, { value: 'United Kingdom', text: 'United Kingdom' }].concat(
      euCountries.map(c => ({ value: c, text: c }))
    )
    res.render('v1-experimental/create/transport-add-transporter', { countryItems })
  })

  router.post(create('/transport-add-transporter'), (req, res) => {
    const data = req.session.data || {}
    const transporterName = (data.transporterName || '').trim()
    const transporterAddressLine1 = (data.transporterAddressLine1 || '').trim()
    const transporterAddressLine2 = (data.transporterAddressLine2 || '').trim()
    const transporterTown = (data.transporterTown || '').trim()
    const transporterPostcode = (data.transporterPostcode || '').trim()
    const transporterCountry = (data.transporterCountry || '').trim()

    const errors = {}
    const errorList = []
    if (!transporterName) {
      errors.transporterName = 'Enter the name or organisation'
      errorList.push({ href: '#transporterName', text: 'Enter the name or organisation' })
    }
    if (!transporterAddressLine1) {
      errors.transporterAddressLine1 = 'Enter address line 1'
      errorList.push({ href: '#transporterAddressLine1', text: 'Enter address line 1' })
    }
    if (!transporterTown) {
      errors.transporterTown = 'Enter the town or city'
      errorList.push({ href: '#transporterTown', text: 'Enter the town or city' })
    }
    if (!transporterCountry) {
      errors.transporterCountry = 'Select a country'
      errorList.push({ href: '#transporterCountry', text: 'Select a country' })
    } else if (transporterCountry === 'United Kingdom' && !transporterPostcode) {
      errors.transporterPostcode = 'Enter the postcode'
      errorList.push({ href: '#transporterPostcode', text: 'Enter the postcode' })
    }

    if (errorList.length > 0) {
      data.errors = errors
      data.errorList = errorList
      const euCountries = require('../../data/eu-countries.js')
      const countryItems = [{ value: '', text: 'Select country' }, { value: 'United Kingdom', text: 'United Kingdom' }].concat(
        euCountries.map(c => ({ value: c, text: c }))
      )
      return res.redirect(create('/transport-add-transporter'))
    }

    delete data.transporterId
    const addressParts = [transporterAddressLine1, transporterAddressLine2, transporterTown, transporterPostcode].filter(Boolean)
    data.transporterAddress = addressParts.join(', ') + ', ' + transporterCountry
    data.transporterCountry = transporterCountry
    delete data.errors
    delete data.errorList
    res.redirect(create('/transport-and-arrival'))
  })

  // --- check-your-answers-prefill ---
  router.get(create('/check-your-answers-prefill'), (req, res) => {
    const d = req.session.data || {}
    d.importType = 'live-animals'
    d.countryOfOrigin = 'France'
    d.regionOfOriginRequired = 'no'
    d.designatedArrivalPoint = 'Dover'
    d.importReason = 'internal-market'
    d.internalMarketPurpose = 'breeding'
    d.requiredRestInterval = 'N/A'
    d.commodity = 'Cow'
    d.commoditySpecies = ['Bos taurus', 'Bos spp.']
    d.commodityType = 'domestic'
    d.quantity_bos_taurus = 24
    d.packages_bos_taurus = 3
    d.quantity_bos_spp = 11
    d.packages_bos_spp = 2
    d.earTag_bos_taurus_1 = 'UK123456789000'
    d.passport_bos_taurus_1 = 'GB-2024-001'
    d.earTag_bos_spp_1 = '123456000001'
    d.passport_bos_spp_1 = 'UK 123456 7 00001'
    d.earTag_bos_spp_2 = '123456000002'
    d.passport_bos_spp_2 = 'UK 123456 7 00002'
    d.earTag_bos_spp_3 = '123456000003'
    d.passport_bos_spp_3 = 'UK 123456 7 00003'
    d.animalsCertifiedFor = 'breeding-production'
    d.unweanedAnimals = 'no'
    d.documents = [
      { type: 'veterinary-health-certificate', reference: 'VHC-2024-001', date: '2025-06-14', attachments: [{}] },
      { type: 'commercial-invoice', reference: 'INV-7892', date: '2025-06-14', attachments: [] },
      { type: 'import-permit', reference: 'GB-IMP-2024-456', date: '2025-09-01', attachments: [{}, {}] }
    ]
    d.consignorName = 'Ferme Dupont SAS'
    d.consignorAddress = ['12 Rue de la Ferme', '75001 Paris']
    d.consignorCountry = 'France'
    d.consigneeName = 'Smith Livestock Ltd'
    d.consigneeAddress = ['45 Farm Road', 'Canterbury', 'CT1 2AB']
    d.consigneeCountry = 'United Kingdom'
    d.importerName = 'Smith Livestock Ltd'
    d.importerAddress = ['45 Farm Road', 'Canterbury', 'CT1 2AB']
    d.importerCountry = 'United Kingdom'
    d.placeOfDestinationName = 'Greenfield Farm'
    d.placeOfDestinationAddress = ['Marsh Lane', 'Ashford', 'TN25 4PQ']
    d.placeOfDestinationCountry = 'United Kingdom'
    d.cphNumber = '12/345/6789'
    d.contactAddressLine1 = '45 Farm Road'
    d.contactAddressTown = 'Canterbury'
    d.contactAddressPostcode = 'CT1 2AB'
    d.arrivalDate = '2025-06-15'
    d.ukBorderPort = 'dover'
    d.transporterName = 'EuroHaul Transport Ltd'
    d.transporterAddress = ['10 Depot Way', 'Folkestone', 'CT19 5AB']
    d.transporterCountry = 'United Kingdom'
    d.transporterType = 'Haulier'
    d.transporterApprovalNumber = 'GB-AP-2024-123'
    delete d.errors
    delete d.errorList
    d.taskListUnlocked = true
    assignDraftNotificationReferenceIfNeeded(d)
    res.redirect(create('/check-your-answers'))
  })

  // --- check-your-answers ---
  router.get(create('/check-your-answers'), (req, res) => {
    const data = req.session.data || {}
    delete data.errors
    delete data.errorList
    const viewData = buildCheckYourAnswersData(data, base)
    res.render('v1-experimental/create/check-your-answers', viewData)
  })

  router.post(create('/check-your-answers'), (req, res) => {
    delete req.session.data.errors
    delete req.session.data.errorList
    res.redirect(create('/declaration'))
  })

  // --- declaration ---
  router.get(create('/declaration-prefill'), (req, res) => {
    req.session.data = req.session.data || {}
    req.session.data.declarationAccepted = 'yes'
    completeDeclarationAndGoToConfirmation(req, res)
  })

  router.get(create('/declaration'), (req, res) => {
    delete req.session.data.errors
    delete req.session.data.errorList
    const now = new Date()
    const declarationDate = `${now.getDate()} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][now.getMonth()]} ${now.getFullYear()}`
    res.render('v1-experimental/create/declaration', { declarationDate })
  })

  router.post(create('/declaration'), (req, res) => {
    const accepted = req.session.data.declarationAccepted
    const isAccepted = accepted === 'yes' || (Array.isArray(accepted) && accepted.includes('yes'))
    if (!isAccepted) {
      req.session.data.errors = { declarationAccepted: 'You must confirm the declaration to submit' }
      req.session.data.errorList = [{ href: '#declaration-accepted-1', text: 'You must confirm the declaration to submit' }]
      return res.redirect(create('/declaration'))
    }
    completeDeclarationAndGoToConfirmation(req, res)
  })

  // --- confirmation ---
  router.get(create('/confirmation'), (req, res) => {
    const referenceNumber = req.session.data.lastReferenceNumber
    res.render('v1-experimental/create/confirmation', { referenceNumber })
  })

  // --- address-consignee (manual entry) ---
  router.get(create('/address-consignee'), (req, res) => {
    const data = req.session.data || {}
    delete data.errors
    delete data.errorList
    res.render('v1-experimental/create/address-consignee', { basePath: base })
  })

  router.post(create('/address-consignee'), (req, res) => {
    const data = req.session.data || {}
    const consigneeName = (data.consigneeName || '').trim()
    const consigneeAddressLine1 = (data.consigneeAddressLine1 || '').trim()
    const consigneeTown = (data.consigneeTown || '').trim()
    const consigneePostcode = (data.consigneePostcode || '').trim()

    const errors = {}
    const errorList = []
    if (!consigneeName) {
      errors.consigneeName = 'Enter the name or organisation'
      errorList.push({ href: '#consigneeName', text: 'Enter the name or organisation' })
    }
    if (!consigneeAddressLine1) {
      errors.consigneeAddressLine1 = 'Enter address line 1'
      errorList.push({ href: '#consigneeAddressLine1', text: 'Enter address line 1' })
    }
    if (!consigneeTown) {
      errors.consigneeTown = 'Enter the town or city'
      errorList.push({ href: '#consigneeTown', text: 'Enter the town or city' })
    }
    if (!consigneePostcode) {
      errors.consigneePostcode = 'Enter the postcode'
      errorList.push({ href: '#consigneePostcode', text: 'Enter the postcode' })
    }

    if (errorList.length > 0) {
      data.errors = errors
      data.errorList = errorList
      return res.redirect(create('/address-consignee'))
    }

    delete data.errors
    delete data.errorList
    res.redirect(create('/addresses'))
  })

  // --- address-consignee-search ---
  router.get(create('/address-consignee-search'), (req, res) => {
    const data = req.session.data || {}
    const consignees = require('../../data/consignees.js')
    const returnTo = req.query.returnTo || ''
    const isTransporter = returnTo === 'transport-transporter' || returnTo === 'transport-and-arrival'
    const page = parseInt(req.query.page, 10) || 1
    const perPage = 10

    let filtered = consignees
    if (isTransporter) {
      const searchName = (req.query.searchName || data.searchTransporterName || '').trim().toLowerCase()
      const searchApprovalNumber = (req.query.searchApprovalNumber || data.searchTransporterApprovalNumber || '').trim().toLowerCase()
      const searchPostCode = (req.query.searchPostCode || data.searchTransporterPostCode || '').trim().toLowerCase().replace(/\s+/g, ' ')
      data.searchTransporterName = req.query.searchName ?? data.searchTransporterName
      data.searchTransporterApprovalNumber = req.query.searchApprovalNumber ?? data.searchTransporterApprovalNumber
      data.searchTransporterPostCode = req.query.searchPostCode ?? data.searchTransporterPostCode
      if (searchName) filtered = filtered.filter(c => c.name.toLowerCase().includes(searchName))
      if (searchApprovalNumber) filtered = filtered.filter(c => (c.approvalNumber || '').toLowerCase().includes(searchApprovalNumber))
      if (searchPostCode) filtered = filtered.filter(c => (c.postCode || '').toLowerCase().replace(/\s+/g, ' ').includes(searchPostCode))
    } else {
      const searchName = (req.query.searchName || data.searchConsigneeName || '').trim().toLowerCase()
      const searchAddress = (req.query.searchAddress || data.searchConsigneeAddress || '').trim().toLowerCase()
      const searchCountry = (req.query.searchCountry || data.searchConsigneeCountry || '').trim()
      data.searchConsigneeName = req.query.searchName ?? data.searchConsigneeName
      data.searchConsigneeAddress = req.query.searchAddress ?? data.searchConsigneeAddress
      data.searchConsigneeCountry = req.query.searchCountry ?? data.searchConsigneeCountry
      if (searchName) filtered = filtered.filter(c => c.name.toLowerCase().includes(searchName))
      if (searchAddress) filtered = filtered.filter(c => c.address.toLowerCase().includes(searchAddress))
      if (searchCountry) filtered = filtered.filter(c => c.country === searchCountry)
    }

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const pageNum = Math.max(1, Math.min(page, totalPages))
    const start = (pageNum - 1) * perPage
    const results = filtered.slice(start, start + perPage)
    const countries = [...new Set(consignees.map(c => c.country))].sort()
    const forImporter = req.query.for === 'importer'
    res.render('v1-experimental/create/address-consignee-search', {
      results,
      countries,
      page: pageNum,
      totalPages,
      total,
      forImporter,
      returnTo,
      basePath: base
    })
  })

  // --- address-place-of-destination-search ---
  router.get(create('/address-place-of-destination-search'), (req, res) => {
    const data = req.session.data || {}
    const placesOfDestination = require('../../data/places-of-destination.js')
    const searchName = (req.query.searchName || data.searchPlaceOfDestinationName || '').trim().toLowerCase()
    const searchAddress = (req.query.searchAddress || data.searchPlaceOfDestinationAddress || '').trim().toLowerCase()
    const searchType = (req.query.searchType || data.searchPlaceOfDestinationType || '').trim()
    const searchCountry = (req.query.searchCountry || data.searchPlaceOfDestinationCountry || '').trim()
    const page = parseInt(req.query.page, 10) || 1
    const perPage = 10

    data.searchPlaceOfDestinationName = req.query.searchName ?? data.searchPlaceOfDestinationName
    data.searchPlaceOfDestinationAddress = req.query.searchAddress ?? data.searchPlaceOfDestinationAddress
    data.searchPlaceOfDestinationType = req.query.searchType ?? data.searchPlaceOfDestinationType
    data.searchPlaceOfDestinationCountry = req.query.searchCountry ?? data.searchPlaceOfDestinationCountry

    let filtered = placesOfDestination
    if (searchName) filtered = filtered.filter(p => p.name.toLowerCase().includes(searchName))
    if (searchAddress) filtered = filtered.filter(p => p.address.toLowerCase().includes(searchAddress))
    if (searchType) filtered = filtered.filter(p => p.type === searchType)
    if (searchCountry) filtered = filtered.filter(p => p.country === searchCountry)

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const pageNum = Math.max(1, Math.min(page, totalPages))
    const start = (pageNum - 1) * perPage
    const results = filtered.slice(start, start + perPage)
    const countries = [...new Set(placesOfDestination.map(p => p.country))].sort()
    const types = [...new Set(placesOfDestination.map(p => p.type))].sort()

    res.render('v1-experimental/create/address-place-of-destination-search', {
      results,
      countries,
      types,
      page: pageNum,
      totalPages,
      total,
      basePath: base
    })
  })

  // --- address-consignor-search ---
  router.get(create('/address-consignor-search'), (req, res) => {
    const data = req.session.data || {}
    const consignors = require('../../data/consignors.js')
    const euCountries = require('../../data/eu-countries.js')
    const searchName = (req.query.searchName || data.searchName || '').trim().toLowerCase()
    const searchAddress = (req.query.searchAddress || data.searchAddress || '').trim().toLowerCase()
    const searchCountry = (req.query.searchCountry || data.searchCountry || '').trim()
    const page = parseInt(req.query.page, 10) || 1
    const perPage = 10

    data.searchName = req.query.searchName ?? data.searchName
    data.searchAddress = req.query.searchAddress ?? data.searchAddress
    data.searchCountry = req.query.searchCountry ?? data.searchCountry

    let filtered = consignors
    if (searchName) filtered = filtered.filter(c => c.name.toLowerCase().includes(searchName))
    if (searchAddress) filtered = filtered.filter(c => c.address.toLowerCase().includes(searchAddress))
    if (searchCountry) filtered = filtered.filter(c => c.country === searchCountry)

    const total = filtered.length
    const totalPages = Math.max(1, Math.ceil(total / perPage))
    const pageNum = Math.max(1, Math.min(page, totalPages))
    const start = (pageNum - 1) * perPage
    const results = filtered.slice(start, start + perPage)
    const countriesFromData = [...new Set(consignors.map(c => c.country))]
    const countries = [...new Set([...euCountries, ...countriesFromData])].sort()

    res.render('v1-experimental/create/address-consignor-search', {
      results,
      countries,
      page: pageNum,
      totalPages,
      total,
      basePath: base
    })
  })
}

module.exports = { registerPostHubRoutes, buildCheckYourAnswersData }
