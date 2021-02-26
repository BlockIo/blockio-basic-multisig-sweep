const bitcoin = require('bitcoinjs-lib')
require('dotenv').config()

console.log(defaultBtcAddr())
console.log(subsequentBtcAddrs(4))

// generate a P2SH, pay-to-multisig (2-of-3) address
function defaultBtcAddr () {
  const bip32Priv = process.env.BTC_BIP32_PRIV
  const PUB1 = bitcoin.bip32.fromBase58(bip32Priv).derivePath('m/0/0').publicKey
  const PUB2 = Buffer.from(process.env.BTC_SECONDARY_PUB_KEY, 'hex')

  const pubkeys = [PUB1, PUB2]
  const address = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2ms({ m: 2, pubkeys })
  })
  return address.address
}

// generate a P2SH(P2WSH(...)), pay-to-multisig (2-of-2) address
function subsequentBtcAddrs (i) {
  const bip32Priv = process.env.BTC_BIP32_PRIV
  const PUB1 = bitcoin.bip32.fromBase58(bip32Priv).derivePath('m/' + i + '/0').publicKey
  const PUB2 = Buffer.from(process.env.BTC_SECONDARY_PUB_KEY, 'hex')

  const pubkeys = [PUB1, PUB2]
  const address = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2wsh({
      redeem: bitcoin.payments.p2ms({ m: 2, pubkeys })
    })
  })
  return address.address
}
