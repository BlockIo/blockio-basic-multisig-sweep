const expect = require('chai').expect
const bitcoin = require('bitcoinjs-lib')
const bip32 = require('bip32')
const ecpair = require('ecpair')
const networks = require('../src/networks')
const constants = require('../src/constants')
const ecc = require('tiny-secp256k1')
const AddressService = require('../src/services/AddressService')

describe('Signatures', () => {
  const network = networks[constants.NETWORKS.DOGETEST]
  const psbt = new bitcoin.Psbt({ network: network })
  const bip32Priv = 'tgpv1aRS3XcGkbKXEipK7MuD3HhwzSt7b4iHoFfNvxRcaxTKYnot9Uts6rAgvAWQctDEUmgibk6wRsdffk9aQnV6UBQ36JDT5xrc9uVA17XEhR4'
  const privKey2 = 'cjzPVYRThMUnU3bDRAfnxZ6g6pCRgAe2wNTpUunwYQasN7whVuDn'

  const derivationPath = 'm/i/0'
  const path = 'm/0/0'
  const payment = AddressService.generateAddresses(constants.P2SH, bip32Priv, ecpair.ECPair.fromWIF(privKey2, network).publicKey, network, 0, derivationPath)[0].payment
  const hdRoot = bip32.default(ecc).fromBase58(bip32Priv, network)
  const masterFingerprint = hdRoot.fingerprint

  const childNode = hdRoot.derivePath(path)
  const pubkey = childNode.publicKey

  function validator(pubkey, msghash, signature) {
    return ecpair.ECPair.fromPublicKey(pubkey).verify(msghash, signature);
  }
  
  const updateData = {
    bip32Derivation: [
      {
        masterFingerprint,
        path: path,
        pubkey
      }
    ]
  }
  const txHex = '0100000001abded0718e937a50164b0d4efb819fb4e3ab761ba60479252a5041551eee89fe01000000d9004730440220657a77b6183fd20da4f46e3e06ff9404cec3cc75e1708bf06f13321cc20566a302206c97972c8ee7a3d8f18024ec6d871d07d65b72879c5eeb16803d0ec3f9bc0c8f0147304402207a1f9286f4c2a3164d5211f5496b5cc849fcb2ecf4c2fb50f0832f493817e6ec02202e00d0d7d694a18c216c378ec83a1e243c2a7cb90185b551e39cf4c51b3539010147522103abf01d993487a683db0a788298e176624b8530c9481b8f3f17eaec015a6e8c882103ec7f0dd153f1fa7f2fd5d6b331796298ebd0a657950c70cbb58eac34c7b475f352aeffffffff0200743ba40b00000017a914d3f8ba1afeb3a9f8f1ab9e0d7c5cc36c4e99c62487014c07b19f54020017a91401d4df05a673fc46698c4d2effdac931d76002528700000000'
  const txId = 'fe4117ddfabe2ee7919903bfe09dac4644ccd69bd9d34f2befd949db372a81c7'
  const redeemScript = payment.redeem.output
  const nonWitnessUtxo = Buffer.from(txHex, 'hex')
  psbt.addInput({ hash: txId, index: 0, nonWitnessUtxo, redeemScript })
  psbt.updateInput(0, updateData)
  psbt.signInputHD(0, hdRoot)
  psbt.signInput(0, ecpair.ECPair.fromWIF(privKey2, network))

  it('Check if generated signatures for a BIP 32 private key and a secondary private key are valid', () => {
    expect(psbt.validateSignaturesOfInput(0, validator, ecpair.ECPair.fromWIF(privKey2, network).publicKey)).to.equal(true)
  })
})
