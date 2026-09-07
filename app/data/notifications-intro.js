//
// Mock notifications data for the intro dashboard (Defra ID sign-in front door)
//
// A separate dataset from ../data/notifications.js (used by the v1-baseline dashboard),
// so this journey can carry the type-prefixed reference format and notificationType field,
// without touching v1-baseline data kept for design history. See app/data/notification-types.js
// for the type list.
//
// GBN AG/PP/NNS/IUU rows use the agreed GBN-{CODE}-{YY}-{6-char Crockford base32} reference
// format (e.g. GBN-AG-26-7K8M2P) generated via app/lib/notification-reference.js -- see
// .claude/knowledge/decisions/gbn-reference-format-2026-07-23.md. CHED A/CHED PP rows keep
// their real, TRACES-sourced {TYPE}.GB.{year}.{7-digit number} format -- that's a different,
// out-of-scope scheme, not a leftover to fix.
//
// Post-2027 UK-EU SPS Agreement regime (see
// .claude/knowledge/decisions/gbn-nns-reinstated-post-2027-regime-2026-07-27.md): this
// prototype models the state of the world *after* that agreement takes effect, so origin
// countries are assigned accordingly --
//   - CHED A / CHED PP rows: Rest-of-World (non-EU) origins only
//   - GBN AG rows: EU-GB live animals & germinal -- EU origins
//   - The one GBN NNS row: EU-GB high risk plants -- EU origin
//   - GBN PP rows: ROW plant products -- non-EU origins
//   - IUU: wild-caught marine fish -- no origin constraint applied (dropped the "GBN"
//     prefix 2026-09-07 -- see .claude/knowledge/decisions/iuu-drops-gbn-prefix-2026-09-07.md)
//
// Each row's documents array uses the shared app/data/document-types.js values so the
// notification-details page's accompanying-documents table has real data to render
// (previously always fell back to 'Not yet added') -- CHED PP rows use a
// phytosanitary-certificate document (not veterinary-health-certificate, which is an
// animal-health document type) per .claude/knowledge/reference/ched-types-field-comparison.md.
//
// MKS EG/PO/FV rows (added 2026-09-07) are UK Marketing Standards notifications --
// a separate quality/labelling regime, not animal/plant health -- see
// .claude/knowledge/reference/marketing-standards-mks-types.md. Their MKS-{CODE}-{YY}-{6-char
// Crockford base32} references reuse the GBN reference shape for visual consistency
// (via app/lib/notification-reference.js's prefix option) since no real MKS reference
// format has been sourced. They fall through to the same general/animal-shaped
// check-your-answers view as IUU on the read-only details page, since -- like
// IUU -- they have no dedicated field spec yet (see app/routes.js's
// buildIntroNotificationViewData / isPlantDeclaration).
//
// Trimmed 2026-09-07 to one row per notification type (9 rows, was ~72) so the dashboard
// reads as a clean one-card-per-type demo -- the removed duplicate CHED A/CHED PP/GBN AG
// rows are recoverable from git history if bulk/pagination-testing volume is needed again.
//

