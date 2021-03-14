const constants = require('./constants')
const networks = require('./networks')
const AddressService = require('./services/AddressService')
const fetch = require('node-fetch')
const bitcoin = require('bitcoinjs-lib')

let MAX_TX_LENGTH
let n
let networkObj
let network
let bip32Priv
let pubKey
let privKey
let TO_ADDR
let TX_API_URL
let BLOCK_CHAIN_API_URL
let getUtxoApi
let sendTxApi
let getTxApi

require('dotenv').config()

sweepCoins()

function initVars () {
  MAX_TX_LENGTH = 500
  BLOCK_CHAIN_API_URL = 'https://sochain.com/api/v2/'
  getUtxoApi = 'get_tx_unspent/'
  sendTxApi = 'send_tx/'
  getTxApi = 'get_tx/'

  // User input Vars
  n = process.env.N
  network = process.env.NETWORK
  networkObj = networks[network]
  bip32Priv = process.env.PRIVATE_KEY1_BIP32
  privKey = process.env.PRIVATE_KEY2
  TO_ADDR = process.env.DESTINATION_ADDR
  /// ////////////////

  pubKey = bitcoin.ECPair.fromWIF(privKey, networkObj).publicKey.toString('hex')
  TX_API_URL = BLOCK_CHAIN_API_URL + sendTxApi + network
}

async function sweepCoins () {
  try {
    initVars()
    const utxoMap = await createBalanceMap(bip32Priv, pubKey, n, networkObj, network)

    const txs = []
    const networkFees = []
    let psbt = new bitcoin.Psbt({ network: networkObj })

    const hdRoot = bitcoin.bip32.fromBase58(bip32Priv, networkObj)
    const masterFingerprint = hdRoot.fingerprint

    let balToSweep = 0
    let inputNum = 0
    const addressCount = Object.keys(utxoMap).length - 1
    let addrIte = 0

    for (const address of Object.keys(utxoMap)) {
      const path = 'm/' + utxoMap[address].i + '/0' // default path
      const childNode = hdRoot.derivePath(path)
      const pubkey = childNode.publicKey

      const updateData = {
        bip32Derivation: [
          {
            masterFingerprint,
            path,
            pubkey
          }
        ]
      }
      const addrTxCount = utxoMap[address].tx.length - 1
      for (let i = 0; i < utxoMap[address].tx.length; i++) {
        const utxo = utxoMap[address].tx[i]
        balToSweep += parseFloat(utxo.value)
        delete utxo.value
        const input = {
          ...utxo
        }
        psbt.addInput(input)
        psbt.updateInput(inputNum++, updateData)
        if (psbt.txInputs.length === MAX_TX_LENGTH || (addrIte === addressCount && i === addrTxCount)) {
          const tempPsbt = psbt.clone()
          createAndFinalizeTx(tempPsbt, TO_ADDR, balToSweep, 0, hdRoot, privKey, networkObj)
          const networkFee = getNetworkFee(tempPsbt, networkObj.bech32)
          createAndFinalizeTx(psbt, TO_ADDR, balToSweep, networkFee, hdRoot, privKey, networkObj)
          const tx = psbt.extractTransaction()
          const signedTransaction = tx.toHex()
          txs.push(signedTransaction)
          networkFees.push(networkFee)

          psbt = new bitcoin.Psbt({ network: networkObj })
          inputNum = 0
          balToSweep = 0
        }
      }
      addrIte++
    }
    for (const tx in txs) {
      await sendTx(TX_API_URL, txs[tx])
      console.log('Network fee:', networkFees[tx])
    }
  } catch (err) {
    console.log(err)
  }
}

function createAndFinalizeTx (psbt, toAddr, balance, networkFee, root, privKey, network) {
  psbt.addOutput({
    address: toAddr, // destination address
    value: Math.floor((balance * constants.SAT) - networkFee)// value in satoshi
  })
  for (let i = 0; i < psbt.txInputs.length; i++) {
    psbt.signInputHD(i, root)
    psbt.signInput(i, bitcoin.ECPair.fromWIF(privKey, network))
  }
  psbt.finalizeAllInputs()
}

async function sendTx (apiUrl, txHex) {
  let res = await fetch(apiUrl, {
    method: 'POST',
    body: JSON.stringify({ tx_hex: txHex }),
    headers: { 'Content-Type': 'application/json' }
  })
  res = await res.json()
  if (res.status === 'success') {
    console.log('Sweep Success!')
    console.log(res.data.txid)
  } else {
    console.log('Sweep Failed:')
    console.log(res)
  }
}

