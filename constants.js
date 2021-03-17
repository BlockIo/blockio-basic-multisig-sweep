module.exports = {
  P2WSH_P2SH: 'P2WSH-P2SH',
  P2SH: 'P2SH',
  P2WSH: 'WITNESS_V0',
  COIN: '100000000',
  FEE_RATE: 20, // LTC and BTC, not DOGE
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
  },
  NETWORK_FEE_MAX: {
    BTC: (250 * 100000), // 0.25 BTC
    BTCTEST: (250 * 100000), // 0.25 BTCTEST
    LTC: (50 * 100000), // 0.05 LTC
    LTCTEST: (50 * 100000), // 0.05 LTCTEST
    DOGE: (200 * 100000000), // 200 DOGE
    DOGETEST: (200 * 100000000) // 200 DOGETEST
  },
  TX_BROADCAST_APPROVAL_TEXT: 'I have verified this transaction, and I want to broadcast it now'
}
