const constants = require('../constants')
const fetch = require('node-fetch')

const ProviderService = function (provider, network) {
  const providerIndex = Object.values(constants.PROVIDERS).indexOf(provider)
  if (providerIndex < 0) {
    throw new Error('Blockchain provider not supported')
  }
  const providerKey = Object.keys(constants.PROVIDER_URLS)[providerIndex]
  if (constants.PROVIDER_URLS[providerKey].SUPPORT.indexOf(network) < 0) {
    throw new Error('Network not supported by provider')
  }
  this.network = network
  this.provider = provider
}

ProviderService.prototype.getTxHex = async function (txId) {
  try {
    switch (this.provider) {
      case constants.PROVIDERS.SOCHAIN: {
        const apiUrl = [constants.PROVIDER_URLS.SOCHAIN.URL, 'get_tx', this.network, txId].join('/')
        const res = await fetchUrl(apiUrl)
        const json = await res.json()
        return json.data.tx_hex
      }
      case constants.PROVIDERS.MEMPOOLSPACE: {
        const apiUrl = [constants.PROVIDER_URLS.MEMPOOLSPACE.URL, 'tx', txId, 'hex'].join('/')
        const res = await fetchUrl(apiUrl)
        const hex = await res.text()
        return hex
      }
      case constants.PROVIDERS.BLOCKCHAINCOM: {
        const apiUrl = [constants.PROVIDER_URLS.BLOCKCHAINCOM.URL, 'rawtx', txId, '?format=hex'].join('/')
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
