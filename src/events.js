const { getTornadoTrees, getProvider } = require('./singletons')
const { action } = require('./utils')
const ethers = require('ethers')
const abi = new ethers.utils.AbiCoder()

async function getTornadoTreesEvents(type, fromBlock, toBlock) {
  const eventName = type === action.DEPOSIT ? 'DepositData' : 'WithdrawalData'
  const events = await getProvider().getLogs({
    address: getTornadoTrees().address,
    topics: getTornadoTrees().filters[eventName]().topics,
    fromBlock,
    toBlock,
  })
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

  const newTreeEvents = await getTornadoTreesEvents(type, 0, 'latest')

  let allEvents = committedEvents.concat(pendingEvents)
  const filter = new Set(allEvents.map(a => a.sha3))
  allEvents = allEvents.concat(newTreeEvents.filter(a => !filter.has(a.sha3)))
  return {
    committedEvents: allEvents.slice(0, committedCount.toNumber()),
    pendingEvents: allEvents.slice(committedCount.toNumber()),
  }
}

module.exports = {
  getMigrationEvents,
}
