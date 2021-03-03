const constants = require('./constants')
const networks = require('./networks')
const AddressService = require('./services/AddressService')
require('dotenv').config()

let n = 12
const network = networks.BITCOIN_TEST
const btcBip32Priv = process.env.BTC_BIP32_PRIV
const btcSecondaryPubKey = process.env.BTC_SECONDARY_PUB_KEY

const btcBalanceMap = {}

createBtcBalanceMap()

async function createBtcBalanceMap () {
  while (n) {
    console.log('Evaluating addresses at i=' + n)
    const p2wsh_p2sh_addr = AddressService.generateSubsequentBlockioAddress(btcBip32Priv, btcSecondaryPubKey, n, network)
    const p2wsh_addr = AddressService.generateP2wshBlockioAddress(btcBip32Priv, btcSecondaryPubKey, n, network)

    try {
      const p2wsh_p2sh_addr_utxo = await AddressService.checkBlockioAddressBalance(p2wsh_p2sh_addr, network)
      const p2wsh_addr_utxo = await AddressService.checkBlockioAddressBalance(p2wsh_addr, network)

      btcBalanceMap[p2wsh_p2sh_addr] = {}
      btcBalanceMap[p2wsh_p2sh_addr].address_type = constants.P2WSH_P2SH
      btcBalanceMap[p2wsh_p2sh_addr].i = n
      btcBalanceMap[p2wsh_p2sh_addr].tx = []

      btcBalanceMap[p2wsh_addr] = {}
      btcBalanceMap[p2wsh_addr].address_type = constants.P2WSH
      btcBalanceMap[p2wsh_addr].i = n
      btcBalanceMap[p2wsh_addr].tx = []

      for (const x of p2wsh_p2sh_addr_utxo.data.txs) {
        const unspentObj = {}
        unspentObj.txid = x.txid
        unspentObj.output_no = x.output_no
        unspentObj.value = x.value

        btcBalanceMap[p2wsh_p2sh_addr].tx.push(unspentObj)
      }

      if (!btcBalanceMap[p2wsh_p2sh_addr].tx.length) { delete btcBalanceMap[p2wsh_p2sh_addr] }

      for (const x of p2wsh_addr_utxo.data.txs) {
        const unspentObj = {}
        unspentObj.txid = x.txid
        unspentObj.output_no = x.output_no
        unspentObj.value = x.value

        btcBalanceMap[p2wsh_addr].tx.push(unspentObj)
      }
      if (!btcBalanceMap[p2wsh_addr].tx.length) { delete btcBalanceMap[p2wsh_addr] }
    } catch (err) {
      console.log(err)
    }
    n--
  }
  console.log('Evaluating addresses at i=0')
  const p2sh_addr = AddressService.generateDefaultBlockioAddress(btcBip32Priv, btcSecondaryPubKey, network)

  btcBalanceMap[p2sh_addr] = {}
  btcBalanceMap[p2sh_addr].address_type = constants.P2SH
  btcBalanceMap[p2sh_addr].i = n
  btcBalanceMap[p2sh_addr].tx = []

  const p2sh_addr_utxo = await AddressService.checkBlockioAddressBalance(p2sh_addr, network)

  for (const x of p2sh_addr_utxo.data.txs) {
    const unspentObj = {}
    unspentObj.txid = x.txid
    unspentObj.output_no = x.output_no
    unspentObj.value = x.value

    btcBalanceMap[p2sh_addr].tx.push(unspentObj)
  }
  if (!btcBalanceMap[p2sh_addr].tx.length) {
    delete btcBalanceMap[p2sh_addr]
  }

  console.log(btcBalanceMap)
}
