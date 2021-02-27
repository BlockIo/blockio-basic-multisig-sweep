const bitcoin = require('bitcoinjs-lib')
const fetch = require('node-fetch')

const sochainApiUrl = 'https://sochain.com/api/v2/'
const getAddrApi = 'get_address_balance/'

const AddressService = function () {}

// generate a P2SH, pay-to-multisig (2-of-2) address
AddressService.prototype.generateDefaultBlockioAddress = (bip32PrivKey, secondaryPubKey) => {
  const PUB1 = bitcoin.bip32.fromBase58(bip32PrivKey).derivePath('m/0/0').publicKey
  const PUB2 = Buffer.from(secondaryPubKey, 'hex')

  const pubkeys = [PUB1, PUB2]
  const address = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2ms({ m: 2, pubkeys })
  })
  return address.address
}

// generate a P2SH(P2WSH(...)), pay-to-multisig (2-of-2) address
AddressService.prototype.generateSubsequentBlockioAddress = (bip32PrivKey, secondaryPubKey, i) => {
  const PUB1 = bitcoin.bip32.fromBase58(bip32PrivKey).derivePath('m/' + i + '/0').publicKey
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
AddressService.prototype.generateP2wshBlockioAddress = (bip32PrivKey, secondaryPubKey, i) => {
  const PUB1 = bitcoin.bip32.fromBase58(bip32PrivKey).derivePath('m/' + i + '/0').publicKey
  const PUB2 = Buffer.from(secondaryPubKey, 'hex')

  const pubkeys = [PUB1, PUB2]
  const address = bitcoin.payments.p2wsh({
    redeem: bitcoin.payments.p2ms({ m: 2, pubkeys })
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
