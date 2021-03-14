const constants = require('./constants')
const networks = require('./networks')
const AddressService = require('./services/AddressService')
const fetch = require('node-fetch')
const bitcoin = require('bitcoinjs-lib')
const coininfo = require('coininfo')

require('dotenv').config()

sweepCoins()

async function sweepCoins () {
  try {
    ///    Initialize vars start

    const MAX_TX_LENGTH = 500
    const n = 13
    const network = networks.BITCOIN_TEST
    const crypto = 'bitcoin'
    const isTestnet = true
    const btcBip32Priv = process.env.BTC_BIP32_PRIV
    const btcSecondaryPubKey = process.env.BTC_SECONDARY_PUB_KEY
    const btcSecondaryPrivKey = process.env.BTC_SECONDARY_PRIV_KEY
    const TO_ADDR = '2NCUkmRWQzy82bwRTyDuWDyQ2zhWUVFBCZM'
    const TX_API_URL = 'https://sochain.com/api/v2/send_tx/BTCTEST'

    ///    Initialize vars end

    const utxoMap = await createBtcBalanceMap(btcBip32Priv, btcSecondaryPubKey, n, network)

    const txs = []
    const networkFees = []
    let psbt = new bitcoin.Psbt({ network: generateNetwork(crypto, isTestnet) })

    const hdRoot = bitcoin.bip32.fromBase58(btcBip32Priv, generateNetwork(crypto, isTestnet))
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
          createAndFinalizeTx(tempPsbt, TO_ADDR, balToSweep, 0, hdRoot, btcSecondaryPrivKey, 'bitcoin', true)
          const networkFee = getNetworkFee(tempPsbt, 'bitcoin')
          createAndFinalizeTx(psbt, TO_ADDR, balToSweep, networkFee, hdRoot, btcSecondaryPrivKey, 'bitcoin', true)
          const tx = psbt.extractTransaction()
          const signedTransaction = tx.toHex()
          txs.push(signedTransaction)
          networkFees.push(networkFee)

          psbt = new bitcoin.Psbt({ network: generateNetwork(crypto, isTestnet) })
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

function createAndFinalizeTx (psbt, toAddr, balance, networkFee, root, secondaryPrivKey, crypto, isTestnet) {
  psbt.addOutput({
    address: toAddr, // destination address
    value: Math.floor((balance * constants.SAT) - networkFee)// value in satoshi
  })
  for (let i = 0; i < psbt.txInputs.length; i++) {
    psbt.signInputHD(i, root)
    psbt.signInput(i, bitcoin.ECPair.fromWIF(secondaryPrivKey, generateNetwork(crypto, isTestnet)))
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

function getNetworkFee (psbt, crypto) {
  const tx = psbt.extractTransaction()
  const vSize = tx.virtualSize()

  if (crypto === 'bitcoin' || crypto === 'litecoin') {
    return constants.FEE_RATE * vSize
  } else {
    return Math.ceil(vSize / 1000)
  }
}

async function createBtcBalanceMap (btcBip32Priv, btcSecondaryPubKey, n, network) {
  const btcBalanceMap = {}
  while (n) {
    console.log('Evaluating addresses at i=' + n)
    const p2wsh_p2sh_addr_payment = AddressService.generateSubsequentBlockioAddress(btcBip32Priv, btcSecondaryPubKey, n, network)
    const p2wsh_addr_payment = AddressService.generateP2wshBlockioAddress(btcBip32Priv, btcSecondaryPubKey, n, network)
    const p2wsh_p2sh_addr = p2wsh_p2sh_addr_payment.address
    const p2wsh_addr = p2wsh_addr_payment.address

    try {
      const p2wsh_p2sh_addr_utxo = await AddressService.checkBlockioAddressBalance(p2wsh_p2sh_addr, network)
      const p2wsh_addr_utxo = await AddressService.checkBlockioAddressBalance(p2wsh_addr, network)

      btcBalanceMap[p2wsh_p2sh_addr] = {}
      btcBalanceMap[p2wsh_p2sh_addr].address_type = constants.P2WSH_P2SH
      btcBalanceMap[p2wsh_p2sh_addr].i = n
      btcBalanceMap[p2wsh_p2sh_addr].tx = []

      btcBalanceMap[p2wsh_addr] = {}
      btcBalanceMap[p2wsh_addr].address_type = constants.P2WSH
      btcBalanceMap[p2wsh_addr].i = n
      btcBalanceMap[p2wsh_addr].tx = []

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

        btcBalanceMap[p2wsh_p2sh_addr].tx.push(unspentObj)
      }

      if (!btcBalanceMap[p2wsh_p2sh_addr].tx.length) { delete btcBalanceMap[p2wsh_p2sh_addr] }

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

        btcBalanceMap[p2wsh_addr].tx.push(unspentObj)
      }
      if (!btcBalanceMap[p2wsh_addr].tx.length) { delete btcBalanceMap[p2wsh_addr] }
    } catch (err) {
      console.log(err)
    }
    n--
  }
  console.log('Evaluating addresses at i=0')
  const p2sh_addr_payment = AddressService.generateDefaultBlockioAddress(btcBip32Priv, btcSecondaryPubKey, network)
  const p2sh_addr = p2sh_addr_payment.address

  btcBalanceMap[p2sh_addr] = {}
  btcBalanceMap[p2sh_addr].address_type = constants.P2SH
  btcBalanceMap[p2sh_addr].i = n
  btcBalanceMap[p2sh_addr].tx = []

  const p2sh_addr_utxo = await AddressService.checkBlockioAddressBalance(p2sh_addr, network)

  for (const x of p2sh_addr_utxo.data.txs) {
    const unspentObj = {}
    unspentObj.hash = x.txid
    unspentObj.index = x.output_no
    unspentObj.value = x.value
    unspentObj.nonWitnessUtxo = Buffer.from(await getSochainTxHex(x.txid, networks.BITCOIN_TEST), 'hex')
    unspentObj.redeemScript = p2sh_addr_payment.redeem.output

    btcBalanceMap[p2sh_addr].tx.push(unspentObj)
  }
  if (!btcBalanceMap[p2sh_addr].tx.length) {
    delete btcBalanceMap[p2sh_addr]
  }

  return btcBalanceMap
}

async function getSochainTxHex (txId, network) {
  try {
    const apiUrl = 'https://sochain.com/api/v2/get_tx/' + network + '/' + txId
    const res = await fetch(apiUrl)
    const json = await res.json()

    return json.data.tx_hex
  } catch (err) {
    return err.response.body
  }
}

function generateNetwork (crypto, isTestnet) {
  const net = isTestnet ? 'test' : 'main'
  const curr = coininfo[crypto][net]
  const frmt = curr.toBitcoinJS()

  const netGain = {
    messagePrefix: '\x19' + frmt.name + ' Signed Message:\n',
    bip32: {
      public: frmt.bip32.public,
      private: frmt.bip32.private
    },
    bech32: frmt.bech32,
    pubKeyHash: frmt.pubKeyHash,
    scriptHash: frmt.scriptHash,
    wif: frmt.wif
  }
  return netGain
}
