const bitcoin = require('bitcoinjs-lib')
const ExtendedKeyService = require('./ExtendedKeyService')

const AddressService = function () { }

AddressService.prototype.generateAddresses = (addrType, bip32PrivKey, secondaryPubKey, network, i, derivationPath) => {
  // generates P2SH, P2WSH-P2SH, or WITNESS_V0 addresses

    let outputs = []

    for (let chainCodeType of ["standard", "nonstandard"]) {
	// get addresses with both standard and non-standard chain codes
	
	let output
	let primaryKey = ExtendedKeyService.getKeyAtPath(bip32PrivKey, network, i, derivationPath, chainCodeType)

	let publicKeys = [primaryKey.publicKey, Buffer.from(secondaryPubKey, 'hex')]
	
	let p2msOpts = {
	    m: 2,
	    pubkeys: publicKeys,
	    network: network
	}
    
	if (addrType === 'P2SH') {
	    output = bitcoin.payments.p2sh({ redeem: bitcoin.payments.p2ms(p2msOpts) })
	} else if (addrType === 'P2WSH-P2SH') {
	    output = bitcoin.payments.p2sh({ redeem: bitcoin.payments.p2wsh({ redeem: bitcoin.payments.p2ms(p2msOpts) }) })
	} else if (addrType === 'WITNESS_V0') {
	    output = bitcoin.payments.p2wsh({ redeem: bitcoin.payments.p2ms(p2msOpts) })
	} else {
	    throw new Error('Address type must be P2SH, P2WSH-P2SH, or WITNESS_0')
	}

	outputs.push({payment: output, addrType: addrType, primaryKey: primaryKey})
	
    }

    if (outputs[0].primaryKey.publicKey.toString('hex') === outputs[1].primaryKey.publicKey.toString('hex')) {
	// remove duplicate if standard and non-standard derivations match
	outputs.shift()
    }

    return outputs
}

module.exports = new AddressService()
