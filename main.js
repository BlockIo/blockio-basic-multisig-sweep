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
          // disable fee check for doge
          const tx = networkObj.bech32 ? psbt.extractTransaction() : psbt.extractTransaction(true)
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
  // for DOGE, network fee is in DOGE
  const val = network.bech32 ? Math.floor((balance * constants.SAT) - networkFee) : Math.floor((balance - networkFee) * constants.SAT)
  psbt.addOutput({
    address: toAddr, // destination address
    value: val// value in satoshi
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
  if (network !== 'DOGE' && network !== 'DOGETEST') {
    while (n) {
      console.log('Evaluating addresses at i=' + n)
      await addAddrToMap(balanceMap, constants.P2WSH_P2SH, parseInt(n))
      await addAddrToMap(balanceMap, constants.P2WSH, parseInt(n))
      n--
    }
    console.log('Evaluating addresses at i=' + n)
    await addAddrToMap(balanceMap, constants.P2SH, parseInt(n))
  } else {
    while (n >= 0) {
      console.log('Evaluating addresses at i=' + n)
      await addAddrToMap(balanceMap, constants.P2SH, parseInt(n))
      n--
    }
  }

  return balanceMap
}

async function addAddrToMap (balanceMap, addrType, n) {
  let payment

  switch (addrType) {
    case constants.P2WSH_P2SH:
      payment = AddressService.generateSubsequentBlockioAddress(bip32Priv, pubKey, networkObj, n)
      balanceMap[payment.address] = {}
      balanceMap[payment.address].address_type = constants.P2WSH_P2SH
      break
    case constants.P2WSH:
      payment = AddressService.generateP2wshBlockioAddress(bip32Priv, pubKey, networkObj, n)
      balanceMap[payment.address] = {}
      balanceMap[payment.address].address_type = constants.P2WSH
      break
    case constants.P2SH:
      payment = AddressService.generateDefaultBlockioAddress(bip32Priv, pubKey, networkObj, n)
      balanceMap[payment.address] = {}
      balanceMap[payment.address].address_type = constants.P2SH
      break
  }

  try {
    const addrUtxo = await AddressService.checkBlockioAddressBalance(payment.address, network, BLOCK_CHAIN_API_URL, getUtxoApi)

    balanceMap[payment.address].i = n
    balanceMap[payment.address].tx = []

    let x
    for (x of addrUtxo.data.txs) {
      const unspentObj = {}
      unspentObj.hash = x.txid
      unspentObj.index = x.output_no
      unspentObj.value = x.value
      switch (addrType) {
        case constants.P2WSH_P2SH:
          unspentObj.witnessUtxo = {
            script: Buffer.from(x.script_hex, 'hex'),
            value: parseFloat(x.value) * constants.SAT
          }
          unspentObj.redeemScript = payment.redeem.output
          unspentObj.witnessScript = payment.redeem.redeem.output
          break
        case constants.P2WSH:
          unspentObj.witnessUtxo = {
            script: Buffer.from(x.script_hex, 'hex'),
            value: parseFloat(x.value) * constants.SAT
          }
          unspentObj.witnessScript = payment.redeem.output
          break
        case constants.P2SH:
          unspentObj.nonWitnessUtxo = Buffer.from(await getTxHex(x.txid, network), 'hex')
          unspentObj.redeemScript = payment.redeem.output
          break
      }
      balanceMap[payment.address].tx.push(unspentObj)
    }
    if (!balanceMap[payment.address].tx.length) {
      delete balanceMap[payment.address]
    }
  } catch (err) {
    console.log(err)
  }
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
