const bitcoin = require('bitcoinjs-lib')
const fetch = require('node-fetch')
const coininfo = require('coininfo')
const networks = require('../networks')

const sochainApiUrl = 'https://sochain.com/api/v2/'
const getAddrApi = 'get_address_balance/'

function generateNetwork (crypto) {
  const curr = coininfo[crypto].main
  const frmt = curr.toBitcoinJS()
  let bechVal

  switch (crypto) {
    case 'dogecoin':
      bechVal = 'dc'
      break
    case 'litecoin':
      bechVal = 'ltc'
      break
    default:
      bechVal = 'bc'
      break
  }

  const netGain = {
    messagePrefix: '\x19' + frmt.name + ' Signed Message:\n',
    bip32: {
      public: frmt.bip32.public,
      private: frmt.bip32.private
    },
    bech32: bechVal,
    pubKeyHash: frmt.pubKeyHash,
    scriptHash: frmt.scriptHash,
    wif: frmt.wif
  }
  return netGain
}

const AddressService = function () {}

// generate a P2SH, pay-to-multisig (2-of-2) address
AddressService.prototype.generateDefaultBlockioAddress = (bip32PrivKey, secondaryPubKey, crypto, i) => {
  let network = {}

  switch (crypto) {
    case networks.DOGECOIN:
      network = generateNetwork('dogecoin')
      break
    case networks.LITECOIN:
      i = 0
      network = generateNetwork('litecoin')
      break
    default:
      i = 0
      network = generateNetwork('bitcoin')
      break
  }

  const PUB1 = bitcoin.bip32.fromBase58(bip32PrivKey, network).derivePath('m/' + i + '/0').publicKey
  const PUB2 = Buffer.from(secondaryPubKey, 'hex')
  const pubkeys = [PUB1, PUB2]

  // only for dogecoin, network needs to be provided in p2ms options
  const p2msOpts = {
    m: 2,
    pubkeys,
    network: network
  }
  if (crypto !== networks.DOGECOIN) {
    delete p2msOpts.network
  }

  const address = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2ms(p2msOpts)
  })
  return address.address
}

// generate a P2SH(P2WSH(...)), pay-to-multisig (2-of-2) address
AddressService.prototype.generateSubsequentBlockioAddress = (bip32PrivKey, secondaryPubKey, i, crypto) => {
  let network

  switch (crypto) {
    case networks.DOGECOIN:
      return 'Dogecoin only supports P2SH'
    case networks.LITECOIN:
      network = generateNetwork('litecoin')
      break
    default:
      network = generateNetwork('bitcoin')
      break
  }

  const PUB1 = bitcoin.bip32.fromBase58(bip32PrivKey, network).derivePath('m/' + i + '/0').publicKey
  const PUB2 = Buffer.from(secondaryPubKey, 'hex')

  const pubkeys = [PUB1, PUB2]
  const address = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2wsh({
      redeem: bitcoin.payments.p2ms({ m: 2, pubkeys })
    })
  })
  return address.address
}

// generate a P2WSH (SegWit), pay-to-multisig (2-of-2) address
AddressService.prototype.generateP2wshBlockioAddress = (bip32PrivKey, secondaryPubKey, i, crypto) => {
  let network

  switch (crypto) {
    case networks.DOGECOIN:
      return 'Dogecoin only supports P2SH'
    case networks.LITECOIN:
      network = generateNetwork('litecoin')
      break
    default:
      network = generateNetwork('bitcoin')
      break
  }
  const PUB1 = bitcoin.bip32.fromBase58(bip32PrivKey, network).derivePath('m/' + i + '/0').publicKey
  const PUB2 = Buffer.from(secondaryPubKey, 'hex')

  const pubkeys = [PUB1, PUB2]
  const address = bitcoin.payments.p2wsh({
    redeem: bitcoin.payments.p2ms({ m: 2, pubkeys, network: network })
  })
  return address.address
}

AddressService.prototype.checkBlockioAddressBalance = async (addr, network) => {
  try {
    const apiUrl = sochainApiUrl + getAddrApi + network + '/' + addr
    const res = await fetch(apiUrl)
    const json = await res.json()
    console.log(json)
  } catch (err) {
    console.log(err.response.body)
  }
}

module.exports = new AddressService()
