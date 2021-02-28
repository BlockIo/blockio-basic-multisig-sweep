const networks = require('../networks')
const AddressService = require('../services/AddressService')

require('dotenv').config()

const ltcBip32Priv = process.env.LTC_BIP32_PRIV
const ltcSecondaryPubKey = process.env.LTC_SECONDARY_PUB_KEY

const defaultAddr = AddressService.generateDefaultBlockioAddress(ltcBip32Priv, ltcSecondaryPubKey, networks.LITECOIN)
const subsequentAddr = AddressService.generateSubsequentBlockioAddress(ltcBip32Priv, ltcSecondaryPubKey, 3, networks.LITECOIN)
const nativeSegwitAddr = AddressService.generateP2wshBlockioAddress(ltcBip32Priv, ltcSecondaryPubKey, 4, networks.LITECOIN)

console.log(defaultAddr)
console.log(subsequentAddr)
console.log(nativeSegwitAddr)

console.log(AddressService.checkBlockioAddressBalance(defaultAddr, networks.LITECOIN))
