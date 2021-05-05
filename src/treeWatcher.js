const { action } = require('./utils')
const { getEvents } = require('./events')
const { updateTree } = require('./update')
const { redis, getProviderWs } = require('./singletons')

let provider = getProviderWs()

async function processNewBlock(block) {
  console.log('processNewEvent', block)

  if (block) {
    // TODO check event length
    // what if updateRedis takes more than 15 sec?
    await updateRedis()
  }
}

async function updateRedis() {
  for (const type of Object.values(action)) {
    const { committedEvents, pendingEvents } = await getEvents(type)
    console.log(`There are ${pendingEvents.length} unprocessed ${type}s`)

    const txData  = await updateTree(committedEvents, pendingEvents, type)
    console.log('txData', txData)

    await redis.set(`${type}:data`, txData)
  }
}

async function rebuild() {
  await provider.removeAllListeners()
  setTimeout(init, 3000)
}

async function init() {
  try {
    provider.on('block', processNewBlock)

    await updateRedis()
  } catch (e) {
    await rebuild()
    console.error('error on init treeWatcher', e.message)
  }
}

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection', error)
  process.exit(1)
})
