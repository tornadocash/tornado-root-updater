const { getTornadoTrees, getProvider } = require('./singletons')
const { action } = require('./utils')
const ethers = require('ethers')
const abi = new ethers.utils.AbiCoder()
// const fs = require('fs')
const { poseidonHash, toFixedHex } = require('./utils')

async function getTornadoTreesEvents(type, fromBlock, toBlock) {
  let events = []

  const NUMBER_PARTS = 50
  const part = Math.floor((toBlock - fromBlock) / NUMBER_PARTS)
  const eventName = type === action.DEPOSIT ? 'DepositData' : 'WithdrawalData'

  fromBlock = Number(fromBlock)
  toBlock = Number(fromBlock) + part

  for (let i = 0; i <= NUMBER_PARTS; i++) {
    const newEvents = await getProvider().getLogs({
      address: getTornadoTrees().address,
      topics: getTornadoTrees().filters[eventName]().topics,
      fromBlock,
      toBlock,
    })
    events = events.concat(newEvents)
    fromBlock = toBlock
    toBlock += part
  }

  return events
    .map((e) => {
      const { instance, hash, block, index } = getTornadoTrees().interface.parseLog(e).args
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

async function getMigrationEvents(type) {
  const committedMethod = type === action.DEPOSIT ? 'lastProcessedDepositLeaf' : 'lastProcessedWithdrawalLeaf'
  const committedCount = await getTornadoTrees()[committedMethod]()

  const pendingFile = type === action.DEPOSIT ? 'pendingDeposits' : 'pendingWithdrawals'
  const pendingEvents = require(`../cache/${pendingFile}.json`)

  const committedFile = type === action.DEPOSIT ? 'committedDeposits' : 'committedWithdrawals'
  const committedEvents = require(`../cache/${committedFile}.json`)

  const latestBlock = await getProvider().getBlock()
  const fromBlock = process.env.NET_ID === 1 ? 12143762 : 4446831
  const newTreeEvents = await getTornadoTreesEvents(type, fromBlock, latestBlock.number)

  let allEvents = committedEvents.concat(pendingEvents)
  const filter = new Set(allEvents.map((a) => a.sha3))
  allEvents = allEvents.concat(newTreeEvents.filter((a) => !filter.has(a.sha3)))
  allEvents = allEvents.map((e) => ({
    ...e,
    poseidon: toFixedHex(poseidonHash([e.instance, e.hash, e.block])),
  }))
  // it can be useful to get all necessary events for claiming AP
  // fs.writeFileSync(`./cache/${type}.json`, JSON.stringify(allEvents, null, 2))
  return {
    committedEvents: allEvents.slice(0, committedCount.toNumber()),
    pendingEvents: allEvents.slice(committedCount.toNumber()),
  }
}

module.exports = {
  getMigrationEvents,
}
