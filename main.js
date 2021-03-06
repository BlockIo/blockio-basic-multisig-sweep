const constants = require('./constants')
const networks = require('./networks')
const AddressService = require('./services/AddressService')
const fetch = require('node-fetch')

require('dotenv').config()

sweepCoins()

async function sweepCoins () {
  const n = 12
  const network = networks.BITCOIN_TEST
  const btcBip32Priv = process.env.BTC_BIP32_PRIV
  const btcSecondaryPubKey = process.env.BTC_SECONDARY_PUB_KEY

  const utxoMap = await createBtcBalanceMap(btcBip32Priv, btcSecondaryPubKey, n, network)
}

async function createBtcBalanceMap (btcBip32Priv, btcSecondaryPubKey, n, network) {
  const btcBalanceMap = {}
  while (n) {
    console.log('Evaluating addresses at i=' + n)
    const p2wsh_p2sh_addr_payment = AddressService.generateSubsequentBlockioAddress(btcBip32Priv, btcSecondaryPubKey, n, network)
    const p2wsh_addr_payment = AddressService.generateP2wshBlockioAddress(btcBip32Priv, btcSecondaryPubKey, n, network)
    const p2wsh_p2sh_addr = p2wsh_p2sh_addr_payment.address
    const p2wsh_addr = p2wsh_addr_payment.address

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
        unspentObj.hash = x.txid
        unspentObj.index = x.output_no
        unspentObj.value = x.value
        unspentObj.witnessUtxo = {
          script: Buffer.from(x.script_hex, 'hex'),
          value: parseFloat(x.value) * constants.SAT
        }
        unspentObj.redeemScript = p2wsh_p2sh_addr_payment.redeem.output
        unspentObj.witnessScript = p2wsh_p2sh_addr_payment.redeem.redeem.output

        btcBalanceMap[p2wsh_p2sh_addr].tx.push(unspentObj)
      }

      if (!btcBalanceMap[p2wsh_p2sh_addr].tx.length) { delete btcBalanceMap[p2wsh_p2sh_addr] }

      for (const x of p2wsh_addr_utxo.data.txs) {
        const unspentObj = {}
        unspentObj.hash = x.txid
        unspentObj.index = x.output_no
        unspentObj.value = x.value
        unspentObj.witnessUtxo = {
          script: Buffer.from(x.script_hex, 'hex'),
          value: parseFloat(x.value) * constants.SAT
        }
        unspentObj.witnessScript = p2wsh_addr_payment.redeem.output

        btcBalanceMap[p2wsh_addr].tx.push(unspentObj)
      }
      if (!btcBalanceMap[p2wsh_addr].tx.length) { delete btcBalanceMap[p2wsh_addr] }
    } catch (err) {
      console.log(err)
    }
    n--
  }
  console.log('Evaluating addresses at i=0')
  const p2sh_addr_payment = AddressService.generateDefaultBlockioAddress(btcBip32Priv, btcSecondaryPubKey, network)
  const p2sh_addr = p2sh_addr_payment.address

  btcBalanceMap[p2sh_addr] = {}
  btcBalanceMap[p2sh_addr].address_type = constants.P2SH
  btcBalanceMap[p2sh_addr].i = n
  btcBalanceMap[p2sh_addr].tx = []

  const p2sh_addr_utxo = await AddressService.checkBlockioAddressBalance(p2sh_addr, network)

  for (const x of p2sh_addr_utxo.data.txs) {
    const unspentObj = {}
    unspentObj.hash = x.txid
    unspentObj.index = x.output_no
    unspentObj.value = x.value
    unspentObj.nonWitnessUtxo = Buffer.from(await getSochainTxHex(x.txid, networks.BITCOIN_TEST), 'hex')
    unspentObj.redeemScript = p2sh_addr_payment.redeem.output

    btcBalanceMap[p2sh_addr].tx.push(unspentObj)
  }
  if (!btcBalanceMap[p2sh_addr].tx.length) {
    delete btcBalanceMap[p2sh_addr]
  }

  return btcBalanceMap
}

async function getSochainTxHex (txId, network) {
  try {
    const apiUrl = 'https://sochain.com/api/v2/get_tx/' + network + '/' + txId
    const res = await fetch(apiUrl)
    const json = await res.json()

    return json.data.tx_hex
  } catch (err) {
    return err.response.body
  }
}
