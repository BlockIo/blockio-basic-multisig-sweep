module.exports = {
  P2WSH_P2SH: 'P2WSH-P2SH',
  P2SH: 'P2SH',
  P2WSH: 'WITNESS_V0',
  COIN: '100000000',
  N: 100,
  MAX_TX_INPUTS: 500,
  BLOCKCHAIN_PROVIDER_DEFAULT: 'sochain',
  BLOCKCHAIN_PROVIDER_URL_DEFAULT: 'https://sochain.com/api/v2/',
  // the order of provider names matters in PROVIDERS and PROVIDER_URLS
  // the order needs to be the same
  PROVIDERS: {
    SOCHAIN: 'sochain',
    MEMPOOLSPACE: 'mempoolspace',
    BLOCKCHAINCOM: 'blockchaincom'
  },
  PROVIDER_URLS: {
    SOCHAIN: {
      URL: 'https://sochain.com/api/v2',
	SUPPORT: ['BTC', 'LTC', 'DOGE', 'BTCTEST', 'DOGETEST', 'LTCTEST']
    },
    MEMPOOLSPACE: {
      URL: 'https://mempool.space',
      SUPPORT: ['BTC', 'BTCTEST']
    },
    BLOCKCHAINCOM: {
      URL: 'https://blockchain.info',
      SUPPORT: ['BTC']
    }
  },
  NETWORKS: {
    BTC: 'BTC',
    BTCTEST: 'BTCTEST',
    LTC: 'LTC',
    LTCTEST: 'LTCTEST',
    DOGE: 'DOGE',
    DOGETEST: 'DOGETEST'
  },
  FEE_RATE: {
    BTC: 20,
    LTC: 20,
    DOGE: 2000,
    BTCTEST: 20,
    LTCTEST: 20,
    DOGETEST: 2000
  },
  DUST: {
    BTC: 546,
    LTC: 1000,
    DOGE: 1000000, // https://github.com/dogecoin/dogecoin/blob/v1.14.5/doc/fee-recommendation.md
    BTCTEST: 546,
    LTCTEST: 1000,
    DOGETEST: 1000000 // https://github.com/dogecoin/dogecoin/blob/v1.14.5/doc/fee-recommendation.md
  },
  NETWORK_FEE_MAX: {
    BTC: (250 * 100000), // 0.25 BTC
    BTCTEST: (250 * 100000), // 0.25 BTCTEST
    LTC: (50 * 100000), // 0.05 LTC
    LTCTEST: (50 * 100000), // 0.05 LTCTEST
    DOGE: (2 * 100000000), // 2.00 DOGE
    DOGETEST: (2 * 100000000) // 2.00 DOGETEST
  },
  TX_BROADCAST_APPROVAL_TEXT: 'I have verified this transaction, and I want to broadcast it now'
}
