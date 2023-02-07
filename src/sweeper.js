const readline = require("readline");
const constants = require("./constants");
const networks = require("./networks");
const bitcoin = require("bitcoinjs-lib");
const ecpair = require("ecpair");
const bip32 = require("bip32");
const ecc = require("tiny-secp256k1");
const P2SH = require("./addresses/p2sh");
const P2WSH_P2SH = require("./addresses/p2wsh_p2sh");
const P2WSH = require("./addresses/p2wsh");

const MempoolSpaceProvider = require("./providers/mempoolspace");

class BlockIoSweep {
  constructor(
    network,
    bip32_private_key_1,
    private_key_2,
    destination_address,
    n,
    derivation_path,
    options
  ) {
    // TODO perform error checking on all these inputs
    this.network = network;
    this.networkObj = networks[network];
    this.bip32PrivKey = bip32_private_key_1;
    this.privateKey2 = private_key_2;
    this.toAddr = destination_address;
    this.derivationPath = derivation_path;
    this.n = n || parseInt(constants.N);

    const providers = {};

    providers[constants.PROVIDERS.MEMPOOLSPACE] = MempoolSpaceProvider;

    if (options && typeof options === "object") {
      if (options.provider) {
        const providerIndex = Object.values(constants.PROVIDERS).indexOf(
          options.provider
        );
        if (providerIndex < 0) {
          throw new Error("Blockchain provider not supported");
        }
      }

      this.provider =
        new providers[options.provider](this.network) ||
        new providers[constants.BLOCKCHAIN_PROVIDER_DEFAULT](this.network);
      this.feeRate = options.feeRate || constants.FEE_RATE[network];
      this.maxTxInputs = options.maxTxInputs || constants.MAX_TX_INPUTS;
    } else {
      this.provider = new providers[constants.BLOCKCHAIN_PROVIDER_DEFAULT](
        this.network
      );
      this.feeRate = constants.FEE_RATE[network];
      this.maxTxInputs = constants.MAX_TX_INPUTS;
    }

    this.supportedAddresses = {};
    this.supportedAddresses[constants.P2SH] = new P2SH();
	// DOGE only supports P2SH
	if (
		this.network != constants.NETWORKS.DOGE &&
		this.network != constants.NETWORKS.DOGETEST
	  ) {
		this.supportedAddresses[constants.P2WSH] = new P2WSH();
    	this.supportedAddresses[constants.P2WSH_P2SH] = new P2WSH_P2SH();
	  }
  }

