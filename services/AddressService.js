const bitcoin = require('bitcoinjs-lib')
const fetch = require('node-fetch')

const AddressService = function () {}

// generate a P2SH, pay-to-multisig (2-of-2) address
AddressService.prototype.generateP2shBlockioAddr = (bip32PrivKey, secondaryPubKey, network, i) => {
  // DOGE addresses are generated only using this function
  const PUB1 = bitcoin.bip32.fromBase58(bip32PrivKey, network).derivePath('m/' + i + '/0').publicKey
  const PUB2 = Buffer.from(secondaryPubKey, 'hex')
  const pubkeys = [PUB1, PUB2]

  const p2msOpts = {
    m: 2,
    pubkeys,
    network: network
  }

  // for LTC (old accounts), get incorrect address if network is provided in p2msOpts
  // if (network.bech32 && network.bech32 === 'ltc') {
  //   delete p2msOpts.network
  // }

  const output = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2ms(p2msOpts)
  })
  return output
}

// generate a P2SH(P2WSH(...)), pay-to-multisig (2-of-2) address
AddressService.prototype.generateP2wshP2shBlockioAddr = (bip32PrivKey, secondaryPubKey, network, i) => {
  const PUB1 = bitcoin.bip32.fromBase58(bip32PrivKey, network).derivePath('m/' + i + '/0').publicKey
  const PUB2 = Buffer.from(secondaryPubKey, 'hex')
  const pubkeys = [PUB1, PUB2]

  const p2msOpts = {
    m: 2,
    pubkeys,
    network: network
  }
  // for LTC (old accounts), get incorrect address if network is provided in p2msOpts
  // if (network.bech32 && network.bech32 === 'ltc') {
  //   delete p2msOpts.network
  // }

  const output = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2wsh({
      redeem: bitcoin.payments.p2ms(p2msOpts)
    })
  })
  return output
}

// generate a P2WSH (SegWit), pay-to-multisig (2-of-2) address
AddressService.prototype.generateP2wshBlockioAddress = (bip32PrivKey, secondaryPubKey, network, i) => {
  const PUB1 = bitcoin.bip32.fromBase58(bip32PrivKey, network).derivePath('m/' + i + '/0').publicKey
  const PUB2 = Buffer.from(secondaryPubKey, 'hex')

  const pubkeys = [PUB1, PUB2]
  const output = bitcoin.payments.p2wsh({
    redeem: bitcoin.payments.p2ms({ m: 2, pubkeys, network: network })
  })
  return output
}

AddressService.prototype.checkBlockioAddressBalance = async (apiUrl) => {
  try {
    const res = await fetch(apiUrl)
    const json = await res.json()

    return json
  } catch (err) {
    throw new Error(err.response.body)
  }
}

module.exports = new AddressService()
