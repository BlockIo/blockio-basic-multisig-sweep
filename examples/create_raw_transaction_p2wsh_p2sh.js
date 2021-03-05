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
// const addr = '2NCUkmRWQzy82bwRTyDuWDyQ2zhWUVFBCZM'

createp2wshTx()

async function createp2wshTx () {
  try {
    const payment = AddressService.generateSubsequentBlockioAddress(btcBip32Priv, btcSecondaryPubKey, 1, network)
    const addr = payment.address
    const output = payment.redeem.output
    let addrUtxo = await AddressService.checkBlockioAddressBalance(addr, network)
    addrUtxo = addrUtxo.data.txs[0]
    const input = {
      hash: addrUtxo.txid,
      index: addrUtxo.output_no,
      witnessUtxo: {
        script: Buffer.from(addrUtxo.script_hex, 'hex'),
        value: parseFloat(addrUtxo.value) * satoshi
      },
      witnessScript: payment.redeem.redeem.output,
      redeemScript: output
    }

    psbt.addInput(input)
    const hdRoot = bitcoin.bip32.fromBase58(btcBip32Priv, generateNetwork('bitcoin', true))
    const masterFingerprint = hdRoot.fingerprint
    const path = 'm/1/0' // default path
    const childNode = hdRoot.derivePath(path)
    const pubkey = childNode.publicKey

    // // console.log(privkey.toString('hex'), privkey2.toString())

    const updateData = {
      bip32Derivation: [
        {
          masterFingerprint,
          path,
          pubkey
        }
      ]
    }
    psbt.updateInput(0, updateData)
    psbt.addOutput({
      address: TO_ADDR, // destination address
      value: (0.00049690 * satoshi) - BITCOIN_FEE // value in satoshi
    })

    psbt.signInputHD(0, hdRoot)
    psbt.signInput(0, bitcoin.ECPair.fromWIF(btcSecondaryPrivKey, bitcoin.networks.testnet))
    psbt.finalizeAllInputs()
    // console.log(psbt.validateSignaturesOfInput(0))

    const tx = psbt.extractTransaction()
    const signedTransaction = tx.toHex()
    const transactionId = tx.getId()
    const res = await fetch('https://sochain.com/api/v2/send_tx/BTCTEST', {
      method: 'POST',
      body: { tx_hex: signedTransaction }
    })
    console.log('signed:', signedTransaction)
    console.log('Tx id:', transactionId)
    console.log('res:', res)
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
