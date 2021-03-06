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
const TO_ADDR = '2NCUkmRWQzy82bwRTyDuWDyQ2zhWUVFBCZM'

createp2wshTx(13)

async function createp2wshTx (addrDerivePath) {
  try {
    const payment = AddressService.generateP2wshBlockioAddress(btcBip32Priv, btcSecondaryPubKey, 13, network)
    const addr = payment.address
    const hdRoot = bitcoin.bip32.fromBase58(btcBip32Priv, generateNetwork('bitcoin', true))
    const masterFingerprint = hdRoot.fingerprint
    const path = 'm/' + addrDerivePath + '/0' // default path
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
        witnessUtxo: {
          script: Buffer.from(addrUtxo.script_hex, 'hex'),
          value: parseFloat(addrUtxo.value) * satoshi
        },
        witnessScript: payment.redeem.output
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
