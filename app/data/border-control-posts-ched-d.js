//
// UK Border Control Posts (BCPs) authorised to handle High-Risk Food and Feed
// of Non-Animal Origin (HRFNAO) imports - i.e. competent for CHED-D.
//
// Filtered from the two GOV.UK "authorised border control posts" lists (ports
// and airports) down to just the BCPs with a PNAO-HC (food, human
// consumption) or PNAO-NHC (feed, non-human consumption) authorisation -
// the regulatory categories HRFNAO/CHED-D falls under. BCPs that only handle
// live animals (LA) or products of animal origin (POA), with no PNAO
// authorisation, are excluded as not competent for CHED-D.
//
// Source (fetched 2026-07-07 via an AI-summarised page fetch, not a verbatim
// scrape - spot-check codes against the source pages before relying on this
// for anything beyond a prototype):
// https://www.gov.uk/government/publications/animals-animal-products-and-hrfnao-imports-authorised-border-control-posts-in-the-uk/live-animals-animal-products-and-food-and-feed-of-non-animal-origin-border-control-posts-at-ports-in-the-uk
// https://www.gov.uk/government/publications/animals-animal-products-and-hrfnao-imports-authorised-border-control-posts-in-the-uk/live-animals-animal-products-and-food-and-feed-of-non-animal-origin-border-control-posts-at-airports-in-the-uk
//

const definitions = [
  // Ports
  { value: 'belfast-port', text: 'Belfast Port', location: 'Belfast Harbour Estate', code: 'GBBEL1', type: 'Port' },
  { value: 'bristol-portbury', text: 'Bristol (Royal Portbury Dock)', location: 'Bristol', code: 'GBPBY017', type: 'Port' },
  { value: 'dover-deep-sea', text: 'Dover Harbour (Deep Sea)', location: 'Dover, Kent', code: 'GBDOV2P', type: 'Port' },
  { value: 'felixstowe-tcef', text: 'Felixstowe TCEF', location: 'Felixstowe, Suffolk', code: 'GBFXT1', type: 'Port' },
  { value: 'felixstowe-atef', text: 'Felixstowe ATEF', location: 'Felixstowe, Suffolk', code: 'GBFXT1', type: 'Port' },
  { value: 'grangemouth-container', text: 'Grangemouth Container Terminal', location: 'Stirlingshire', code: 'GBDPE30', type: 'Port' },
  { value: 'grimsby-immingham', text: 'Grimsby & Immingham', location: 'Immingham', code: 'GBIMM20', type: 'Port' },
  { value: 'harwich', text: 'Harwich', location: 'Essex', code: 'GBHRW1P', type: 'Port' },
  { value: 'hull', text: 'Hull', location: 'Hull', code: 'GBHUL21', type: 'Port' },
  { value: 'killingholme', text: 'Killingholme', location: 'North Killingholme', code: 'GBKIL05', type: 'Port' },
  { value: 'liverpool', text: 'Liverpool', location: 'Liverpool', code: 'GBLIV1', type: 'Port' },
  { value: 'london-gateway', text: 'London Gateway', location: 'Stanford-le-Hope, Essex', code: 'GBLGP1', type: 'Port' },
  { value: 'newhaven', text: 'Newhaven', location: 'Newhaven', code: 'GBNHV11', type: 'Port' },
  { value: 'port-of-poole', text: 'Port of Poole', location: 'Poole', code: 'GBPPO1P', type: 'Port' },
  { value: 'portico-shipping', text: 'Portico Shipping Ltd', location: 'Portsmouth', code: 'GBPME1P', type: 'Port' },
  { value: 'portsmouth-international', text: 'Portsmouth International Port', location: 'Portsmouth', code: 'GBPTM14', type: 'Port' },
  { value: 'purfleet', text: 'Purfleet', location: 'Purfleet', code: 'GBPUF04', type: 'Port' },
  { value: 'rosyth', text: 'Rosyth', location: 'Fife', code: 'GBDPE32', type: 'Port' },
  { value: 'sevington-ibf', text: 'Sevington IBF', location: 'Ashford, Kent', code: 'GBSEV25', type: 'Port' },
  { value: 'southampton-western-docks', text: 'Southampton Western Docks', location: 'Southampton', code: 'GBSOU1', type: 'Port' },
  { value: 'teesport', text: 'Teesport', location: 'Middlesbrough', code: 'GBTEESP1', type: 'Port' },
  { value: 'thamesport', text: 'Thamesport', location: 'Isle of Grain, Kent', code: 'GBTHP1', type: 'Port' },
  { value: 'tilbury', text: 'Tilbury', location: 'Tilbury, Essex', code: 'GBTIL1', type: 'Port' },
  { value: 'tilbury-2-roro', text: 'Tilbury 2 Ro Ro Terminal', location: 'West Tilbury, Essex', code: 'GBTIL09', type: 'Port' },
  { value: 'tyne-merchant-house', text: 'Tyne - Merchant House', location: 'South Shields', code: 'GBTYN4P', type: 'Port' },

  // Airports
  { value: 'east-midlands-airport', text: 'East Midlands Airport', location: 'Castle Donington, Derby', code: 'GBEMA4', type: 'Airport' },
  { value: 'gatwick-airport', text: 'Gatwick Airport', location: 'West Sussex', code: 'GBLGW1', type: 'Airport' },
  { value: 'heathrow-hpc', text: 'Heathrow - HPC', location: 'Hounslow', code: 'GBLHR1', type: 'Airport' },
  { value: 'heathrow-primeflight', text: 'Heathrow - PrimeFlight', location: 'Hatton Cross', code: 'GBLHR4', type: 'Airport' },
  { value: 'manchester-airport', text: 'Manchester Airport', location: 'Manchester', code: 'GBMNC1', type: 'Airport' },
  { value: 'stansted-airport', text: 'Stansted Airport', location: 'Essex', code: 'GBSTN4', type: 'Airport' },
  { value: 'teesside-airport', text: 'Teesside Airport', location: 'Darlington', code: 'GBTEE079', type: 'Airport' }
]

function formatBcpLabel (entry) {
  if (!entry || !entry.code) return entry.text
  return `${entry.text} (${entry.code})`
}

const bcpItems = definitions.map((d) => ({
  value: d.value,
  text: formatBcpLabel(d)
}))

function getBcpLabel (value) {
  if (!value || !String(value).trim()) return 'Not provided'
  const found = definitions.find((i) => i.value === value)
  return found ? formatBcpLabel(found) : value
}

module.exports = { bcpItems, getBcpLabel, definitions }
