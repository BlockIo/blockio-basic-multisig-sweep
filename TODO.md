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


