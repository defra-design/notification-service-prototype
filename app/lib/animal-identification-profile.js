//
// Maps commodity key + reference data to animal identification field sets on the
// animal-identification step and check your answers.
//

const POULTRY_CODES = new Set([
  '01059400', '01059910', '01059920', '01059950', '01059930',
  '01051111', '01051300', '01051400', '01051500', '01051200'
])

function normalizeCode (details) {
  if (!details || details.code == null) return ''
  return String(details.code).replace(/\s/g, '')
}

function getAnimalIdentificationShape (commodityKey, details) {
  const key = commodityKey || ''
  const code = normalizeCode(details)
  const isEarTagOnlyIdentification = code === '0103'
  const isMicrochipEarTagIdentification =
    code === '010410' ||
    code === '010420' ||
    code === '10410' ||
    code === '10420' ||
    key === 'Goats' ||
    key === 'Sheep (Domestic)'
  const isHorseIdentification = code === '0101' && key === 'Horse'
  const isGameBirdIdentification = code === '01063980'
  const isHatchingEggIdentification = code === '04071100'
  const isPoultryIdentification = POULTRY_CODES.has(code) && !isHatchingEggIdentification
  const isBeeIdentification = key === 'Bees' || code === '01064100'

  let isPetIdentification = false
  let isSmallMammalIdentification = false
  if (code === '01061900') {
    if (key === 'Dog' || key === 'Cat') {
      isPetIdentification = true
    } else {
      isSmallMammalIdentification = true
    }
  }

  return {
    isPetIdentification,
    isSmallMammalIdentification,
    isGameBirdIdentification,
    isHatchingEggIdentification,
    isPoultryIdentification,
    isBeeIdentification,
    isHorseIdentification,
    isEarTagOnlyIdentification,
    isMicrochipEarTagIdentification
  }
}

module.exports = {
  getAnimalIdentificationShape,
  POULTRY_CODES
}
