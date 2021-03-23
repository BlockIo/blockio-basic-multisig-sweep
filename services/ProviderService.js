const constants = require('../constants')
const fetch = require('node-fetch')

const ProviderService = function (provider, network) {
  if (Object.values(constants.PROVIDERS).indexOf(provider) < 0) {
    throw new Error('Blockchain provider not supported')
  }
  if (provider === constants.PROVIDERS.MEMPOOL && network !== constants.NETWORKS.BTC) {
    throw new Error('Mempool only supports BTC network')
  }
  this.network = network
  this.provider = provider
}

ProviderService.prototype.getTxHex = async function (txId) {
  try {
    switch (this.provider) {
      case constants.PROVIDERS.SOCHAIN: {
        const apiUrl = [constants.PROVIDER_URLS.SOCHAIN, 'get_tx', this.network, txId].join('/')
        const res = await fetchUrl(apiUrl)
        const json = await res.json()
        return json.data.tx_hex
      }
      case constants.PROVIDERS.MEMPOOL: {
        const apiUrl = [constants.PROVIDER_URLS.MEMPOOL, 'tx', txId, 'hex'].join('/')
        const res = await fetchUrl(apiUrl)
        const hex = await res.text()
        return hex
      }
      case constants.PROVIDERS.BLOCKCHAIN: {
        const apiUrl = [constants.PROVIDER_URLS.BLOCKCHAIN, 'rawtx', txId, '?format=hex'].join('/')
        const res = await fetchUrl(apiUrl)
        const hex = await res.text()
        return hex
      }
    }
  } catch (err) {
    throw new Error(err)
  }
}

module.exports = ProviderService

async function fetchUrl (url) {
  try {
    return await fetch(url)
  } catch (err) {
    throw new Error(err)
  }
}
