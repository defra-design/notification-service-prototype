//
// Fictional session-like data for a CHED PP (plants/plant products) notification, aligned
// with dashboard notification CHEDPP.GB.2026.1000145. Sibling to notification-full-view-mock.js
// (the CHED-A/animal fixture) -- kept separate rather than merged, since CHED PP's shape
// (EPPO-coded commodities, wood packaging material, country of dispatch) has no meaningful
// overlap with the animal fields that fixture carries (CPH, ear tags, animal purpose, etc).
//

module.exports = {
  importType: 'plants',
  notificationDateCreated: '15 April 2026',
  countryOfOrigin: 'Netherlands',
  countryOfDispatch: 'Netherlands',
  consignmentReference: 'NL-EXP-2026-2201',
  plantCommodities: [
    { commonName: 'Cut tulips', eppoCode: 'TULGE', productType: 'Cut flowers', quantity: 500, packageCount: 20, netWeight: '120kg', packagingMaterial: 'Cardboard box' }
  ],
  wpm: [
    { description: 'Pine wood pallets', eppoCode: 'PIUSY', count: 20, countryOfOrigin: 'Netherlands', ispm15Marked: 'Yes' }
  ],
  consignorName: 'Delta Bulb Exporters BV',
  consignorAddress: ['Bloemenweg 22', '2181 Aalsmeer'],
  consignorCountry: 'Netherlands',
  consigneeName: 'Midlands Garden Wholesale Ltd',
  consigneeAddressLine1: 'Unit 4 Blossom Trading Estate',
  consigneeAddressLine2: 'Meadow Lane',
  consigneeTown: 'Nottingham',
  consigneePostcode: 'NG7 2RD',
  importerName: 'Midlands Garden Wholesale Ltd',
  importerAddressLine1: 'Unit 4 Blossom Trading Estate',
  importerAddressLine2: 'Meadow Lane',
  importerTown: 'Nottingham',
  importerPostcode: 'NG7 2RD',
  importerCountry: 'United Kingdom',
  placeOfDestinationName: 'Midlands Garden Wholesale distribution centre',
  placeOfDestinationAddressLine1: 'Unit 4 Blossom Trading Estate',
  placeOfDestinationAddressLine2: 'Meadow Lane',
  placeOfDestinationTown: 'Nottingham',
  placeOfDestinationPostcode: 'NG7 2RD',
  placeOfDestinationCountry: 'United Kingdom',
  transporterName: 'EuroFlora Logistics BV',
  transporterAddressLine1: 'Havenweg 8',
  transporterTown: 'Aalsmeer',
  transporterPostcode: '1431 GA',
  transporterCountry: 'Netherlands',
  transporterType: 'Commercial transporter',
  transporterApprovalNumber: 'NL-TR-2020-3391',
  ukBorderPort: 'dover',
  arrivalDate: '2026-04-20',
  documents: [
    { type: 'phytosanitary-certificate', reference: 'PC-NL-2026-88213', date: '2026-04-12', attachments: ['phytosanitary-certificate.pdf'] },
    { type: 'commercial-invoice', reference: 'INV-DBE-22019', date: '2026-04-12', attachments: ['commercial-invoice.pdf'] }
  ]
}
