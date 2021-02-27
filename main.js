const networks = require('./networks')
const AddressService = require('./services/AddressService')

require('dotenv').config()

const btcBip32Priv = process.env.BTC_BIP32_PRIV
const btcSecondaryPubKey = process.env.BTC_SECONDARY_PUB_KEY

const ltcBip32Priv = process.env.LTC_BIP32_PRIV
const ltcSecondaryPubKey = process.env.LTC_SECONDARY_PUB_KEY

// const defaultAddr = AddressService.generateDefaultBlockioAddress(btcBip32Priv, btcSecondaryPubKey, networks.BITCOIN)
// const subsequentAddr = AddressService.generateSubsequentBlockioAddress(btcBip32Priv, btcSecondaryPubKey, 3, networks.BITCOIN)
// const nativeSegwitAddr = AddressService.generateP2wshBlockioAddress(btcBip32Priv, btcSecondaryPubKey, 4, networks.BITCOIN)

// console.log(defaultAddr)
// console.log(subsequentAddr)
// console.log(nativeSegwitAddr)

// AddressService.checkBlockioAddressBalance(defaultAddr, networks.BITCOIN)

const defaultAddr = AddressService.generateDefaultBlockioAddress(ltcBip32Priv, ltcSecondaryPubKey, networks.LITECOIN)
const subsequentAddr = AddressService.generateSubsequentBlockioAddress(ltcBip32Priv, ltcSecondaryPubKey, 3, networks.LITECOIN)
const nativeSegwitAddr = AddressService.generateP2wshBlockioAddress(ltcBip32Priv, ltcSecondaryPubKey, 4, networks.LITECOIN)

console.log(defaultAddr)
console.log(subsequentAddr)
console.log(nativeSegwitAddr)

AddressService.checkBlockioAddressBalance(defaultAddr, networks.LITECOIN)
