const definitions = [
  { value: '', text: 'Select a port or border point' },
  { value: 'dover', text: 'Port of Dover', code: 'GBDVR' },
  { value: 'eurotunnel-folkestone', text: 'Eurotunnel Folkestone', code: 'GBFOL' },
  { value: 'folkestone-trl', text: 'Folkestone (TRL)', code: 'GBFTL' },
  { value: 'harwich', text: 'Port of Harwich', code: 'GBHRW' },
  { value: 'holyhead', text: 'Port of Holyhead', code: 'GBHLY' },
  { value: 'hull', text: 'Port of Hull', code: 'GBHUL' },
  { value: 'immingham', text: 'Port of Immingham', code: 'GBIMM' },
  { value: 'liverpool', text: 'Port of Liverpool', code: 'GBLIV' },
  { value: 'newhaven', text: 'Port of Newhaven', code: 'GBNHV' },
  { value: 'pembroke', text: 'Port of Pembroke', code: 'GBPEM' },
  { value: 'plymouth', text: 'Port of Plymouth', code: 'GBPLY' },
  { value: 'portsmouth', text: 'Port of Portsmouth', code: 'GBPOR' },
  { value: 'purfleet', text: 'Port of Purfleet', code: 'GBPFT' },
  { value: 'tyne', text: 'Port of Tyne', code: 'GBTYN' },
  { value: 'belfast', text: 'Belfast', code: 'GBBEL' },
  { value: 'glasgow', text: 'Glasgow', code: 'GBGLW' },
  { value: 'aberdeen-airport', text: 'Aberdeen Airport', code: 'GBABZ' },
  { value: 'belfast-international-airport', text: 'Belfast International Airport', code: 'GBBFS' },
  { value: 'birmingham-airport', text: 'Birmingham Airport', code: 'GBBHX' },
  { value: 'bristol-airport', text: 'Bristol Airport', code: 'GBBRS' },
  { value: 'cardiff-airport', text: 'Cardiff Airport', code: 'GBCWL' },
  { value: 'east-midlands-airport', text: 'East Midlands Airport', code: 'GBEMA' },
  { value: 'edinburgh-airport', text: 'Edinburgh Airport', code: 'GBEDI' },
  { value: 'gatwick-airport', text: 'Gatwick Airport', code: 'GBLGW' },
  { value: 'belfast-city-airport', text: 'George Best Belfast City Airport', code: 'GBBHD' },
  { value: 'glasgow-airport', text: 'Glasgow Airport', code: 'GBGLA' },
  { value: 'heathrow-airport', text: 'Heathrow Airport', code: 'GBLHR' },
  { value: 'leeds-bradford-airport', text: 'Leeds Bradford Airport', code: 'GBLBA' },
  { value: 'liverpool-airport', text: 'Liverpool John Lennon Airport', code: 'GBLPL' },
  { value: 'london-city-airport', text: 'London City Airport', code: 'GBLCY' },
  { value: 'stansted-airport', text: 'London Stansted Airport', code: 'GBSTN' },
  { value: 'luton-airport', text: 'Luton Airport', code: 'GBLTN' },
  { value: 'manchester-airport', text: 'Manchester Airport', code: 'GBMAN' },
  { value: 'newcastle-airport', text: 'Newcastle Airport', code: 'GBNTL' },
  { value: 'southampton-airport', text: 'Southampton Airport', code: 'GBSOU' },
  { value: 'other', text: 'Other' }
]

function formatPortLabel (entry) {
  if (!entry || !entry.code) return entry.text
  return `${entry.text} (${entry.code})`
}

const borderPortItems = definitions.map((d) => ({
  value: d.value,
  text: formatPortLabel(d)
}))

function getBorderPortLabel (value) {
  if (!value || !String(value).trim()) return 'Not provided'
  const found = definitions.find((i) => i.value === value)
  return found ? formatPortLabel(found) : value
}

module.exports = { borderPortItems, getBorderPortLabel }
