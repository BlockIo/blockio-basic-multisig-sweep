const networks = require('./networks')
const AddressService = require('./services/AddressService')
require('dotenv').config()

let n = 5
const network = networks.BITCOIN
const btcBip32Priv = process.env.BTC_BIP32_PRIV
const btcSecondaryPubKey = process.env.BTC_SECONDARY_PUB_KEY

const btcBalanceMap = {}

createBtcBalanceMap()

async function createBtcBalanceMap () {
  while (n) {
    const p2wsh_p2sh_addr = AddressService.generateSubsequentBlockioAddress(btcBip32Priv, btcSecondaryPubKey, n, network)
    const p2wsh_addr = AddressService.generateP2wshBlockioAddress(btcBip32Priv, btcSecondaryPubKey, n, network)

    try {
      const p2wsh_p2sh_addr_balance = await AddressService.checkBlockioAddressBalance(p2wsh_p2sh_addr, network)
      const p2wsh_addr_balance = await AddressService.checkBlockioAddressBalance(p2wsh_addr, network)

      btcBalanceMap[p2wsh_p2sh_addr] = parseFloat(p2wsh_p2sh_addr_balance.data.confirmed_balance)
      btcBalanceMap[p2wsh_addr] = parseFloat(p2wsh_addr_balance.data.confirmed_balance)
    } catch (err) {
      console.log(err)
    }
    n--
  }
  const p2sh_addr = AddressService.generateDefaultBlockioAddress(btcBip32Priv, btcSecondaryPubKey, network)
  const p2sh_addr_balance = await AddressService.checkBlockioAddressBalance(p2sh_addr, network)

  btcBalanceMap[p2sh_addr] = parseFloat(p2sh_addr_balance.data.confirmed_balance)

  console.log(btcBalanceMap)
}
