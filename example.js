const Sweeper = require('./sweeper')
require('dotenv').config()

const n = process.env.N
const bip32 = process.env.PRIVATE_KEY1_BIP32
const privkey2 = process.env.PRIVATE_KEY2
const toAddr = process.env.DESTINATION_ADDR
const network = process.env.NETWORK
const derivationPath = process.env.DERIVATION_PATH

const sweep = new Sweeper(network, bip32, privkey2, toAddr, n, derivationPath)

Sweep()

async function Sweep () {
  try {
    await sweep.begin()
  } catch (err) {
    console.log(err)
  }
}
