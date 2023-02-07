const { Provider } = require('../provider.js')
const { Utxo } = require('../utxo.js')

const SUPPORTED_NETWORKS = ['BTC', 'BTCTEST']
const DEFAULT_HOST = 'https://mempool.space'
const SUPPORTED_CONFIG = ['host']

class MempoolSpaceProvider extends Provider {
  constructor (network, config) {
    super('mempool.space', network, undefined, config, SUPPORTED_CONFIG)

    if (SUPPORTED_NETWORKS.indexOf(network) === -1) {
      throw new Error('Network ' + network + ' is not supported by ' + this.providerName)
    }

    this.host = (config && typeof(config.host) === 'string') ? config.host : DEFAULT_HOST
  }

  async getUtxo (address) {
    let res = await this.commonGet(['address', address, 'utxo'].join('/'))
    return res.map(utxo => {
      return new Utxo(utxo.txid, utxo.vout, utxo.value)
    }).filter(utxo => utxo.isSyntacticallyValid())
  }

  async getTxHex(hash) {
    let res = await this.commonGet(['tx', hash, 'hex'].join('/'))
    return res
  }

  async postTx(txhex) {
    const url = this.makeUrl('tx')
    let res = await this.sendRequest('POST', url, txhex)
    return res
  }

  async commonGet (path) {
    const url = this.makeUrl(path)
    return await this.sendRequest('GET', url)
  }

  makeUrl (path) {
    switch (this.network) {
      case 'BTC':
        return [this.host, 'api', path].join('/')
      case 'BTCTEST':
        return [this.host, 'testnet', 'api', path].join('/')
    }
  }
}

module.exports = MempoolSpaceProvider