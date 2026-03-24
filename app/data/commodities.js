//
// Commodity options with details for species selection
//

module.exports = {
  Cow: {
    code: '0102',
    commonName: 'Cow',
    description: 'Live bovine animals',
    commodityTypes: ['Domestic', 'Game'],
    species: [
      'Bison bison',
      'Bos spp.',
      'Bos taurus',
      'Bubalus bubalis'
    ]
  },
  Horse: {
    code: '0101',
    commonName: 'Horse',
    description: 'Live horses, asses, mules and hinnies',
    commodityTypes: ['Domestic'],
    species: [
      'Equus asinus',
      'Equus caballus',
      'Equus przewalskii'
    ]
  }
}
