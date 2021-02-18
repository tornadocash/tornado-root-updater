require('dotenv').config()
const ethers = require('ethers')
const { TxManager } = require('tx-manager')
const tornadoTreesAbi = require('../abi/tornadoTrees.json')
const Redis = require('ioredis')
const redis = new Redis(process.env.REDIS_URL)
const config = require('torn-token')
let tornadoTrees
let provider

const txManager = new TxManager({
  privateKey: process.env.PRIVATE_KEY,
  rpcUrl: process.env.RPC_URL,
  broadcastNodes: process.env.BROADCAST_NODES ? process.env.BROADCAST_NODES.split(',') : undefined,
  config: {
    CONFIRMATIONS: process.env.CONFIRMATION_BLOCKS,
    MAX_GAS_PRICE: process.env.GAS_PRICE,
  },
})

function getProvider() {
  if (!provider) {
    provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL)
  }
  return provider
}

function getTornadoTrees() {
  if (!tornadoTrees) {
    tornadoTrees = new ethers.Contract(process.env.TORNADO_TREES || config.tornadoTrees.address, tornadoTreesAbi, getProvider())
  }
  return tornadoTrees
}

module.exports = {
  redis,
  getTornadoTrees,
  getProvider,
  txManager,
}
