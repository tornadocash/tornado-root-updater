const ethers = require('ethers')
const { aggregate } = require('@makerdao/multicall')

const { action } = require('./utils')
const { multicallAddress, rpcUrl, netId } = require('./config')
const { getTornadoTrees, redis, getProvider } = require('./singletons')

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

async function getEventsWithCache(type) {
  const currentBlock = await getProvider().getBlockNumber()
  let lastBlock = Number((await redis.get(`${type}LastBlock`)) || 0) + 1

  let cachedEvents = (await redis.lrange(type, 0, -1)).map((e) => JSON.parse(e))

  if (cachedEvents.length === 0) {
    cachedEvents = require(`../cache/${type}_${netId}.json`)

    cachedEvents = cachedEvents.map(({ instance, poseidon, hash, block, index }) => {
      const encodedData = abi.encode(['address', 'bytes32', 'uint256'], [instance, hash, block])
      return {
        hash,
        poseidon,
        instance,
        block: Number(block),
        index: Number(index),
        sha3: ethers.utils.keccak256(encodedData),
      }
    })

    if (cachedEvents.length > 0) {
      lastBlock = cachedEvents.slice(-1)[0].block + 1
      await redis.rpush(
        type,
        cachedEvents.map((e) => JSON.stringify(e)),
      )
    }
  }
  const newEvents = await getTornadoTreesEvents(type, lastBlock, currentBlock)
  if (newEvents.length > 0) {
    await redis.rpush(
      type,
      newEvents.map((e) => JSON.stringify(e)),
    )
  }
  await redis.set(`${type}LastBlock`, currentBlock)
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

  const cachedPendingEvents = events.slice(committedCount)
  const pendingEvents = [].concat(cachedPendingEvents.map(e => e.sha3), pendingEventHashes).map((e) => events.find((a) => a.sha3 === e))

  return {
    committedEvents,
    pendingEvents,
  }
}

module.exports = {
  getEvents,
}
