const networks = require('../networks')
const AddressService = require('../services/AddressService')

require('dotenv').config()

const btcBip32Priv = process.env.BTC_BIP32_PRIV
const btcSecondaryPubKey = process.env.BTC_SECONDARY_PUB_KEY

const defaultAddr = AddressService.generateDefaultBlockioAddress(btcBip32Priv, btcSecondaryPubKey, networks.BITCOIN_TEST)
const subsequentAddr = AddressService.generateSubsequentBlockioAddress(btcBip32Priv, btcSecondaryPubKey, 5, networks.BITCOIN_TEST)
const nativeSegwitAddr = AddressService.generateP2wshBlockioAddress(btcBip32Priv, btcSecondaryPubKey, 5, networks.BITCOIN_TEST)

console.log(defaultAddr)
console.log(subsequentAddr, "Subsequent")
console.log(nativeSegwitAddr)

AddressService.checkBlockioAddressBalance(defaultAddr, networks.BITCOIN_TEST)