  async begin() {
    // the user calls this to begin sweep of addresses
    // we look for the first N paths' addresses,
    // we retrieve the unspent outputs for the addresses
    // we construct transaction(s) and sign them
    // we ask the user to validate the transaction meets their approval
    // if approved, we broadcast the transaction to the network

    if (
      this.network !== constants.NETWORKS.BTC &&
      this.network !== constants.NETWORKS.BTCTEST &&
      this.network !== constants.NETWORKS.LTC &&
      this.network !== constants.NETWORKS.LTCTEST &&
      this.network !== constants.NETWORKS.DOGE &&
      this.network !== constants.NETWORKS.DOGETEST
    ) {
      throw new Error(
        "Must specify a valid network. Valid values are: BTC, LTC, DOGE, BTCTEST, LTCTEST, DOGETEST"
      );
    }

    if (!this.bip32PrivKey || !this.privateKey2) {
      throw new Error("One or more private keys not provided");
    }

    if (!this.toAddr) {
      // TODO LTC and LTCTEST destination addresses must use legacy address version
      throw new Error("Destination address not provided");
    }

    if (!this.derivationPath) {
      throw new Error("Must specify DERIVATION_PATH");
    }

    if (this.derivationPath != "m/i/0" && this.derivationPath != "m/0/i") {
      throw new Error("Must specify DERIVATION_PATH. Can be: m/i/0 or m/0/i.");
    }

    try {
      // get the public key from the user-specified private key
      const publicKey2 = ecpair.ECPair.fromWIF(
        this.privateKey2,
        this.networkObj
      ).publicKey.toString("hex");

      // generate addresses for the N paths and initiate a utxo
      const utxoMap = await createBalanceMap(
        this.n,
        this.bip32PrivKey,
        publicKey2,
        this.networkObj,
        this.network,
        this.derivationPath,
        this.provider,
        this.supportedAddresses
      );

      const txs = [];

      let psbt = new bitcoin.Psbt({ network: this.networkObj });

      const root = bip32
        .default(ecc)
        .fromBase58(this.bip32PrivKey, this.networkObj);
      let ecKeys = {};

      let balToSweep = 0;
      const addressCount = Object.keys(utxoMap).length - 1;
      let addrIte = 0;
      let inputNum = 0;

      // TODO test for multiple tx

      for (const address of Object.keys(utxoMap)) {
        // for each address

        // the BIP32 derived key (ECPair) for this address
        let key = utxoMap[address].primaryKey;

        const addrTxCount = utxoMap[address].tx.length - 1;

        for (let i = 0; i < utxoMap[address].tx.length; i++) {
          const utxo = utxoMap[address].tx[i];
          balToSweep += utxo.value;
          delete utxo.value;
          const input = {
            ...utxo,
          };

          psbt.addInput(input);
          ecKeys[inputNum++] = key;

          if (
            psbt.txInputs.length === this.maxTxInputs ||
            (addrIte === addressCount && i === addrTxCount)
          ) {
            if (balToSweep <= constants.DUST[this.network]) {
              throw new Error("Amount less than dust being sent, tx aborted");
            }

            // create the transaction without network fees
            const tempPsbt = psbt.clone();
            createAndFinalizeTx(
              tempPsbt,
              this.toAddr,
              balToSweep,
              0,
              ecKeys,
              this.privateKey2,
              this.networkObj
            );

            // we know the size of the transaction now,
            // calculate the network fee, and recreate the appropriate transaction
            const networkFee = getNetworkFee(
              this.network,
              tempPsbt,
              this.feeRate
            );
            createAndFinalizeTx(
              psbt,
              this.toAddr,
              balToSweep,
              networkFee,
              ecKeys,
              this.privateKey2,
              this.networkObj
            );

            if (psbt.getFee() > constants.NETWORK_FEE_MAX[this.network]) {
              throw new Error(
                " *** WARNING: max network fee exceeded. This transaction has a network fee of " +
                  psbt.getFee().toString() +
                  " sats, whereas the maximum network fee allowed is " +
                  constants.NETWORK_FEE_MAX[this.network].toString() +
                  " sats"
              );
            }

            const extracted_tx = psbt.extractTransaction();

            // we'll show the network fee, the network fee rate, and the transaction hex for the user to independently verify before broadcast
            // we don't ask bitcoinjs to enforce the max fee rate here, we've already done it above ourselves
            txs.push({
              network_fee: psbt.getFee(),
              network_fee_rate: psbt.getFeeRate(),
              tx_hex: extracted_tx.toHex(),
              tx_size: extracted_tx.virtualSize(),
            });

            psbt = new bitcoin.Psbt({ network: this.networkObj });
            balToSweep = 0;
            ecKeys = {};
            inputNum = 0;
          }
        }
        addrIte++;
      }

      if (!txs.length) {
        throw new Error(
          "No transaction created, do your addresses have balance?"
        );
      }

      for (let i = 0; i < txs.length; i++) {
        const tx = txs[i];

        console.log("\n\nVERIFY THE FOLLOWING IS CORRECT INDEPENDENTLY:\n");
        console.log("Network:", this.network);
        console.log("Transaction Hex:", tx.tx_hex);
        console.log("Network Fee Rate:", tx.network_fee_rate, "sats/byte");
        console.log("Transaction VSize:", tx.tx_size, "bytes");
        console.log(
          "Network Fee:",
          tx.network_fee,
          "sats",
          "(max allowed:",
          constants.NETWORK_FEE_MAX[this.network],
          "sats)"
        );

        const ans = await promptConfirmation(
          "\n\n*** YOU MUST INDEPENDENTLY VERIFY THE NETWORK FEE IS APPROPRIATE AND THE TRANSACTION IS PROPERLY CONSTRUCTED. ***\n*** ONCE A TRANSACTION IS BROADCAST TO THE NETWORK, IT IS CONSIDERED IRREVERSIBLE ***\n\nIf you approve of this transaction and have verified its accuracy, type '" +
            constants.TX_BROADCAST_APPROVAL_TEXT +
            "', otherwise, press enter: "
        );

        if (ans !== constants.TX_BROADCAST_APPROVAL_TEXT) {
          console.log("\nTRANSACTION ABORTED\n");
          continue;
        }

        await this.provider.postTx(tx.tx_hex);
      }
    } catch (err) {
      console.log(err.stack);
      throw new Error(err);
    }
  }
}

module.exports = BlockIoSweep;

function createAndFinalizeTx(
  psbt,
  toAddr,
  balance,
  networkFee,
  ecKeys,
  privKey2,
  network
) {
  // balance and network fee are in COIN

  const val = balance - networkFee;

  psbt.addOutput({
    address: toAddr, // destination address
    value: val, // value in sats
  });

  for (let i = 0; i < psbt.txInputs.length; i++) {
    psbt.signInput(i, ecKeys[i]);
    psbt.signInput(i, ecpair.ECPair.fromWIF(privKey2, network));
  }

  psbt.finalizeAllInputs();
}

function getNetworkFee(network, psbt, feeRate) {
  const tx = psbt.extractTransaction();
  const vSize = tx.virtualSize(); // in bytes

  let f = feeRate * vSize;

  return f;
}

async function createBalanceMap(
  n,
  bip32Priv,
  pubKey,
  networkObj,
  network,
  derivationPath,
  provider,
  supportedAddresses
) {
  // generates addresses for the N paths and retrieves their unspent outputs
  // returns balanceMap with all the appropriate data for creating and signing transactions

  const balanceMap = {};

  for (let i = 0; i <= n; i++) {
    console.log("Evaluating addresses at i=" + i);

    for (addressType of Object.keys(supportedAddresses)) {
      generatedAddresses = await supportedAddresses[addressType].generateAddresses(
        bip32Priv,
        pubKey,
        networkObj,
        i,
        derivationPath
      );

      for (generatedAddress of generatedAddresses) {
        addressData = await supportedAddresses[addressType].prepareAddressData(
          generatedAddress,
          i,
          provider,
          network
        );
        if (addressData == null) {
          continue;
        }
        balanceMap[addressData.address] = addressData.addressData;
      }
    }
  }

  return balanceMap;
}

function promptConfirmation(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}
