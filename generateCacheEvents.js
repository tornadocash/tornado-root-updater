/* eslint-disable no-unused-vars */
require('dotenv').config()
const ethers = require('ethers')
const tornadoTreesAbi = require('./abi/tornadoTrees.json')
const tornadoAbi = require('./abi/tornado.json')
const fs = require('fs')

const abi = new ethers.utils.AbiCoder()
const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL)
const tornadoTreesV1 = new ethers.Contract(
  '0x43a3bE4Ae954d9869836702AFd10393D3a7Ea417',
  tornadoTreesAbi,
  provider,
)

const instances = [
  '0x12D66f87A04A9E220743712cE6d9bB1B5616B8Fc',
  '0x47CE0C6eD5B0Ce3d3A51fdb1C52DC66a7c3c2936',
  '0x910Cbd523D972eb0a6f4cAe4618aD62622b39DbF',
  '0xA160cdAB225685dA1d56aa342Ad8841c3b53f291',
]

const tornadoTreesDeploymentBlock = 11474714

async function getTornadoEvents({ instances, fromBlock, toBlock, type, provider }) {
  const hashName = type === 'deposit' ? 'commitment' : 'nullifierHash'
  const promises = instances.map((instance) =>
    getInstanceEvents({ type, instance, fromBlock, toBlock, provider }),
  )

  const raw = await Promise.all(promises)

  const events = raw.flat().reduce((acc, e) => {
    const encodedData = abi.encode(
      ['address', 'bytes32', 'uint256'],
      [e.address, e.args[hashName], e.blockNumber],
    )
    const leafHash = ethers.utils.keccak256(encodedData)

    acc[leafHash] = {
      instance: e.address,
      hash: e.args[hashName],
      block: e.blockNumber,
    }
    return acc
  }, {})
  return events
}

async function getInstanceEvents({ type, instance, fromBlock, toBlock, provider }) {
  const tornado = new ethers.Contract(instance, tornadoAbi)
  const eventFilter = type === 'deposit' ? tornado.filters.Deposit() : tornado.filters.Withdrawal()
  let events = await provider.getLogs({
    instance,
    fromBlock,
    toBlock,
    topics: eventFilter.topics,
  })
  events = events.map((e) => {
    return {
      address: e.address,
      blockNumber: e.blockNumber,
      args: tornado.interface.parseLog(e).args,
    }
  })
  return events
}

async function getPendingDeposits() {
  let fromBlock = tornadoTreesDeploymentBlock
  let toBlock = fromBlock + 200000
  let tornadoEvents = {}
  const latestBlock = await provider.getBlockNumber()
  while (toBlock < latestBlock) {
    const eventsBatch = await getTornadoEvents({ instances, fromBlock, toBlock, type: 'deposit', provider })
    console.log(`Got new ${Object.keys(eventsBatch).length} events`)
    tornadoEvents = Object.assign(tornadoEvents, eventsBatch)

    fromBlock = toBlock
    toBlock = fromBlock + 20000
  }
  const eventsBatch = await getTornadoEvents({
    instances,
    fromBlock,
    latestBlock,
    type: 'deposit',
    provider,
  })
  console.log(`Last batch of ${Object.keys(eventsBatch).length} events`)
  tornadoEvents = Object.assign(tornadoEvents, eventsBatch)

  fs.writeFileSync('./cache/allEvents.json', JSON.stringify(tornadoEvents, null, 2))

  // const tornadoEvents = require('./cache/allEvents.json')
  const registeredDeposits = await tornadoTreesV1.getRegisteredDeposits({ gasLimit: 500e6 })
  let lastProcessedDepositLeaf = (await tornadoTreesV1.lastProcessedDepositLeaf()).toNumber()
  const cachedEvents = registeredDeposits.map((hash) => {
    const leaf = tornadoEvents[hash]
    if (!leaf) {
      console.log('there is no pair for', hash)
      return { undef: 'undef' }
    }
    return { ...leaf, index: lastProcessedDepositLeaf++, sha3: hash }
  })
  fs.writeFileSync('./cache/pendingDeposits.json', JSON.stringify(cachedEvents, null, 2))
}

async function getPendingWithdrawals() {
  let fromBlock = tornadoTreesDeploymentBlock
  let toBlock = fromBlock + 200000
  let tornadoEvents = {}
  const latestBlock = await provider.getBlockNumber()
  while (toBlock < latestBlock) {
    const eventsBatch = await getTornadoEvents({
      instances,
      fromBlock,
      toBlock,
      type: 'withdrawal',
      provider,
    })
    console.log(`Got new ${Object.keys(eventsBatch).length} events`)
    tornadoEvents = Object.assign(tornadoEvents, eventsBatch)

    fromBlock = toBlock
    toBlock = fromBlock + 20000
  }
  const eventsBatch = await getTornadoEvents({
    instances,
    fromBlock,
    latestBlock,
    type: 'withdrawal',
    provider,
  })
  console.log(`Last batch of ${Object.keys(eventsBatch).length} events`)
  tornadoEvents = Object.assign(tornadoEvents, eventsBatch)

  fs.writeFileSync('./cache/allEvents.json', JSON.stringify(tornadoEvents, null, 2))
  // const tornadoEvents = require('./cache/allEvents.json')
  const registeredWithdrawals = await tornadoTreesV1.getRegisteredWithdrawals({ gasLimit: 500e6 })
  let lastProcessedWithdrawalLeaf = (await tornadoTreesV1.lastProcessedWithdrawalLeaf()).toNumber()
  const cachedEvents = registeredWithdrawals.map((hash) => {
    const leaf = tornadoEvents[hash]
    if (!leaf) {
      console.log('there is no pair for', hash)
      return { undef: 'undef' }
    }
    return { ...leaf, index: lastProcessedWithdrawalLeaf++, sha3: hash }
  })
  fs.writeFileSync('./cache/pendingWithdrawals.json', JSON.stringify(cachedEvents, null, 2))
}

async function getTornadoTreesEvents(type, fromBlock, toBlock) {
  const eventName = type === 'deposit' ? 'DepositData' : 'WithdrawalData'
  const events = await provider.getLogs({
    address: tornadoTreesV1.address,
    topics: tornadoTreesV1.filters[eventName]().topics,
    fromBlock,
    toBlock,
  })
  return events
    .map((e) => {
      const { instance, hash, block, index } = tornadoTreesV1.interface.parseLog(e).args
      const encodedData = abi.encode(['address', 'bytes32', 'uint256'], [instance, hash, block])
      return {
        instance,
        hash,
        block: block.toNumber(),
        index: index.toNumber(),
        sha3: ethers.utils.keccak256(encodedData),
      }
    })
    .sort((a, b) => a.index - b.index)
}

async function getCommittedDeposits() {
  const latestBlock = await provider.getBlockNumber()
  const events = await getTornadoTreesEvents('deposit', tornadoTreesDeploymentBlock, latestBlock)
  fs.writeFileSync('./cache/committedDeposits.json', JSON.stringify(events, null, 2))
}

async function getCommittedWithdrawals() {
  const latestBlock = await provider.getBlockNumber()
  const events = await getTornadoTreesEvents('withdrawal', tornadoTreesDeploymentBlock, latestBlock)
  fs.writeFileSync('./cache/committedWithdrawals.json', JSON.stringify(events, null, 2))
}

// getCommittedDeposits()
// getCommittedWithdrawals()

// getPendingDeposits()
// getPendingWithdrawals()
