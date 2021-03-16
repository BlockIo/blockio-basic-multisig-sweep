const readline = require('readline')
const constants = require('./constants')
const networks = require('./networks')
const AddressService = require('./services/AddressService')
const fetch = require('node-fetch')
const bitcoin = require('bitcoinjs-lib')

function BlockIoSweep (network, bip32_private_key_1, private_key_2, destination_address, n, options) {
  this.network = network
  this.networkObj = networks[network]
  this.bip32PrivKey = bip32_private_key_1
  this.privateKey2 = private_key_2
  this.toAddr = destination_address
  this.n = n || BlockIoSweep.DEFAULT_N

  if (options && typeof (options) === 'object') {
    this.provider = options.provider || BlockIoSweep.DEFAULT_BLOCKCHAIN_PROVIDER
    this.providerUrl = options.providerUrl || BlockIoSweep.DEFAULT_BLOCKCHAIN_PROVIDER_API_URL
    this.feeRate = options.feeRate || BlockIoSweep.DEFAULT_FEE_RATE
    this.maxTxInputs = options.maxTxInputs || BlockIoSweep.DEFAULT_MAX_TX_INPUTS
  } else {
    this.provider = BlockIoSweep.DEFAULT_BLOCKCHAIN_PROVIDER
    this.providerUrl = BlockIoSweep.DEFAULT_BLOCKCHAIN_PROVIDER_API_URL
    this.feeRate = BlockIoSweep.DEFAULT_FEE_RATE
    this.maxTxInputs = BlockIoSweep.DEFAULT_MAX_TX_INPUTS
  }
}

BlockIoSweep.DEFAULT_N = constants.N
BlockIoSweep.DEFAULT_BLOCKCHAIN_PROVIDER = constants.BLOCKCHAIN_PROVIDER_DEFAULT
BlockIoSweep.DEFAULT_BLOCKCHAIN_PROVIDER_API_URL = constants.BLOCKCHAIN_PROVIDER_URL_DEFAULT
BlockIoSweep.DEFAULT_FEE_RATE = constants.FEE_RATE
BlockIoSweep.DEFAULT_MAX_TX_INPUTS = constants.MAX_TX_INPUTS

BlockIoSweep.prototype.begin = async function () {
  if (this.network !== constants.NETWORKS.BTC && this.network !== constants.NETWORKS.BTCTEST &&
      this.network !== constants.NETWORKS.LTC && this.network !== constants.NETWORKS.LTCTEST &&
      this.network !== constants.NETWORKS.DOGE && this.network !== constants.NETWORKS.DOGETEST) {
    throw new Error('Valid network not provided')
  }
  if (!this.bip32PrivKey || !this.privateKey2) {
    throw new Error('Private keys not provided')
  }
  if (!this.toAddr) {
    throw new Error('Destination address not provided')
  }
  const publicKey2 = bitcoin.ECPair.fromWIF(this.privateKey2, this.networkObj).publicKey.toString('hex')
  let getUtxoApiUrl
  let sendTxApiUrl
  let getTxApiUrl

  if (this.provider === BlockIoSweep.DEFAULT_BLOCKCHAIN_PROVIDER) {
    sendTxApiUrl = this.providerUrl + 'send_tx/' + this.network
    getUtxoApiUrl = this.providerUrl + 'get_tx_unspent/' + this.network + '/'
    getTxApiUrl = this.providerUrl + 'get_tx/' + this.network + '/'
  }

  try {
    const utxoMap = await createBalanceMap(this.n, this.bip32PrivKey, publicKey2, this.networkObj, this.network, getUtxoApiUrl, getTxApiUrl)

    const txs = []
    const networkFees = []
    let psbt = new bitcoin.Psbt({ network: this.networkObj })

    const hdRoot = bitcoin.bip32.fromBase58(this.bip32PrivKey, this.networkObj)
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
        if (psbt.txInputs.length === this.maxTxInputs || (addrIte === addressCount && i === addrTxCount)) {
          const balance = Math.floor(balToSweep * constants.SAT)
          let allowTx = true
          if (this.network === constants.NETWORKS.BTC || this.network === constants.NETWORKS.BTCTEST) {
            if (balance <= constants.DUST.BTC) {
              allowTx = false
            }
          } else if (this.network === constants.NETWORKS.LTC || this.network === constants.NETWORKS.LTCTEST) {
            if (balance <= constants.DUST.LTC) {
              allowTx = false
            }
          } else {
            if (balToSweep <= constants.DUST.DOGE) {
              allowTx = false
            }
          }

          if (!allowTx) {
            throw new Error('Amount less than dust being sent, tx aborted')
          }

          const tempPsbt = psbt.clone()
          createAndFinalizeTx(tempPsbt, this.toAddr, balToSweep, 0, hdRoot, this.privateKey2, this.networkObj)
          const networkFee = getNetworkFee(tempPsbt, this.networkObj.bech32, this.feeRate)
          createAndFinalizeTx(psbt, this.toAddr, balToSweep, networkFee, hdRoot, this.privateKey2, this.networkObj)
          // disable fee check for doge
          const tx = this.networkObj.bech32 ? psbt.extractTransaction() : psbt.extractTransaction(true)
          const signedTransaction = tx.toHex()
          txs.push(signedTransaction)
          networkFees.push(networkFee)

          psbt = new bitcoin.Psbt({ network: this.networkObj })
          inputNum = 0
          balToSweep = 0
        }
      }
      addrIte++
    }
    if (!txs.length) {
      throw new Error('No transaction created, do your addresses have balance?')
    }
    for (const tx in txs) {
      console.log('TX Hex:', txs[tx])
      const ans = await promptConfirmation('Type y to broadcast tx, otherwise, press anything else: ')
      if (ans !== 'y') {
        console.log('Tx aborted')
        continue
      }
      await sendTx(sendTxApiUrl, txs[tx])
      console.log('Network fee:', networkFees[tx])
    }
  } catch (err) {
    throw new Error(err)
  }
}

