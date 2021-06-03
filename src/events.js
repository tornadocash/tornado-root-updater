const ethers = require('ethers')
const { aggregate } = require('@makerdao/multicall')

const { action } = require('./utils')
const { multicallAddress, rpcUrl, netId } = require('./config')
const { getTornadoTrees, redis, getProvider } = require('./singletons')

const abi = new ethers.utils.AbiCoder()

async function getTornadoTreesEvents(type, fromBlock) {
  const eventName = type === action.DEPOSIT ? 'DepositData' : 'WithdrawalData'
  const events = await getProvider().getLogs({
    address: getTornadoTrees().address,
    topics: getTornadoTrees().filters[eventName]().topics,
    fromBlock,
    toBlock: 'latest',
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

async function getEventsWithCache(type) {
  const cachedEvents = require(`../cache/${type}_${netId}.json`)

  const lastBlock = cachedEvents.slice(-1)[0].block + 1

  const newEvents = await getTornadoTreesEvents(type, lastBlock)

  return cachedEvents.concat(newEvents)
}

async function getPendingEventHashes(type, from, to) {
  try {
    const calls = []
    const target = (await getTornadoTrees()).address
    const method = type === action.DEPOSIT ? 'deposits' : 'withdrawals'
    for (let i = from; i < to; i++) {
      calls.push({
        target,
        call: [`${method}(uint256)(bytes32)`, i],
        returns: [[i]],
      })
    }
    const result = await aggregate(calls, { multicallAddress, rpcUrl })
    return Object.values(result.results.original)
  } catch (e) {
    console.error('getPendingEventHashes', e)
    process.exit(1)
  }
}

async function getEvents(type) {
  const committedMethod = type === action.DEPOSIT ? 'lastProcessedDepositLeaf' : 'lastProcessedWithdrawalLeaf'
  const committedCount = (await getTornadoTrees()[committedMethod]()).toNumber()

  const pendingLengthMethod = type === action.DEPOSIT ? 'depositsLength' : 'withdrawalsLength'
  const pendingLength = (await getTornadoTrees()[pendingLengthMethod]()).toNumber()

  const pendingEventHashes = await getPendingEventHashes(type, committedCount, pendingLength)

  const events = await getEventsWithCache(type)

  const committedEvents = events.slice(0, committedCount)
  const pendingEvents = pendingEventHashes.map((e) => events.find((a) => a.sha3 === e))

  if (pendingEvents.some((e) => e === undefined)) {
    pendingEvents.forEach((e, i) => {
      if (e === undefined) {
        console.log('Unknown event', pendingEventHashes[i])
      }
    })
    throw new Error(`Tree contract expects unknown tornado event: ${type}`)
  }

  return {
    committedEvents,
    pendingEvents,
  }
}

module.exports = {
  getEvents,
}
