const networks = require('../networks')
const AddressService = require('../services/AddressService')

require('dotenv').config()

const dcBip32Priv = process.env.DC_BIP32_PRIV
const dcSecondaryPubKey = process.env.DC_SECONDARY_PUB_KEY

const defaultAddr = AddressService.generateDefaultBlockioAddress(dcBip32Priv, dcSecondaryPubKey, networks.DOGECOIN, 1)
const subsequentAddr = AddressService.generateSubsequentBlockioAddress(dcBip32Priv, dcSecondaryPubKey, 1, networks.DOGECOIN)
const nativeSegwitAddr = AddressService.generateP2wshBlockioAddress(dcBip32Priv, dcSecondaryPubKey, 4, networks.DOGECOIN)

console.log(defaultAddr)
console.log(subsequentAddr)
console.log(nativeSegwitAddr)

console.log(AddressService.checkBlockioAddressBalance(defaultAddr, networks.DOGECOIN))