module.exports = BlockIoSweep

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
  try {
    let res = await fetch(apiUrl, {
      method: 'POST',
      body: JSON.stringify({ tx_hex: txHex }),
      headers: { 'Content-Type': 'application/json' }
    })
    res = await res.json()
    if (res.status === 'success') {
      console.log('Sweep Success!')
      console.log('Tx_id:', res.data.txid)
    } else {
      console.log('Sweep Failed:')
      throw new Error(res)
    }
  } catch (err) {
    throw new Error(err)
  }
}

function getNetworkFee (psbt, bech32, feeRate) {
  const tx = psbt.extractTransaction()
  const vSize = tx.virtualSize()

  if (bech32) {
    return feeRate * vSize
  } else {
    return Math.ceil(vSize / 1000)
  }
}

async function createBalanceMap (n, bip32Priv, pubKey, networkObj, network, utxoApiUrl, getTxApiUrl) {
  const balanceMap = {}
  try {
    if (network !== constants.NETWORKS.DOGE && network !== constants.NETWORKS.DOGETEST) {
      while (n) {
        console.log('Evaluating addresses at i=' + n)
        await addAddrToMap(balanceMap, constants.P2WSH_P2SH, parseInt(n), bip32Priv, pubKey, networkObj, utxoApiUrl, getTxApiUrl)
        await addAddrToMap(balanceMap, constants.P2WSH, parseInt(n), bip32Priv, pubKey, networkObj, utxoApiUrl, getTxApiUrl)
        await addAddrToMap(balanceMap, constants.P2SH, parseInt(n), bip32Priv, pubKey, networkObj, utxoApiUrl, getTxApiUrl)
        n--
      }
      console.log('Evaluating addresses at i=' + n)
      await addAddrToMap(balanceMap, constants.P2WSH_P2SH, parseInt(n), bip32Priv, pubKey, networkObj, utxoApiUrl, getTxApiUrl)
      await addAddrToMap(balanceMap, constants.P2SH, parseInt(n), bip32Priv, pubKey, networkObj, utxoApiUrl, getTxApiUrl)
    } else {
      while (n >= 0) {
        console.log('Evaluating addresses at i=' + n)
        await addAddrToMap(balanceMap, constants.P2SH, parseInt(n), bip32Priv, pubKey, networkObj, utxoApiUrl, getTxApiUrl)
        n--
      }
    }
    return balanceMap
  } catch (err) {
    throw new Error(err)
  }
}

async function addAddrToMap (balanceMap, addrType, n, bip32Priv, pubKey, networkObj, utxoApiUrl, getTxApiUrl) {
  let payment

  switch (addrType) {
    case constants.P2WSH_P2SH:
      payment = AddressService.generateP2wshP2shBlockioAddr(bip32Priv, pubKey, networkObj, n)
      balanceMap[payment.address] = {}
      balanceMap[payment.address].address_type = constants.P2WSH_P2SH
      break
    case constants.P2WSH:
      payment = AddressService.generateP2wshBlockioAddress(bip32Priv, pubKey, networkObj, n)
      balanceMap[payment.address] = {}
      balanceMap[payment.address].address_type = constants.P2WSH
      break
    case constants.P2SH:
      payment = AddressService.generateP2shBlockioAddr(bip32Priv, pubKey, networkObj, n)
      balanceMap[payment.address] = {}
      balanceMap[payment.address].address_type = constants.P2SH
      break
  }

  try {
    const addrUtxo = await AddressService.checkBlockioAddressBalance(utxoApiUrl + payment.address)

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
            value: Math.ceil(parseFloat(x.value) * constants.SAT)
          }
          unspentObj.redeemScript = payment.redeem.output
          unspentObj.witnessScript = payment.redeem.redeem.output
          break
        case constants.P2WSH:
          unspentObj.witnessUtxo = {
            script: Buffer.from(x.script_hex, 'hex'),
            value: Math.ceil(parseFloat(x.value) * constants.SAT)
          }
          unspentObj.witnessScript = payment.redeem.output
          break
        case constants.P2SH:
          unspentObj.nonWitnessUtxo = Buffer.from(await getTxHex(getTxApiUrl + x.txid), 'hex')
          unspentObj.redeemScript = payment.redeem.output
          break
      }
      balanceMap[payment.address].tx.push(unspentObj)
    }
    if (!balanceMap[payment.address].tx.length) {
      delete balanceMap[payment.address]
    }
  } catch (err) {
    throw new Error(err)
  }
}

async function getTxHex (apiUrl) {
  try {
    const res = await fetch(apiUrl)
    const json = await res.json()

    return json.data.tx_hex
  } catch (err) {
    throw new Error(err.response.body)
  }
}

function promptConfirmation (query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise(resolve => rl.question(query, ans => {
    rl.close()
    resolve(ans)
  }))
}
