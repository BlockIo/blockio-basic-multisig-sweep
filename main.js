const bitcoin = require('bitcoinjs-lib')
require('dotenv').config()

const bip32Priv = process.env.BTC_BIP32_PRIV
const node = bitcoin.bip32.fromBase58(bip32Priv)

console.log(defaultBtcAddr())
console.log(subsequentBtcAddrs(4))
console.log(btcWitnessV0Addr(5))

// generate a P2SH, pay-to-multisig (2-of-3) address
function defaultBtcAddr () {
  const PUB1 = node.derivePath('m/0/0').publicKey
  const PUB2 = Buffer.from(process.env.BTC_SECONDARY_PUB_KEY, 'hex')

  const pubkeys = [PUB1, PUB2]
  const address = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2ms({ m: 2, pubkeys })
  })
  return address.address
}

// generate a P2SH(P2WSH(...)), pay-to-multisig (2-of-2) address
function subsequentBtcAddrs (i) {
  const PUB1 = node.derivePath('m/' + i + '/0').publicKey
  const PUB2 = Buffer.from(process.env.BTC_SECONDARY_PUB_KEY, 'hex')

  const pubkeys = [PUB1, PUB2]
  const address = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2wsh({
      redeem: bitcoin.payments.p2ms({ m: 2, pubkeys })
    })
  })
  return address.address
}

// generate a P2WSH (SegWit), pay-to-multisig (2-of-2) address
function btcWitnessV0Addr (i) {
  const PUB1 = node.derivePath('m/' + i + '/0').publicKey
  const PUB2 = Buffer.from(process.env.BTC_SECONDARY_PUB_KEY, 'hex')

  const pubkeys = [PUB1, PUB2]
  const address = bitcoin.payments.p2wsh({
    redeem: bitcoin.payments.p2ms({ m: 2, pubkeys })
  })
  return address.address
}
