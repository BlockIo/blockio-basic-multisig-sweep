const bitcoin = require('bitcoinjs-lib')
const networks = require("./networks");

class Address {
  generateAddresses(
    bip32PrivKey,
    secondaryPubKey,
    network,
    i,
    derivationPath
  ) {
    throw new Error("MUST OVERRIDE");
  }

  async prepareAddressData(
    generatedAddress,
    i,
    provider,
    network
  ) {
    throw new Error("MUST OVERRIDE");
  }

  toOutputScript(address, network) {
    return bitcoin.address.toOutputScript(address, networks[network])
  }
}

module.exports = { Address };