function getNetworkFee (psbt, bech32) {
  const tx = psbt.extractTransaction()
  const vSize = tx.virtualSize()

  if (bech32) {
    return constants.FEE_RATE * vSize
  } else {
    return Math.ceil(vSize / 1000)
  }
}

async function createBalanceMap () {
  const balanceMap = {}
  while (n) {
    console.log('Evaluating addresses at i=' + n)
    const p2wsh_p2sh_addr_payment = AddressService.generateSubsequentBlockioAddress(bip32Priv, pubKey, networkObj, n)
    const p2wsh_addr_payment = AddressService.generateP2wshBlockioAddress(bip32Priv, pubKey, networkObj, n)
    const p2wsh_p2sh_addr = p2wsh_p2sh_addr_payment.address
    const p2wsh_addr = p2wsh_addr_payment.address

    try {
      const p2wsh_p2sh_addr_utxo = await AddressService.checkBlockioAddressBalance(p2wsh_p2sh_addr, network, BLOCK_CHAIN_API_URL, getUtxoApi)
      const p2wsh_addr_utxo = await AddressService.checkBlockioAddressBalance(p2wsh_addr, network, BLOCK_CHAIN_API_URL, getUtxoApi)

      balanceMap[p2wsh_p2sh_addr] = {}
      balanceMap[p2wsh_p2sh_addr].address_type = constants.P2WSH_P2SH
      balanceMap[p2wsh_p2sh_addr].i = n
      balanceMap[p2wsh_p2sh_addr].tx = []

      balanceMap[p2wsh_addr] = {}
      balanceMap[p2wsh_addr].address_type = constants.P2WSH
      balanceMap[p2wsh_addr].i = n
      balanceMap[p2wsh_addr].tx = []

      for (const x of p2wsh_p2sh_addr_utxo.data.txs) {
        const unspentObj = {}
        unspentObj.hash = x.txid
        unspentObj.index = x.output_no
        unspentObj.value = x.value
        unspentObj.witnessUtxo = {
          script: Buffer.from(x.script_hex, 'hex'),
          value: parseFloat(x.value) * constants.SAT
        }
        unspentObj.redeemScript = p2wsh_p2sh_addr_payment.redeem.output
        unspentObj.witnessScript = p2wsh_p2sh_addr_payment.redeem.redeem.output

        balanceMap[p2wsh_p2sh_addr].tx.push(unspentObj)
      }

      if (!balanceMap[p2wsh_p2sh_addr].tx.length) { delete balanceMap[p2wsh_p2sh_addr] }

      for (const x of p2wsh_addr_utxo.data.txs) {
        const unspentObj = {}
        unspentObj.hash = x.txid
        unspentObj.index = x.output_no
        unspentObj.value = x.value
        unspentObj.witnessUtxo = {
          script: Buffer.from(x.script_hex, 'hex'),
          value: parseFloat(x.value) * constants.SAT
        }
        unspentObj.witnessScript = p2wsh_addr_payment.redeem.output

        balanceMap[p2wsh_addr].tx.push(unspentObj)
      }
      if (!balanceMap[p2wsh_addr].tx.length) { delete balanceMap[p2wsh_addr] }
    } catch (err) {
      console.log(err)
    }
    n--
  }
  console.log('Evaluating addresses at i=0')
  const p2sh_addr_payment = AddressService.generateDefaultBlockioAddress(bip32Priv, pubKey, networkObj)
  const p2sh_addr = p2sh_addr_payment.address

  balanceMap[p2sh_addr] = {}
  balanceMap[p2sh_addr].address_type = constants.P2SH
  balanceMap[p2sh_addr].i = n
  balanceMap[p2sh_addr].tx = []

  const p2sh_addr_utxo = await AddressService.checkBlockioAddressBalance(p2sh_addr, network, BLOCK_CHAIN_API_URL, getUtxoApi)

  for (const x of p2sh_addr_utxo.data.txs) {
    const unspentObj = {}
    unspentObj.hash = x.txid
    unspentObj.index = x.output_no
    unspentObj.value = x.value
    unspentObj.nonWitnessUtxo = Buffer.from(await getTxHex(x.txid, network), 'hex')
    unspentObj.redeemScript = p2sh_addr_payment.redeem.output

    balanceMap[p2sh_addr].tx.push(unspentObj)
  }
  if (!balanceMap[p2sh_addr].tx.length) {
    delete balanceMap[p2sh_addr]
  }

  return balanceMap
}

async function getTxHex (txId, network) {
  try {
    const apiUrl = BLOCK_CHAIN_API_URL + getTxApi + network + '/' + txId
    const res = await fetch(apiUrl)
    const json = await res.json()

    return json.data.tx_hex
  } catch (err) {
    return err.response.body
  }
}
