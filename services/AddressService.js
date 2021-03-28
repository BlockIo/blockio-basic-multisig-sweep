const bitcoin = require('bitcoinjs-lib')
const fetch = require('node-fetch')

const AddressService = function () { }

AddressService.prototype.generateAddress = (addrType, bip32PrivKey, secondaryPubKey, network, i, derivationPath) => {
  // generates P2SH, P2WSH-P2SH, or WITNESS_V0 addresses

  const derivPath = derivationPath.replace('i', i.toString())
  const extKeyStandard = bitcoin.bip32.fromBase58(bip32PrivKey, network)
  // the nonstandard bip32 object
  const extKeyNonstandard = bitcoin.bip32.fromBase58(bip32PrivKey, network)

  const child = extKeyNonstandard.derive(i)
  child.chainCode = Buffer.from(child.chainCode.toString('hex').replace(/^(00)+/, ''), 'hex')

  const leafNonStandard = child.derive(0)
  const leafStandard = extKeyStandard.derivePath(derivPath)

  let PUB1 = leafStandard.publicKey
  let isStandard = true
  if (leafNonStandard.publicKey.toString('hex') !== leafStandard.publicKey.toString('hex')) {
    // will use non standard pubKey
    PUB1 = leafNonStandard.publicKey
    isStandard = false
  }

  const PUB2 = Buffer.from(secondaryPubKey, 'hex')
  const pubkeys = [PUB1, PUB2]

  const p2msOpts = {
    m: 2,
    pubkeys,
    network: network
  }

  let output

  if (addrType === 'P2SH') {
    output = bitcoin.payments.p2sh({ redeem: bitcoin.payments.p2ms(p2msOpts) })
  } else if (addrType === 'P2WSH-P2SH') {
    output = bitcoin.payments.p2sh({ redeem: bitcoin.payments.p2wsh({ redeem: bitcoin.payments.p2ms(p2msOpts) }) })
  } else if (addrType === 'WITNESS_V0') {
    output = bitcoin.payments.p2wsh({ redeem: bitcoin.payments.p2ms(p2msOpts) })
  } else {
    throw new Error('Address type must be P2SH, P2WSH-P2SH, or WITNESS_0')
  }

  return { output, isStandard }
}

AddressService.prototype.checkBlockioAddressBalance = async (apiUrl) => {
  // TODO rewrite
  try {
    const res = await fetch(apiUrl)
    const json = await res.json()

    return json
  } catch (err) {
    throw new Error(err.response.body)
  }
}

module.exports = new AddressService()
