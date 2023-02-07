const axios = require('axios')

const DEFAULT_BACKOFF_SECONDS = 30 // default time to back off between requests
const DEFAULT_RETRY_STATUSES = [429]
const SUPPORTED_CONFIG = ['backoff']

class Provider {
  constructor (providerName, network, config, supportedConfig, retryStatus) {
    this.providerName = providerName
    this.network = network
    this.retryStatus = Array.isArray(retryStatus) ? retryStatus : DEFAULT_RETRY_STATUSES

    this.backoff = DEFAULT_BACKOFF_SECONDS
    if (config && typeof(config.backoff) === 'number' && config.backoff > 0) {
      this.backoff = config.backoff
    }

    this.supported = Array.isArray(supportedConfig) ? Array.join(SUPPORTED_CONFIG, supportedConfig) : SUPPORTED_CONFIG
  }

  async getTxHex (hash) {
    throw new Error("MUST OVERRIDE.")
  }

  async getUtxo (address) {
    throw new Error("MUST OVERRIDE")
  }

  async sendTx (txHex) {
    throw new Error("MUST OVERRIDE")
  }

  sendRequest (method, url, data) {
    return new Promise((fulfill, reject) => {
      axios({
      	method: method,
      	url: url,
      	data: data
      }).catch(err => {
        if (err.response) {
          if (this.retryStatus.indexOf(err.response.status) !== -1) {
            return setTimeout(() => {
              this.httpsRequest(method, url, data).catch(reject).then(fulfill)
            }, this.backoff * 1000)
          }
          return reject(err)
        }
        return reject(err)
      }).then(res => {
        if (!res.data) {
          return reject(new Error('no data returned'))
        }
        fulfill(res.data)
      })
    })
  }

  supportedConfig () {
    return this.supported
  }
}

module.exports = { Provider }