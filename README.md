* **THIS IS BETA SOFTWARE. BE CAREFUL!**
* Reference sweep script for Basic (2-of-2) MultiSig wallets. NodeJS.  
* Uses [SoChain's Free API](https://sochain.com/api) by default for blockchain data and for broadcasting transactions. You can implement your own backends yourself.  
* NEVER SHARE YOUR PRIVATE KEYS. NEVER USE PRIVATE KEYS ON INSECURE SYSTEMS.  

Command-line Usage:
```
$ git clone <repository URL>
$ cd <dir> && npm install
$ N= PRIVATE_KEY1_BIP32= PRIVATE_KEY2= DESTINATION_ADDR= NETWORK= DERIVATION_PATH= node example.js
```
* N is the number of addresses you've generated on the given network
* PRIVATE_KEY1_BIP32 is the BIP32 extended private key you backed up
* PRIVATE_KEY2 is the second private key you backed up
* DESTINATION_ADDR is where you want the swept coins to go
* NETWORK is the network for which you're sweeping coins
* DERIVATION_PATH is the derivation path shown when you back up your private keys
