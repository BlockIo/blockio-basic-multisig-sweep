* User provides five inputs: private_key1_bip32, private_key2, destination_address, # of addresses to look up (default 100), network (BTC, LTC, DOGE, BTCTEST, LTCTEST, DOGETEST).
* Script will use a unified adapter to interact with multiple blockchain API providers. Default will be SoChain. Optional inputs: blockchain provider and blockchain provider throttle limit per minute. Default values are SoChain and its throttle limits at sochain.com/api.
* Optional input for LTC and BTC: sats/byte to use for network fees.
* Script generates upto n*3 addresses: P2SH, P2WSH-over-P2SH, and P2WSH (Witness V0). Dogecoin only uses P2SH for now.
* Script looks up balances for all addresses, and notes whichever addresses have pending or confirmed balances.
* Script retrieves unspent outputs (UTXOs) for all such addresses, and records them in a hash/dictionary.
* Script generates multiple transactions. Each transaction has upto 500 inputs and just 1 output to the destination address.
* Script signs the transaction(s). Script uses network fees: 20 sats/byte for BTC, LTC, and 1.0 DOGE per 1,000 bytes (ceil). Use vsize (not size) to calculate # of bytes for tx.
* Dust amounts are: 0.00000546 BTC, 0.00001000 LTC, 1.0 DOGE. If any transaction sends x <= Dust to the destination address, abort transaction (no sweep).
* Script allows user to review transactions (print out txhex code) and user must approve broadcasting the transactions with a prompt.


```
  bitcoin: {
    messagePrefix: '\x18Bitcoin Signed Message:\n',
    bech32: 'bc',
    bip32: {
      public: 0x0488b21e,
      private: 0x0488ade4
    },
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    wif: 0x80
  },
  litecoin: {
    messagePrefix: '\x19Litecoin Signed Message:\n',
    bech32: 'ltc',
    bip32: {
      public: 0x019da462,
      private: 0x019d9cfe
    },
    pubKeyHash: 0x30,
    scriptHash: 0x32,
    wif: 0xb0
  },
  dogecoin: {
    messagePrefix: '\x19Dogecoin Signed Message:\n',
    bech32: undefined,
    bip32: {
      public: 0x02facafd,
      private: 0x02fac398
    },
    pubKeyHash: 0x1e,
    scriptHash: 0x16,
    wif: 0x9e
  },
  bitcoin_testnet: {
    messagePrefix: '\x18Bitcoin Signed Message:\n',
    bech32: 'tb',
    bip32: {
      public: 0x043587cf,
      private: 0x04358394
    },
    pubKeyHash: 0x6f,
    scriptHash: 0xc4,
    wif: 0xef
  },
  dogecoin_testnet: {
    messagePrefix: '\x18Dogecoin Signed Message:\n',
    bech32: undefined,
    bip32: {
      public: 0x0432a9a8,
      private: 0x0432a243
    },
    pubKeyHash: 0x71,
    scriptHash: 0xc4,
    wif: 0xf1
  },
  litecoin_testnet: {
    messagePrefix: '\x18Litecoin Signed Message:\n',
    bech32: 'tltc',
    bip32: {
      public: 0x0436ef7d,
      private: 0x0436f6e1
    },
    pubKeyHash: 0x6f,
    scriptHash: 0xc4,
    wif: 0xef
  }
  ```
  