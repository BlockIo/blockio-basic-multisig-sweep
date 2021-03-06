const networks = require('../networks')
const AddressService = require('../services/AddressService')
const bitcoin = require('bitcoinjs-lib')
const coininfo = require('coininfo')
const fetch = require('node-fetch')

require('dotenv').config()

const network = networks.BITCOIN_TEST
const btcBip32Priv = process.env.BTC_BIP32_PRIV
const btcSecondaryPubKey = process.env.BTC_SECONDARY_PUB_KEY
const btcSecondaryPrivKey = process.env.BTC_SECONDARY_PRIV_KEY

const psbt = new bitcoin.Psbt({ network: bitcoin.networks.testnet })
const satoshi = 100000000
const BITCOIN_FEE = 10000
const TO_ADDR = 'tb1quffwcm7eh4je4d4af2qztg70vt785tfqk5em2w358fx4kh0u9t7sxtcead'
// const addr = '2NCUkmRWQzy82bwRTyDuWDyQ2zhWUVFBCZM'

createDefaultAddrTx()

async function createDefaultAddrTx () {
  try {
    const payment = AddressService.generateDefaultBlockioAddress(btcBip32Priv, btcSecondaryPubKey, network)
    const addr = payment.address
    const output = payment.redeem.output
    const hdRoot = bitcoin.bip32.fromBase58(btcBip32Priv, generateNetwork('bitcoin', true))
    const masterFingerprint = hdRoot.fingerprint
    const path = 'm/0/0' // default path
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
    let addrUtxos = await AddressService.checkBlockioAddressBalance(addr, network)
    addrUtxos = addrUtxos.data.txs
    let balance = 0
    let inputNum = 0
    let addrUtxo
    for (addrUtxo of addrUtxos) {
      balance += parseFloat(addrUtxo.value)

      const input = {
        hash: addrUtxo.txid,
        index: addrUtxo.output_no,
        nonWitnessUtxo: Buffer.from(await getSochainTxHex(addrUtxo.txid, networks.BITCOIN_TEST), 'hex'),
        redeemScript: output
      }

      psbt.addInput(input)
      psbt.updateInput(inputNum++, updateData)
    }
    psbt.addOutput({
      address: TO_ADDR, // destination address
      value: Math.floor((balance * satoshi) - BITCOIN_FEE)// value in satoshi
    })
    for (let i = 0; i < inputNum; i++) {
      psbt.signInputHD(i, hdRoot)
      psbt.signInput(i, bitcoin.ECPair.fromWIF(btcSecondaryPrivKey, bitcoin.networks.testnet))
    }
    psbt.finalizeAllInputs()

    const tx = psbt.extractTransaction()
    const signedTransaction = tx.toHex()
    const transactionId = tx.getId()
    const res = await fetch('https://sochain.com/api/v2/send_tx/BTCTEST', {
      method: 'POST',
      body: JSON.stringify({ tx_hex: signedTransaction }),
      headers: { 'Content-Type': 'application/json' }
    })
    console.log('signed:', signedTransaction)
    console.log('Tx id:', transactionId)
    console.log('res:', res.json())
  } catch (err) {
    console.log(err)
  }
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
