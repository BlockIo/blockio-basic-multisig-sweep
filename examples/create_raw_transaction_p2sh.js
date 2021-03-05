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

// use api = https://sochain.com/api/v2/get_tx/NETWORK/TX_ID
const soChainTxHex = '010000000154c8efec63c7f9cb0e12fb23339b6b6bb57bc27c4c3be394fb9e7770ec2b124101000000d900473044022068cfce3aa37c860d3d8b33dd08fad66a5ff7c068e2e01f51df3f2dffe495459a02205d296ff29fb240cea18e730b344615b0318fbdbddffa31d3caffe3e9200fdcf501473044022030e9a4a6c3e4722c16e3a9526c3e7d348a5b61a66912791b6c280f7a4c4fd7d802203d92cc4235a11f80a2bacb45aedf5b74581292357d6bc32859bd9a0c8df734f8014752210352311ebb1433900cee24a5fce0ed29a097d3692d1fb46acd49eaf77d5e31758921033d65a451eede59d294091a4da6485938965c081ced5c8b65ddc4dd44c6fb304e52aeffffffff02e09304000000000017a91408d5649f2868d9954626bfe8e04894f48a93e7e5872ae900000000000017a914d2f97d635a2e8d3283d648f2653d10b172c69e158700000000'

const psbt = new bitcoin.Psbt({ network: bitcoin.networks.testnet })
const satoshi = 100000000
const BITCOIN_FEE = 10000
// const addr = '2NCUkmRWQzy82bwRTyDuWDyQ2zhWUVFBCZM'

createTx()

async function createTx () {
  try {
    const payment = AddressService.generateDefaultBlockioAddress(btcBip32Priv, btcSecondaryPubKey, network)
    const addr = payment.address
    const output = payment.redeem.output
    let addrUtxo = await AddressService.checkBlockioAddressBalance(addr, network)
    addrUtxo = addrUtxo.data.txs[0]

    const input = {
      hash: addrUtxo.txid,
      index: addrUtxo.output_no,
      nonWitnessUtxo: Buffer.from(soChainTxHex, 'hex'),
      redeemScript: output
    }

    psbt.addInput(input)
    const hdRoot = bitcoin.bip32.fromBase58(btcBip32Priv, generateNetwork('bitcoin', true))
    const masterFingerprint = hdRoot.fingerprint
    const path = 'm/0/0' // default path
    const childNode = hdRoot.derivePath(path)
    const pubkey = childNode.publicKey
    const privkey = childNode.privateKey
    const privkey2 = Buffer.from(btcSecondaryPrivKey)

    // console.log(privkey.toString('hex'), privkey2.toString())

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
      address: '2ND3paQb1iaZGt8CxbAabS4veRJZL1EG2KX', // destination address
      value: (0.00059690 * satoshi) // value in satoshi
    })

    psbt.signInputHD(0, hdRoot)
    psbt.signInput(0, bitcoin.ECPair.fromWIF(btcSecondaryPrivKey, bitcoin.networks.testnet))
    psbt.finalizeAllInputs()

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
