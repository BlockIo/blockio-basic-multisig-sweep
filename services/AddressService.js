const bitcoin = require('bitcoinjs-lib')
const fetch = require('node-fetch')

const AddressService = function () {}

AddressService.prototype.generateAddress = (addrType, bip32PrivKey, secondaryPubKey, network, derivationPath) => {
    // generates P2SH, P2WSH-P2SH, or WITNESS_V0 addresses

    const PUB1 = bitcoin.bip32.fromBase58(bip32PrivKey, network).derivePath(derivationPath).publicKey
    const PUB2 = Buffer.from(secondaryPubKey, 'hex')
    const pubkeys = [PUB1, PUB2]
    
    const p2msOpts = {
	m: 2,
	pubkeys,
	network: network
    }
    
    // for LTC, get incorrect address if network is provided in p2msOpts
    if (network.bech32 && network.bech32 === 'ltc') {
	delete p2msOpts.network // ?????
    }

    let output;

    if (addrType === "P2SH") {
	output = bitcoin.payments.p2sh({ redeem: bitcoin.payments.p2ms(p2msOpts) })
    } else if (addrType === "P2WSH-P2SH") {
	output = bitcoin.payments.p2sh({ redeem: bitcoin.payments.p2wsh({ redeem: bitcoin.payments.p2ms(p2msOpts) }) })
    } else if (addrType === "WITNESS_V0") {
	output = bitcoin.payments.p2wsh({ redeem: bitcoin.payments.p2ms(p2msOpts) })
    } else {
	throw "Address type must be P2SH, P2WSH-P2SH, or WITNESS_0"
    }

    return output
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
