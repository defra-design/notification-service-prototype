//
// Commodity list for the CHED-D (High-Risk Food and Feed of Non-Animal
// Origin) journey — the real HRFNAO product/CN-code list, not a placeholder.
//
// Source: Schedule 1 (substituted Annex I) and Schedule 2 (substituted
// Annex II) of The Official Controls (Import of High-Risk Food and Feed of
// Non-Animal Origin) (Amendment of Commission Implementing Regulation (EU)
// 2019/1793) (England) Regulations 2025 (UK SI 2025/1162), fetched from
// legislation.gov.uk on 2026-07-03. These two annexes ARE the actual list
// of HRFNAO products that require enhanced checks and a CHED-D — smaller
// than the "~4,000 codes" figure floated for CHED-D's full commodity list
// (that figure covers the whole CN nomenclature a CHED-D *could* reference;
// this is the specific high-risk subset that's the point of a CHED-D).
//
// Deduplicated by product: several countries share the same product/CN code
// (e.g. groundnuts in shell is 1202 41 00 for a dozen+ countries) — those
// are merged into one row's `typicalOriginCountries`. Where the regulation
// lists several CN sub-codes for one product (e.g. "groundnuts, otherwise
// prepared" spans three codes for different preparations), only the first
// is used here as `code`; see the SI itself for the full sub-code set.
// `hazard` is the specific risk the regulation checks for at that origin
// (Aflatoxins, Salmonella, Pesticide residues, etc) — not modelled
// elsewhere in this prototype, but useful context if a risk-based UI
// (e.g. "why does this need extra checks?") is ever wanted.
//
// This supersedes the earlier unverified placeholder version of this file.
//

