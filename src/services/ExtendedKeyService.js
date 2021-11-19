// service for key derivation from BIP32 paths

const bitcoin = require('bitcoinjs-lib')
const bip32 = require('bip32');
const ecpair = require('ecpair');
const ecc = require('tiny-secp256k1');
const ExtendedKeyService = function () { }

ExtendedKeyService.prototype.getKeyAtPath = (bip32PrivKey, network, i, derivationPath, chainCodeType) => {
    // returns the key object at a given path

    let pathParts = derivationPath.split('/')

    // m
    const extendedKey = bip32.default(ecc).fromBase58(bip32PrivKey, network)
    
    if (chainCodeType === "nonstandard") { extendedKey.chainCode = Buffer.from(extendedKey.chainCode.toString('hex').replace(/^(00)+/,''), 'hex') }
    
    // m/i
    let child = extendedKey.derive(pathParts[1] === 'i' ? i : parseInt(pathParts[1]))
    
    if (chainCodeType === "nonstandard") { child.chainCode = Buffer.from(child.chainCode.toString('hex').replace(/^(00)+/,''), 'hex') }
    
    // m/i/j
    let leaf = child.derive(pathParts[2] === 'i' ? i : parseInt(pathParts[2]))
    
    return ecpair.ECPair.fromPrivateKey(leaf.privateKey, { network: network })

}

module.exports = new ExtendedKeyService()
