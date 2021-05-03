const ethers = require('ethers')
const { toBN } = require('web3-utils')
const MerkleTree = require('fixed-merkle-tree')

const { redis } = require('./singletons')
const { getEvents } = require('./events')
const { updateTree } = require('./update')
const { poseidonHash2, action } = require('./utils')
const { wsRpcUrl, minerMerkleTreeHeight, torn } = require('./config')

const provider = new ethers.providers.WebSocketProvider(wsRpcUrl)

const MinerABI = require('../abis/mining.abi.json')

let contract
let tree, eventSubscription, blockSubscription


async function processNewEvent(err, event) {
  if (err) {
    throw new Error(`Event handler error: ${err}`)
  }

  const { commitment, index } = event.returnValues
  if (tree.elements().length === Number(index)) {
    tree.insert(toBN(commitment))
    await updateRedis()
  } else if (tree.elements().length === Number(index) + 1) {
    console.log('Replacing element', index)
    tree.update(index, toBN(commitment))
    await updateRedis()
  } else {
    console.log(`Invalid element index ${index}, rebuilding tree`)
    await rebuild()
  }
}

async function processNewBlock(err) {
  if (err) {
    throw new Error(`Event handler error: ${err}`)
    // console.error(err)
    // return
  }
  // what if updateRedis takes more than 15 sec?
  await updateRedis()
}

async function updateRedis() {
  const rootOnContract = await contract.methods.getLastAccountRoot().call()
  if (!tree.root().eq(toBN(rootOnContract))) {
    console.log(`Invalid tree root: ${tree.root()} != ${toBN(rootOnContract)}, rebuilding tree`)
    await rebuild()
    return
  }
  const rootInRedis = await redis.get('tree:root')
  if (!rootInRedis || !tree.root().eq(toBN(rootInRedis))) {
    const serializedTree = JSON.stringify(tree.serialize())
    await redis.set('tree:elements', serializedTree)
    await redis.set('tree:root', tree.root().toString())
    await redis.publish('treeUpdate', tree.root().toString())
    console.log('Updated tree in redis, new root:', tree.root().toString())
  } else {
    console.log('Tree in redis is up to date, skipping update')
  }
}

async function rebuild() {
  await contract.removeAllListeners()
  setTimeout(init, 3000)
}

async function init() {
  try {
    for (const type of Object.values(action)) {
      const { committedEvents, pendingEvents } = await getEvents(type)
      console.log(`There are ${pendingEvents.length} unprocessed ${type}s`)
      const txData  = await updateTree(committedEvents, pendingEvents, type)
    }

    eventSubscription = contract.on('NewAccount', { fromBlock: block + 1 }, processNewEvent)
    blockSubscription = web3.eth.subscribe('newBlockHeaders', processNewBlock)

    await updateRedis()
  } catch (e) {
    console.error('error on init treeWatcher', e.message)
  }
}

init()

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection', error)
  process.exit(1)
})
