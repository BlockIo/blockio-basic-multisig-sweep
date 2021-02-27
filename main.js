const bitcoin = require('bitcoinjs-lib')
const fetch = require('node-fetch')
const networks = require('./networks')

const sochainApiUrl = 'https://sochain.com/api/v2/'
const getAddrApi = 'get_address_balance/'

require('dotenv').config()

const bip32Priv = process.env.BIP32_PRIV
const node = bitcoin.bip32.fromBase58(bip32Priv)

console.log(defaultBtcAddr())
console.log(subsequentBtcAddrs(4))
console.log(btcWitnessV0Addr(5))

checkBalance(defaultBtcAddr(), networks.BITCOIN)

// generate a P2SH, pay-to-multisig (2-of-3) address
function defaultBtcAddr () {
  const PUB1 = node.derivePath('m/0/0').publicKey
  const PUB2 = Buffer.from(process.env.SECONDARY_PUB_KEY, 'hex')

  const pubkeys = [PUB1, PUB2]
  const address = bitcoin.payments.p2sh({
    redeem: bitcoin.payments.p2ms({ m: 2, pubkeys })
  })
  return address.address
}

// generate a P2SH(P2WSH(...)), pay-to-multisig (2-of-2) address
function subsequentBtcAddrs (i) {
  const PUB1 = node.derivePath('m/' + i + '/0').publicKey
  const PUB2 = Buffer.from(process.env.SECONDARY_PUB_KEY, 'hex')

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
  const PUB2 = Buffer.from(process.env.SECONDARY_PUB_KEY, 'hex')

  const pubkeys = [PUB1, PUB2]
  const address = bitcoin.payments.p2wsh({
    redeem: bitcoin.payments.p2ms({ m: 2, pubkeys })
  })
  return address.address
}

async function checkBalance (addr, network) {
  try {
    const apiUrl = sochainApiUrl + getAddrApi + network + '/' + addr
    const res = await fetch(apiUrl)
    const json = await res.json()
    console.log(json)
  } catch (err) {
    console.log(err.response.body)
  }
}
