module.exports = {
  P2WSH_P2SH: 'P2WSH-P2SH',
  P2SH: 'P2SH',
  P2WSH: 'WITNESS_V0',
  SAT: 100000000,
  FEE_RATE: 20,
  N: 100,
  MAX_TX_INPUTS: 500,
  BLOCKCHAIN_PROVIDER_DEFAULT: 'sochain',
  BLOCKCHAIN_PROVIDER_URL_DEFAULT: 'https://sochain.com/api/v2/',
  NETWORKS: {
    BTC: 'BTC',
    BTCTEST: 'BTCTEST',
    LTC: 'LTC',
    LTCTEST: 'LTCTEST',
    DOGE: 'DOGE',
    DOGETEST: 'DOGETEST'
  },
  DUST: {
    BTC: 546,
    LTC: 1000,
    DOGE: 1
  }
}
