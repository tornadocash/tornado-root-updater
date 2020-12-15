const { web3, getTornadoTrees } = require('./singletons')
const tornadoAbi = require('../abi/tornado.json')
const { poseidonHash } = require('./utils')
const { soliditySha3 } = require('web3-utils')

async function getTornadoEvents({ instances, startBlock, endBlock, type }) {
  const hashName = type === 'deposit' ? 'commitment' : 'nullifierHash'
  const promises = instances.map((instance) => getInstanceEvents({ type, instance, startBlock, endBlock }))

  const raw = await Promise.all(promises)

  const events = raw.flat().reduce((acc, e) => {
    const encodedData = web3.eth.abi.encodeParameters(
      ['address', 'bytes32', 'uint256'],
      [e.address, e.returnValues[hashName], e.blockNumber],
    )
    const leafHash = soliditySha3({ t: 'bytes', v: encodedData })
    acc[leafHash] = {
      instance: e.address,
      hash: e.returnValues[hashName],
      block: e.blockNumber,
    }
    return acc
  }, {})
  return events
}

async function getInstanceEvents({ type, instance, startBlock, endBlock }) {
  const eventName = type === 'deposit' ? 'Deposit' : 'Withdrawal'

  const contract = new web3.eth.Contract(tornadoAbi, instance)
  const events = await contract.getPastEvents(eventName, {
    fromBlock: startBlock,
    toBlock: endBlock,
  })
  return events
}

async function getMiningEvents(startBlock, endBlock, type) {
  const eventName = type === 'deposit' ? 'DepositData' : 'WithdrawalData'
  const tornadoTrees = await getTornadoTrees()
  const events = await tornadoTrees.getPastEvents(eventName, {
    fromBlock: startBlock,
    toBlock: endBlock,
  })
  return events
    .sort((a, b) => a.returnValues.index - b.returnValues.index)
    .map((e) => poseidonHash([e.returnValues.instance, e.returnValues.hash, e.returnValues.block]))
}

async function getRegisteredEvents({ type }) {
  const method = type === 'deposit' ? 'getRegisteredDeposits' : 'getRegisteredWithdrawals'
  const tornadoTrees = await getTornadoTrees()
  const events = await tornadoTrees.methods[method]().call()
  return events
}

module.exports = {
  getTornadoEvents,
  getMiningEvents,
  getRegisteredEvents,
}
