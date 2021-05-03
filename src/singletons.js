require('dotenv').config()

const ethers = require('ethers')
const Redis = require('ioredis')
const config = require('torn-token')
const { TxManager } = require('tx-manager')

const tornadoTreesAbi = require('../abi/tornadoTrees.json')

const { privateKey, rpcUrl, redisUrl, maxGasPrice, confirmations, broadcastNodes, treesContract } = require('./config')

const redis = new Redis(redisUrl)

let tornadoTrees
let provider

const txManager = new TxManager({ rpcUrl, privateKey, broadcastNodes,
  config: {
    CONFIRMATIONS: confirmations,
    MAX_GAS_PRICE: maxGasPrice,
  },
})

function getProvider() {
  if (!provider) {
    provider = new ethers.providers.JsonRpcProvider(rpcUrl)
  }
  return provider
}

function getTornadoTrees() {
  if (!tornadoTrees) {
    tornadoTrees = new ethers.Contract(treesContract || config.tornadoTrees.address, tornadoTreesAbi, getProvider())
  }
  return tornadoTrees
}

module.exports = {
  redis,
  getTornadoTrees,
  getProvider,
  txManager,
}