module.exports = {
  'Groundnuts, in shell': { code: '12024100', commonName: 'Groundnuts, in shell', description: 'Groundnuts (peanuts), in shell', hazard: 'Aflatoxins', typicalOriginCountries: ['Bolivia', 'China', 'Madagascar', 'Paraguay', 'Senegal', 'United States', 'Argentina', 'Egypt', 'Ghana', 'The Gambia', 'India', 'Sudan'] },
  'Groundnuts, shelled': { code: '12024200', commonName: 'Groundnuts, shelled', description: 'Groundnuts (peanuts), shelled', hazard: 'Aflatoxins', typicalOriginCountries: ['Bolivia', 'China', 'Madagascar', 'Paraguay', 'Senegal', 'United States', 'Argentina', 'Egypt', 'Ghana', 'The Gambia', 'India', 'Sudan'] },
  'Groundnuts, otherwise prepared': { code: '20081191', commonName: 'Groundnuts, otherwise prepared', description: 'Groundnuts (peanuts), otherwise prepared or preserved', hazard: 'Aflatoxins', typicalOriginCountries: ['Bolivia', 'China', 'Madagascar', 'Paraguay', 'Senegal', 'United States', 'Argentina', 'Egypt', 'Ghana', 'The Gambia', 'India', 'Sudan'] },
  'Groundnut flours and meals': { code: '12089000', commonName: 'Groundnut flours and meals', description: 'Flours and meals of groundnuts (peanuts)', hazard: 'Aflatoxins', typicalOriginCountries: ['Bolivia', 'China', 'Madagascar', 'Paraguay', 'Senegal', 'United States', 'Argentina', 'Egypt', 'Ghana', 'The Gambia', 'India', 'Sudan'] },
  'Groundnuts paste': { code: '20071010', commonName: 'Groundnuts paste', description: 'Groundnut (peanut) paste', hazard: 'Aflatoxins', typicalOriginCountries: ['Bolivia', 'China', 'Madagascar', 'Paraguay', 'Senegal', 'United States', 'Argentina', 'Egypt', 'Ghana', 'The Gambia', 'India', 'Sudan'] },
  'Oilcake from groundnut oil extraction': { code: '23050000', commonName: 'Oilcake from groundnut oil extraction', description: 'Oilcake and other solid residues from groundnut oil extraction', hazard: 'Aflatoxins', typicalOriginCountries: ['Bolivia', 'China', 'Madagascar', 'Paraguay', 'Senegal', 'United States', 'Argentina', 'Egypt', 'Ghana', 'The Gambia', 'India', 'Sudan'] },
  'Peanut butter': { code: '20081110', commonName: 'Peanut butter', description: 'Peanut butter', hazard: 'Aflatoxins', typicalOriginCountries: ['Bolivia', 'China', 'Madagascar', 'Paraguay', 'Senegal', 'United States', 'Argentina', 'Egypt', 'Ghana', 'The Gambia', 'India', 'Sudan'] },
  'Black pepper (not crushed or ground)': { code: '09041100', commonName: 'Black pepper (not crushed or ground)', description: 'Pepper of the genus Piper, neither crushed nor ground', hazard: 'Salmonella', typicalOriginCountries: ['Brazil'] },
  'Papaws (papaya)': { code: '08072000', commonName: 'Papaws (papaya)', description: 'Papaws (papayas), fresh', hazard: 'Pesticide residues', typicalOriginCountries: ['Brazil'] },
  'Granadilla and passion fruit': { code: '08109020', commonName: 'Granadilla and passion fruit', description: 'Granadillas, passion fruit and similar fruit of the family Passifloraceae', hazard: 'Pesticide residues', typicalOriginCountries: ['Colombia'] },
  'Aubergines, fresh or chilled': { code: '07093000', commonName: 'Aubergines, fresh or chilled', description: 'Aubergines (eggplants), fresh or chilled', hazard: 'Pesticide residues', typicalOriginCountries: ['Dominican Republic'] },
  'Peppers, other than sweet (fresh, chilled or frozen)': { code: '07096099', commonName: 'Peppers, other than sweet (fresh, chilled or frozen)', description: 'Fruits of the genus Capsicum or Pimenta, other than sweet peppers, fresh/chilled/frozen', hazard: 'Pesticide residues', typicalOriginCountries: ['Dominican Republic', 'Egypt', 'Kenya', 'Pakistan', 'Thailand', 'Türkiye', 'Uganda', 'Vietnam'] },
  'Sweet peppers (fresh, chilled or frozen)': { code: '07096010', commonName: 'Sweet peppers (fresh, chilled or frozen)', description: 'Sweet peppers, fresh, chilled or frozen', hazard: 'Pesticide residues', typicalOriginCountries: ['Dominican Republic', 'Egypt', 'Türkiye'] },
  'Yardlong beans (fresh, chilled or frozen)': { code: 'ex07082000', commonName: 'Yardlong beans (fresh, chilled or frozen)', description: 'Yardlong beans (Vigna unguiculata subsp. sesquipedalis), fresh/chilled/frozen', hazard: 'Pesticide residues', typicalOriginCountries: ['Dominican Republic', 'India', 'Cambodia'] },
  'Bananas, fresh or dried': { code: '080390', commonName: 'Bananas, fresh or dried', description: 'Bananas, including plantains, fresh or dried', hazard: 'Pesticide residues', typicalOriginCountries: ['Ecuador'] },
  'Oranges, fresh or dried': { code: '080510', commonName: 'Oranges, fresh or dried', description: 'Oranges, fresh or dried', hazard: 'Pesticide residues', typicalOriginCountries: ['Egypt', 'Türkiye'] },
  'Hazelnuts, in shell': { code: '08022100', commonName: 'Hazelnuts, in shell', description: 'Hazelnuts or filberts (Corylus spp.), fresh or dried, in shell', hazard: 'Aflatoxins', typicalOriginCountries: ['Georgia', 'Azerbaijan'] },
  'Hazelnuts, shelled': { code: '08022200', commonName: 'Hazelnuts, shelled', description: 'Hazelnuts or filberts (Corylus spp.), fresh or dried, shelled', hazard: 'Aflatoxins', typicalOriginCountries: ['Georgia', 'Azerbaijan'] },
  'Hazelnuts, otherwise prepared (including mixtures)': { code: '20081912', commonName: 'Hazelnuts, otherwise prepared (including mixtures)', description: 'Hazelnuts otherwise prepared or preserved, including mixtures containing hazelnuts', hazard: 'Aflatoxins', typicalOriginCountries: ['Georgia', 'Azerbaijan'] },
  'Flour, meal and powder of hazelnuts': { code: '11063090', commonName: 'Flour, meal and powder of hazelnuts', description: 'Flour, meal and powder of hazelnuts', hazard: 'Aflatoxins', typicalOriginCountries: ['Georgia', 'Azerbaijan'] },
  'Hazelnut oil': { code: '15159099', commonName: 'Hazelnut oil', description: 'Hazelnut oil and its fractions', hazard: 'Aflatoxins', typicalOriginCountries: ['Georgia', 'Azerbaijan'] },
  'Hazelnut paste': { code: '20071010', commonName: 'Hazelnut paste', description: 'Hazelnut paste', hazard: 'Aflatoxins', typicalOriginCountries: ['Georgia', 'Azerbaijan'] },
  'Mixtures of nuts or dried fruit containing hazelnuts': { code: '08135039', commonName: 'Mixtures of nuts or dried fruit containing hazelnuts', description: 'Mixtures of nuts or dried fruits containing hazelnuts', hazard: 'Aflatoxins', typicalOriginCountries: ['Georgia', 'Azerbaijan'] },
  'Palm oil': { code: '15111090', commonName: 'Palm oil', description: 'Palm oil and its fractions, crude', hazard: 'Sudan dyes', typicalOriginCountries: ['Ghana'] },
  'Basil (holy, sweet), fresh or chilled': { code: '12119086', commonName: 'Basil (holy, sweet), fresh or chilled', description: 'Basil, fresh or chilled', hazard: 'Pesticide residues', typicalOriginCountries: ['Israel', 'Vietnam'] },
  'Mint, fresh or chilled': { code: '12119086', commonName: 'Mint, fresh or chilled', description: 'Mint, fresh or chilled', hazard: 'Pesticide residues', typicalOriginCountries: ['Israel', 'Vietnam'] },
  'Cinnamon and cinnamon-tree flowers, dried': { code: '0906', commonName: 'Cinnamon and cinnamon-tree flowers, dried', description: 'Cinnamon and cinnamon-tree flowers', hazard: 'Pesticide residues', typicalOriginCountries: ['India'] },
  'Cloves, dried': { code: '0907', commonName: 'Cloves, dried', description: 'Cloves (whole fruit, cloves and stems)', hazard: 'Pesticide residues', typicalOriginCountries: ['India'] },
  'Cumin seeds, neither crushed nor ground': { code: '09093100', commonName: 'Cumin seeds, neither crushed nor ground', description: 'Seeds of cumin, neither crushed nor ground', hazard: 'Pesticide residues', typicalOriginCountries: ['India'] },
  'Cumin seeds, crushed or ground': { code: '09093200', commonName: 'Cumin seeds, crushed or ground', description: 'Seeds of cumin, crushed or ground', hazard: 'Pesticide residues', typicalOriginCountries: ['India'] },
  'Curry leaves': { code: '12119086', commonName: 'Curry leaves', description: 'Curry leaves (Bergera/Murraya koenigii), fresh, chilled, frozen or dried', hazard: 'Pesticide residues', typicalOriginCountries: ['India'] },
  'Fenugreek leaves': { code: 'ex09109991', commonName: 'Fenugreek leaves', description: 'Fenugreek leaves', hazard: 'Pesticide residues', typicalOriginCountries: ['India'] },
  'Guar gum': { code: 'ex13023290', commonName: 'Guar gum', description: 'Guar gum, whether or not modified', hazard: 'Pentachlorophenol and dioxins', typicalOriginCountries: ['India'] },
  Nutmeg: { code: '09081100', commonName: 'Nutmeg', description: 'Nutmeg', hazard: 'Aflatoxins', typicalOriginCountries: ['India', 'Indonesia'] },
  'Nutmeg, mace and cardamoms, dried': { code: '0908', commonName: 'Nutmeg, mace and cardamoms, dried', description: 'Nutmeg, mace and cardamoms', hazard: 'Pesticide residues', typicalOriginCountries: ['India'] },
  'Peppers (sweet or other), dried, roasted, crushed or ground': { code: '09042110', commonName: 'Peppers (sweet or other), dried, roasted, crushed or ground', description: 'Fruits of the genus Capsicum or Pimenta, dried, roasted, crushed or ground', hazard: 'Aflatoxins / Pesticide residues', typicalOriginCountries: ['India', 'Sri Lanka'] },
  Rice: { code: '1006', commonName: 'Rice', description: 'Rice', hazard: 'Aflatoxins, Ochratoxin A and Pesticide residues', typicalOriginCountries: ['India', 'Pakistan'] },
  'Melon seeds': { code: '120770', commonName: 'Melon seeds', description: 'Melon seeds', hazard: 'Aflatoxins', typicalOriginCountries: ['Iran'] },
  'Beans (Vigna spp., Phaseolus spp.), fresh or chilled': { code: '070820', commonName: 'Beans (Vigna spp., Phaseolus spp.), fresh or chilled', description: 'Beans, shelled or unshelled, fresh or chilled', hazard: 'Pesticide residues', typicalOriginCountries: ['Kenya'] },
  'Chinese celery, fresh or chilled': { code: '07094000', commonName: 'Chinese celery, fresh or chilled', description: 'Celery other than celeriac, fresh or chilled', hazard: 'Pesticide residues', typicalOriginCountries: ['Cambodia'] },
  'Turnips, preserved by vinegar or acetic acid': { code: '20019097', commonName: 'Turnips, preserved by vinegar or acetic acid', description: 'Turnips, prepared or preserved by vinegar or acetic acid', hazard: 'Rhodamine B', typicalOriginCountries: ['Lebanon', 'Syria'] },
  'Turnips, preserved by brine or citric acid': { code: 'ex20059980', commonName: 'Turnips, preserved by brine or citric acid', description: 'Turnips, prepared or preserved by brine or citric acid, not frozen', hazard: 'Rhodamine B', typicalOriginCountries: ['Lebanon', 'Syria'] },
  Mukunuwenna: { code: '07099990', commonName: 'Mukunuwenna', description: 'Mukunuwenna (Alternanthera sessilis)', hazard: 'Pesticide residues', typicalOriginCountries: ['Sri Lanka'] },
  'Cow peas': { code: '07133500', commonName: 'Cow peas', description: 'Cow peas (Vigna unguiculata subspp.), dried, shelled', hazard: 'Pesticide residues', typicalOriginCountries: ['Madagascar'] },
  'Jackfruit, fresh': { code: '08109020', commonName: 'Jackfruit, fresh', description: 'Jackfruit, fresh', hazard: 'Pesticide residues', typicalOriginCountries: ['Malaysia'] },
  'Sesamum seeds': { code: '120740', commonName: 'Sesamum seeds', description: 'Sesamum (sesame) seeds, whether or not broken', hazard: 'Salmonella / Pesticide residues', typicalOriginCountries: ['Nigeria', 'Syria', 'Türkiye', 'Ethiopia', 'Sudan', 'Uganda', 'India'] },
  'Watermelon (egusi) seeds and derived products': { code: '12077000', commonName: 'Watermelon (egusi) seeds and derived products', description: 'Watermelon (egusi, Citrullus spp.) seeds and derived products', hazard: 'Aflatoxins', typicalOriginCountries: ['Sierra Leone', 'Nigeria'] },
  'Tahini and halva from sesame seeds': { code: '17049099', commonName: 'Tahini and halva from sesame seeds', description: 'Tahini and halva made from sesame (Sesamum) seeds', hazard: 'Salmonella', typicalOriginCountries: ['Syria', 'Türkiye'] },
  'Food containing or consisting of betel leaves': { code: 'ex14049000', commonName: 'Food containing or consisting of betel leaves', description: 'Food containing or consisting of betel leaves (Piper betle)', hazard: 'Salmonella', typicalOriginCountries: ['Thailand', 'Bangladesh', 'India'] },
  'Pitahaya (dragon fruit), fresh or chilled': { code: '08109020', commonName: 'Pitahaya (dragon fruit), fresh or chilled', description: 'Pitahaya (dragon fruit), fresh or chilled', hazard: 'Pesticide residues', typicalOriginCountries: ['Thailand', 'Vietnam'] },
  Grapefruits: { code: 'ex08054000', commonName: 'Grapefruits', description: 'Grapefruit, including pomelos', hazard: 'Pesticide residues', typicalOriginCountries: ['Türkiye'] },
  'Lemons, fresh, chilled or dried': { code: '08055010', commonName: 'Lemons, fresh, chilled or dried', description: 'Lemons (Citrus limon, Citrus limonum), fresh or dried', hazard: 'Pesticide residues', typicalOriginCountries: ['Türkiye'] },
  'Mandarins, tangerines and clementines': { code: '080521', commonName: 'Mandarins, tangerines and clementines', description: 'Mandarins (including tangerines and satsumas), clementines, wilkings and similar citrus hybrids', hazard: 'Pesticide residues', typicalOriginCountries: ['Türkiye'] },
  'Pomegranates, fresh or chilled': { code: '08109075', commonName: 'Pomegranates, fresh or chilled', description: 'Pomegranates, fresh or chilled', hazard: 'Pesticide residues', typicalOriginCountries: ['Türkiye'] },
  'Apricot kernels, unprocessed': { code: '12129995', commonName: 'Apricot kernels, unprocessed', description: 'Unprocessed whole, ground, milled, cracked or chopped apricot kernels for the final consumer', hazard: 'Cyanide', typicalOriginCountries: ['Türkiye'] },
  'Apricots, otherwise prepared or preserved': { code: '200850', commonName: 'Apricots, otherwise prepared or preserved', description: 'Apricots, otherwise prepared or preserved', hazard: 'Sulphites', typicalOriginCountries: ['Uzbekistan'] },
  'Dried apricots': { code: '08131000', commonName: 'Dried apricots', description: 'Apricots, dried', hazard: 'Sulphites', typicalOriginCountries: ['Uzbekistan'] },
  'Coriander leaves, fresh or chilled': { code: '07099990', commonName: 'Coriander leaves, fresh or chilled', description: 'Coriander leaves, fresh or chilled', hazard: 'Pesticide residues', typicalOriginCountries: ['Vietnam'] },
  'Okra, fresh, chilled or frozen': { code: '07099990', commonName: 'Okra, fresh, chilled or frozen', description: 'Okra, fresh, chilled or frozen', hazard: 'Pesticide residues', typicalOriginCountries: ['Vietnam', 'India'] },
  'Parsley, fresh or chilled': { code: '07099990', commonName: 'Parsley, fresh or chilled', description: 'Parsley, fresh or chilled', hazard: 'Pesticide residues', typicalOriginCountries: ['Vietnam'] },
  'Brazil nuts, in shell': { code: '08012100', commonName: 'Brazil nuts, in shell', description: 'Brazil nuts, fresh or dried, in shell', hazard: 'Aflatoxins', typicalOriginCountries: ['Brazil'] },
  'Mixtures of nuts or dried fruit containing Brazil nuts': { code: '08135031', commonName: 'Mixtures of nuts or dried fruit containing Brazil nuts', description: 'Mixtures of nuts or dried fruits containing Brazil nuts in shell', hazard: 'Aflatoxins', typicalOriginCountries: ['Brazil'] },
  'Enoki mushrooms': { code: 'ex07095900', commonName: 'Enoki mushrooms', description: 'Enoki mushrooms (Flammulina spp.)', hazard: 'Listeria', typicalOriginCountries: ['China', 'South Korea'] },
  'Tea, whether or not flavoured': { code: '0902', commonName: 'Tea, whether or not flavoured', description: 'Tea, whether or not flavoured', hazard: 'Pesticide residues', typicalOriginCountries: ['China'] },
  'Vine leaves': { code: '20089999', commonName: 'Vine leaves', description: 'Vine leaves, prepared or preserved', hazard: 'Pesticide residues', typicalOriginCountries: ['Egypt', 'Türkiye'] },
  'Ginger, saffron, turmeric, thyme, bay leaves, curry and other spices, dried': { code: '0910', commonName: 'Ginger, saffron, turmeric, thyme, bay leaves, curry and other spices, dried', description: 'Ginger, saffron, turmeric, thyme, bay leaves, curry and other spices', hazard: 'Aflatoxins / Pesticide residues', typicalOriginCountries: ['Ethiopia', 'India'] },
  'Pepper (Piper genus); dried, crushed or ground Capsicum or Pimenta': { code: '0904', commonName: 'Pepper (Piper genus); dried, crushed or ground Capsicum or Pimenta', description: 'Pepper of the genus Piper; dried, crushed or ground fruits of the genus Capsicum or Pimenta', hazard: 'Aflatoxins', typicalOriginCountries: ['Ethiopia'] },
  'Drumsticks (Moringa oleifera)': { code: '07099990', commonName: 'Drumsticks (Moringa oleifera)', description: 'Drumsticks (Moringa oleifera), fresh, chilled or frozen', hazard: 'Pesticide residues', typicalOriginCountries: ['India'] },
  'Seeds of anise, badian, fennel, coriander, cumin, caraway; juniper berries': { code: '0909', commonName: 'Seeds of anise, badian, fennel, coriander, cumin, caraway; juniper berries', description: 'Seeds of anise, badian, fennel, coriander, cumin or caraway; juniper berries', hazard: 'Pesticide residues', typicalOriginCountries: ['India'] },
  'Pistachios, in shell': { code: '08025100', commonName: 'Pistachios, in shell', description: 'Pistachios, fresh or dried, in shell', hazard: 'Aflatoxins', typicalOriginCountries: ['Iran', 'Türkiye'] },
  'Pistachios, shelled': { code: '08025200', commonName: 'Pistachios, shelled', description: 'Pistachios, fresh or dried, shelled', hazard: 'Aflatoxins', typicalOriginCountries: ['Iran', 'Türkiye'] },
  'Pistachios, prepared or preserved (including mixtures)': { code: '20081913', commonName: 'Pistachios, prepared or preserved (including mixtures)', description: 'Pistachios otherwise prepared or preserved, including mixtures containing pistachios', hazard: 'Aflatoxins', typicalOriginCountries: ['Iran', 'Türkiye'] },
  'Flour, meal and powder of pistachios': { code: '11063090', commonName: 'Flour, meal and powder of pistachios', description: 'Flour, meal and powder of pistachios', hazard: 'Aflatoxins', typicalOriginCountries: ['Iran', 'Türkiye'] },
  'Pistachio paste': { code: '20071010', commonName: 'Pistachio paste', description: 'Pistachio paste', hazard: 'Aflatoxins', typicalOriginCountries: ['Iran', 'Türkiye'] },
  'Mixtures of nuts or dried fruit containing pistachios': { code: '08135039', commonName: 'Mixtures of nuts or dried fruit containing pistachios', description: 'Mixtures of nuts or dried fruits containing pistachios', hazard: 'Aflatoxins', typicalOriginCountries: ['Iran', 'Türkiye'] },
  'Spice mixes': { code: '09109110', commonName: 'Spice mixes', description: 'Mixtures of spices', hazard: 'Aflatoxins', typicalOriginCountries: ['Pakistan'] },
  'Dried figs': { code: '08042090', commonName: 'Dried figs', description: 'Figs, dried', hazard: 'Aflatoxins', typicalOriginCountries: ['Türkiye'] },
  'Dried figs, prepared or preserved (including mixtures)': { code: '20089712', commonName: 'Dried figs, prepared or preserved (including mixtures)', description: 'Dried figs otherwise prepared or preserved, including mixtures containing dried figs', hazard: 'Aflatoxins', typicalOriginCountries: ['Türkiye'] },
  'Flour, meal or powder of dried figs': { code: '11063090', commonName: 'Flour, meal or powder of dried figs', description: 'Flour, meal or powder of dried figs', hazard: 'Aflatoxins', typicalOriginCountries: ['Türkiye'] },
  'Dried fig paste': { code: '20071010', commonName: 'Dried fig paste', description: 'Dried fig paste', hazard: 'Aflatoxins', typicalOriginCountries: ['Türkiye'] },
  'Mixtures of nuts or dried fruit containing figs': { code: '08135099', commonName: 'Mixtures of nuts or dried fruit containing figs', description: 'Mixtures of nuts or dried fruits containing figs', hazard: 'Aflatoxins', typicalOriginCountries: ['Türkiye'] }
}