module.exports = [
  { reference: 'CHEDA.GB.2026.1000608', commodity: 'Bos taurus (0102)', origin: 'USA', type: 'CHED A', consignee: 'Macdonald Osborne Inc', consignor: 'Wagner and Matthews', arrival: '8 March 2026', status: 'draft', documents: [{ type: 'veterinary-health-certificate', reference: 'VHC-US-2026-01000', date: '2026-03-02', attachments: ['veterinary-health-certificate.pdf'] }, { type: 'commercial-invoice', reference: 'INV-WAM-01000', date: '2026-03-03', attachments: ['commercial-invoice.pdf'] }, { type: 'import-permit', reference: 'GB-IP-2026-01000', date: '2026-03-03', attachments: ['import-permit.pdf'] }] },
  { reference: 'CHEDPP.GB.2026.1000145', commodity: 'Chrysanthemums (CHYSX)', origin: 'Turkey', type: 'CHED PP', consignee: 'Tee Inc', consignor: 'Istanbul Flower Company', arrival: '6 March 2026', status: 'draft', documents: [{ type: 'phytosanitary-certificate', reference: 'PC-TR-2026-01001', date: '2026-02-28', attachments: ['phytosanitary-certificate.pdf'] }, { type: 'commercial-invoice', reference: 'INV-IBC-01001', date: '2026-03-01', attachments: ['commercial-invoice.pdf'] }] },
  { reference: 'GBN-AG-26-T878N1', commodity: 'Bos taurus (0102)', origin: 'Poland', type: 'GBN AG', consignee: 'Hewitt and Ballard', consignor: 'Vanna Barr', arrival: '6 March 2026', status: 'submitted', documents: [{ type: 'veterinary-health-certificate', reference: 'VHC-PL-2026-01002', date: '2026-02-28', attachments: ['veterinary-health-certificate.pdf'] }, { type: 'commercial-invoice', reference: 'INV-VB-01002', date: '2026-03-01', attachments: ['commercial-invoice.pdf'] }] },
  { reference: 'GBN-NNS-26-9EK9HQ', commodity: 'Seed potatoes (SOLTU)', origin: 'Poland', type: 'GBN NNS', consignee: 'Truro Fresh Produce', consignor: 'Gdansk Potato Growers Sp.', arrival: '22 April 2026', status: 'submitted', documents: [{ type: 'phytosanitary-certificate', reference: 'PC-PL-2026-01051', date: '2026-04-16', attachments: ['phytosanitary-certificate.pdf'] }, { type: 'commercial-invoice', reference: 'INV-GO-01051', date: '2026-04-17', attachments: ['commercial-invoice.pdf'] }] },
  { reference: 'GBN-PP-26-QP83CG', commodity: 'Cut roses (ROSAA)', origin: 'Kenya', type: 'GBN PP', consignee: 'Aberystwyth Florists Ltd', consignor: 'Nairobi Flower Exports', arrival: '23 April 2026', status: 'draft', documents: [{ type: 'phytosanitary-certificate', reference: 'PC-KE-2026-01052', date: '2026-04-17', attachments: ['phytosanitary-certificate.pdf'] }, { type: 'commercial-invoice', reference: 'INV-NFE-01052', date: '2026-04-18', attachments: ['commercial-invoice.pdf'] }] },
  { reference: 'IUU-26-NK12H8', commodity: 'Atlantic cod (0302)', origin: 'Norway', type: 'IUU', consignee: 'Grimsby Seafood Ltd', consignor: 'Bergen Fisheries AS', arrival: '24 April 2026', status: 'submitted', documents: [{ type: 'veterinary-health-certificate', reference: 'VHC-NO-2026-01053', date: '2026-04-18', attachments: ['veterinary-health-certificate.pdf'] }, { type: 'commercial-invoice', reference: 'INV-BF-01053', date: '2026-04-19', attachments: ['commercial-invoice.pdf'] }] },
  { reference: 'MKS-EG-26-P4FPRQ', commodity: "Hens' eggs (0407)", origin: 'Netherlands', type: 'MKS EG', consignee: 'Norwich Egg Packers Ltd', consignor: 'Gelderland Egg Producers BV', arrival: '25 April 2026', status: 'submitted', documents: [{ type: 'health-certificate', reference: 'HC-NL-2026-01054', date: '2026-04-19', attachments: ['health-certificate.pdf'] }, { type: 'commercial-invoice', reference: 'INV-GEP-01054', date: '2026-04-20', attachments: ['commercial-invoice.pdf'] }] },
  { reference: 'MKS-PO-26-26V50S', commodity: 'Chicken meat, free range (0207)', origin: 'France', type: 'MKS PO', consignee: 'Canterbury Poultry Ltd', consignor: 'Bretagne Volailles SAS', arrival: '26 April 2026', status: 'draft', documents: [{ type: 'optional-indications-certificate', reference: 'OIC-FR-2026-01055', date: '2026-04-20', attachments: ['optional-indications-certificate.pdf'] }, { type: 'commercial-invoice', reference: 'INV-BV-01055', date: '2026-04-21', attachments: ['commercial-invoice.pdf'] }] },
  { reference: 'MKS-FV-26-6T5V20', commodity: 'Sweet peppers (CAPAN)', origin: 'Morocco', type: 'MKS FV', consignee: 'Kettering Fresh Produce Ltd', consignor: 'Agadir Produce Exports SARL', arrival: '27 April 2026', status: 'submitted', documents: [{ type: 'certificate-of-conformity', reference: 'COC-MA-2026-01056', date: '2026-04-21', attachments: ['certificate-of-conformity.pdf'] }, { type: 'commercial-invoice', reference: 'INV-APE-01056', date: '2026-04-22', attachments: ['commercial-invoice.pdf'] }] }
]
