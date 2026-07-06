//
// Illustrative commodity + country of origin combinations that trigger the
// conditional "administrative region of origin" field on the chedd-traces
// commodity page (I.12 Region of Origin — only required where regionalisation
// measures apply for that specific product/origin pairing). These are
// examples for prototyping the conditional pattern, not verified against
// real EU/GB regionalisation designations.
//
// `commodity` matches a key in `commodities-ched-d.js`; `country` matches
// `text` in `traces-countries.js`. Both must match for the field to show.
//

module.exports = [
  { commodity: 'Groundnuts, in shell', country: 'China', label: 'Province of origin', hint: 'Enter the Chinese province where the groundnuts were grown' },
  { commodity: 'Rice', country: 'India', label: 'State of origin', hint: 'Enter the Indian state where the rice was grown' },
  { commodity: 'Okra, fresh, chilled or frozen', country: 'Vietnam', label: 'Province of origin', hint: 'Enter the Vietnamese province where the okra was grown' }
]
