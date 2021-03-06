const constants = require('./constants')
const networks = require('./networks')
const AddressService = require('./services/AddressService')
const fetch = require('node-fetch')
const bitcoin = require('bitcoinjs-lib')
const coininfo = require('coininfo')

require('dotenv').config()

sweepCoins()

async function sweepCoins () {
  try {
    ///    Initialize vars start

    const n = 1
    const network = networks.BITCOIN_TEST
    const crypto = 'bitcoin'
    const isTestnet = true
    const btcBip32Priv = process.env.BTC_BIP32_PRIV
    const btcSecondaryPubKey = process.env.BTC_SECONDARY_PUB_KEY
    const btcSecondaryPrivKey = process.env.BTC_SECONDARY_PRIV_KEY
    const TO_ADDR = '2ND3paQb1iaZGt8CxbAabS4veRJZL1EG2KX'

    ///    Initialize vars end

    const utxoMap = await createBtcBalanceMap(btcBip32Priv, btcSecondaryPubKey, n, network)

    const psbt = new bitcoin.Psbt({ network: generateNetwork(crypto, isTestnet) })

    const hdRoot = bitcoin.bip32.fromBase58(btcBip32Priv, generateNetwork(crypto, isTestnet))
    const masterFingerprint = hdRoot.fingerprint

    let balToSweep = 0
    let inputNum = 0
    for (const address of Object.keys(utxoMap)) {
      const path = 'm/' + utxoMap[address].i + '/0' // default path
      const childNode = hdRoot.derivePath(path)
      const pubkey = childNode.publicKey

      const updateData = {
        bip32Derivation: [
          {
            masterFingerprint,
            path,
            pubkey
          }
        ]
      }
      for (const utxo of utxoMap[address].tx) {
        balToSweep += parseFloat(utxo.value)
        delete utxo.value
        const input = {
          ...utxo
        }
        psbt.addInput(input)
        psbt.updateInput(inputNum++, updateData)
      }
    }
    psbt.addOutput({
      address: TO_ADDR, // destination address
      value: Math.floor((balToSweep * constants.SAT) - constants.BITCOIN_FEE)// value in satoshi
    })
    for (let i = 0; i < inputNum; i++) {
      psbt.signInputHD(i, hdRoot)
      psbt.signInput(i, bitcoin.ECPair.fromWIF(btcSecondaryPrivKey, generateNetwork(crypto, isTestnet)))
    }
    psbt.finalizeAllInputs()

    const tx = psbt.extractTransaction()
    const signedTransaction = tx.toHex()
    let res = await fetch('https://sochain.com/api/v2/send_tx/BTCTEST', {
      method: 'POST',
      body: JSON.stringify({ tx_hex: signedTransaction }),
      headers: { 'Content-Type': 'application/json' }
    })
    res = await res.json()
    if (res.status === 'success') {
      console.log('Sweep Success!')
      console.log(res.data.txid)
    } else {
      console.log('Sweep Failed:')
      console.log(res)
    }
  } catch (err) {
    console.log(err)
  }
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

function generateNetwork (crypto, isTestnet) {
  const net = isTestnet ? 'test' : 'main'
  const curr = coininfo[crypto][net]
  const frmt = curr.toBitcoinJS()

  const netGain = {
    messagePrefix: '\x19' + frmt.name + ' Signed Message:\n',
    bip32: {
      public: frmt.bip32.public,
      private: frmt.bip32.private
    },
    bech32: frmt.bech32,
    pubKeyHash: frmt.pubKeyHash,
    scriptHash: frmt.scriptHash,
    wif: frmt.wif
  }
  return netGain
}
