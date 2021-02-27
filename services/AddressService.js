const bitcoin = require('bitcoinjs-lib')
const fetch = require('node-fetch')
const networks = require('../networks')

const sochainApiUrl = 'https://sochain.com/api/v2/'
const getAddrApi = 'get_address_balance/'

const LITECOIN = {
  messagePrefix: '\x19Litecoin Signed Message:\n',
  bech32: 'ltc',
  bip32: {
    public: 0x019da462,
    private: 0x019d9cfe
  },
  pubKeyHash: 0x30,
  scriptHash: 0x32,
  wif: 0xb0
}

const BITCOIN = {
  messagePrefix: '\x18Bitcoin Signed Message:\n',
  bech32: 'bc',
  bip32: {
    public: 0x0488b21e,
    private: 0x0488ade4
  },
  pubKeyHash: 0x00,
  scriptHash: 0x05,
  wif: 0x80
}

const AddressService = function () {}

// generate a P2SH, pay-to-multisig (2-of-2) address
AddressService.prototype.generateDefaultBlockioAddress = (bip32PrivKey, secondaryPubKey, crypto) => {
  let network

  switch (crypto) {
    case networks.BITCOIN:
      network = BITCOIN
      break
    case networks.LITECOIN:
      network = LITECOIN
      break
  }

  const PUB1 = bitcoin.bip32.fromBase58(bip32PrivKey, network).derivePath('m/0/0').publicKey
  const PUB2 = Buffer.from(secondaryPubKey, 'hex')

  const pubkeys = [PUB1, PUB2]
  const address = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2ms({ m: 2, pubkeys })
  })
  return address.address
}

// generate a P2SH(P2WSH(...)), pay-to-multisig (2-of-2) address
AddressService.prototype.generateSubsequentBlockioAddress = (bip32PrivKey, secondaryPubKey, i, crypto) => {
  let network

  switch (crypto) {
    case networks.BITCOIN:
      network = BITCOIN
      break
    case networks.LITECOIN:
      network = LITECOIN
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
    case networks.BITCOIN:
      network = BITCOIN
      break
    case networks.LITECOIN:
      network = LITECOIN
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
