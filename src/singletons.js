require('dotenv').config()

const ethers = require('ethers')
const Redis = require('ioredis')
const config = require('torn-token')

const tornadoTreesAbi = require('../abi/tornadoTrees.json')

const { rpcUrl, redisUrl, wsRpcUrl, treesContract } = require('./config')

const redis = new Redis(redisUrl)

let tornadoTrees
let provider
let providerWs

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

function getProviderWs() {
  if (!providerWs) {
    providerWs = new ethers.providers.WebSocketProvider(wsRpcUrl)
  }
  return providerWs
}

module.exports = {
  redis,
  getProviderWs,
  getTornadoTrees,
  getProvider,
}
