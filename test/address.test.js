const expect = require('chai').expect
const bitcoin = require('bitcoinjs-lib')
const ecpair = require('ecpair')
const networks = require('../src/networks')
const constants = require('../src/constants')
const AddressService = require('../src/services/AddressService')

describe('Address generation', () => {
  describe('BTC:', () => {
    const network = networks[constants.NETWORKS.BTCTEST]
    const bip32Priv = 'tprv8ZgxMBicQKsPdP6i4j9Y3w1e6MBPcw3TtgpyS14RsBPQf1gtdEiUW9FbJRFADLA358ETzGVEMfzoeQn5sAnrTYeee3aJBEEKxARFJ66r56J'
    const privKey2 = 'cUziNRqemZPacb6W77eAwaEqRUL3fMBu8GCagtmkNcZKxKwcBpNo'
    const pubKey2 = ecpair.ECPair.fromWIF(privKey2, network).publicKey.toString('hex')

    const expectedPubKey = '03a7c61247edb96508782905da944e1ed10080f3cafd8f7b3380f2a9a3ed24643a'
    const expectedDefaultAddr = '2MuDAUVni82NjQBDbcGStESgYYucradvugJ'
    const expectedSubsequentAddr = '2MxJph8rCDLp85o5R62cQ3ZVM4PmEgULiwo'
    const expectedWitnessV0Addr = 'tb1qc9axap2tez4508gw08c9etff8h7vthqp4wxasfg93fyy924mun5s68tns2'

    it('got correct public key from private key', () => {
      expect(pubKey2).to.equal(expectedPubKey)
    })
    it('got correct default address for BTCTEST at m/0/0', () => {
      const p2shAddr = AddressService.generateAddresses(constants.P2SH, bip32Priv, pubKey2, network, 0, 'm/i/0')[0].payment.address
      const p2wshP2shAddr = AddressService.generateAddresses(constants.P2WSH_P2SH, bip32Priv, pubKey2, network, 0, 'm/i/0')[0].payment.address
      expect(expectedDefaultAddr).to.be.oneOf([p2shAddr, p2wshP2shAddr])
    })
    it('got correct P2WSH-P2SH address for BTCTEST at m/1/0', () => {
      expect(AddressService.generateAddresses(constants.P2WSH_P2SH, bip32Priv, pubKey2, network, 1, 'm/i/0')[0].payment.address).to.equal(expectedSubsequentAddr)
    })
    it('got correct witness_v0 address for BTCTEST at m/2/0', () => {
      expect(AddressService.generateAddresses(constants.P2WSH, bip32Priv, pubKey2, network, 2, 'm/i/0')[0].payment.address).to.equal(expectedWitnessV0Addr)
    })
  })
  describe('LTC:', () => {
    const network = networks[constants.NETWORKS.LTCTEST]
    const bip32Priv = 'ttpv96BtqegdxXcePqH6tNxCTCvUD3uiRmGydA7NTngHTbFr5AMUu4s6CyfgPiRETyGtmZh7k33F3jqogBpa9NyZ5zEL6VUBCT7B1SLkyRQNhqA'
    const privKey2 = 'cQwePc6aqRx7zGdm3FbeMXC9paEK67enX9ARjMnnR9ueti9NSP75'
    const pubKey2 = ecpair.ECPair.fromWIF(privKey2, network).publicKey.toString('hex')

    const expectedPubKey = '02e74f84e40c9e5bfa2741b9b65e5510d295091c49113b0fb134ae006bf501f579'
    const expectedDefaultAddr = '2MvwtHZckx3FSLjZK8Zr6RUM3pRnfwb9dUx'
    const expectedSubsequentAddr = '2N4j24L4xaKRS2uxKtxgAhiJY25bnp4Wkcm'
    const expectedWitnessV0Addr = 'tltc1qf3ks47mv0m5lk5ppesuw4nvy970zlhp0p35u053ery9y34t29syqtwq889'

    it('got correct public key from private key', () => {
      expect(pubKey2).to.equal(expectedPubKey)
    })
    it('got correct default address for LTCTEST at m/0/0', () => {
      const p2shAddr = AddressService.generateAddresses(constants.P2SH, bip32Priv, pubKey2, network, 0, 'm/i/0')[0].payment.address
      const p2wshP2shAddr = AddressService.generateAddresses(constants.P2WSH_P2SH, bip32Priv, pubKey2, network, 0, 'm/i/0')[0].payment.address
      expect(expectedDefaultAddr).to.be.oneOf([p2shAddr, p2wshP2shAddr])
    })
    it('got correct P2WSH-P2SH address for LTCTEST at m/3/0', () => {
      expect(AddressService.generateAddresses(constants.P2WSH_P2SH, bip32Priv, pubKey2, network, 3, 'm/i/0')[0].payment.address).to.equal(expectedSubsequentAddr)
    })
    it('got correct witness_v0 address for LTCTEST at m/2/0', () => {
      expect(AddressService.generateAddresses(constants.P2WSH, bip32Priv, pubKey2, network, 2, 'm/i/0')[0].payment.address).to.equal(expectedWitnessV0Addr)
    })
  })
  describe('DOGE:', () => {
    const network = networks[constants.NETWORKS.DOGETEST]
    const bip32Priv = 'tgpv1aRS3XcGkbKXEipK7MuD3HhwzSt7b4iHoFfNvxRcaxTKYnot9Uts6rAgvAWQctDEUmgibk6wRsdffk9aQnV6UBQ36JDT5xrc9uVA17XEhR4'
    const privKey2 = 'cjzPVYRThMUnU3bDRAfnxZ6g6pCRgAe2wNTpUunwYQasN7whVuDn'
    const pubKey2 = ecpair.ECPair.fromWIF(privKey2, network).publicKey.toString('hex')

    const expectedPubKey = '02a450d5434765068c514f836369884b363665c05e273ff8f7a937e75063520e90'
    const expectedDefaultAddr = '2NCa2XcXUYpN82tXVERniM6xWUh9rLd8dA2'
    const expectedSubsequentAddr = '2Mu6a95eAzSuiP2t5T7jH3UWGmpBjRANZVQ'

    it('got correct public key from private key', () => {
      expect(pubKey2).to.equal(expectedPubKey)
    })
    it('got correct default address for DOGETEST at m/0/0', () => {
      expect(AddressService.generateAddresses(constants.P2SH, bip32Priv, pubKey2, network, 0, 'm/i/0')[0].payment.address).to.equal(expectedDefaultAddr)
    })
    it('got correct P2SH address for DOGETEST at m/1/0', () => {
      expect(AddressService.generateAddresses(constants.P2SH, bip32Priv, pubKey2, network, 1, 'm/i/0')[0].payment.address).to.equal(expectedSubsequentAddr)
    })
  })
})
