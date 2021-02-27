const networks = require('./networks')
const AddressService = require('./services/AddressService')

require('dotenv').config()

const bip32Priv = process.env.BIP32_PRIV
const secondaryPubKey = process.env.SECONDARY_PUB_KEY

let defaultAddr = AddressService.generateDefaultBlockioAddress(bip32Priv, secondaryPubKey)
let subsequentAddr = AddressService.generateSubsequentBlockioAddress(bip32Priv, secondaryPubKey, 4)
let nativeSegwitAddr = AddressService.generateP2wshBlockioAddress(bip32Priv, secondaryPubKey, 5)

console.log(defaultAddr)
console.log(subsequentAddr)
console.log(nativeSegwitAddr)

AddressService.checkBlockioAddressBalance(defaultAddr, networks.BITCOIN)
