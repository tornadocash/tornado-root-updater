require('dotenv').config()
const Web3 = require('web3')
const { TxManager } = require('tx-manager')
const tornadoTreesAbi = require('../abi/tornadoTrees.json')
const Redis = require('ioredis')
const ENSResolver = require('./resolver')
const resolver = new ENSResolver()
const redis = new Redis(process.env.REDIS_URL)
const config = require('torn-token')
let tornadoTrees

const web3 = new Web3(process.env.RPC_URL)
web3.eth.accounts.wallet.add('0x' + process.env.PRIVATE_KEY)
web3.eth.defaultAccount = web3.eth.accounts.privateKeyToAccount('0x' + process.env.PRIVATE_KEY).address

const txManager = new TxManager({
  privateKey: process.env.PRIVATE_KEY,
  rpcUrl: process.env.RPC_URL,
  config: {
    CONFIRMATIONS: process.env.CONFIRMATION_BLOCKS,
    MAX_GAS_PRICE: process.env.GAS_PRICE,
  },
})

async function getTornadoTrees() {
  if (!tornadoTrees) {
    tornadoTrees = new web3.eth.Contract(tornadoTreesAbi, await resolver.resolve(config.tornadoTrees.address))
    console.log('Resolved tornadoTrees contract:', tornadoTrees._address)
  }
  return tornadoTrees
}

module.exports = {
  web3,
  redis,
  getTornadoTrees,
  txManager,
}
