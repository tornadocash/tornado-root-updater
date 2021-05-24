const { action } = require('./utils')
const { getEvents } = require('./events')
const { updateTree } = require('./update')
const { redis, getProviderWs } = require('./singletons')

let provider = getProviderWs()

let isActive = false

async function processNewBlock(block) {
  console.log('processNewEvent', block)

  if (block) {
    // TODO check event length
    // what if updateRedis takes more than 15 sec?

    console.log('isActive', isActive)

    if (!isActive) {
      await updateRedis()
    }
  }
}

async function updateRedis() {
  isActive = true

  try {
    for (const type of Object.values(action)) {
      const { committedEvents, pendingEvents } = await getEvents(type)
      console.log(`There are ${pendingEvents.length} unprocessed ${type}s`)

      const txData  = await updateTree(committedEvents, pendingEvents, type)
      console.log('updateRedis:data', type, JSON.stringify(txData.data))

      await redis.set(`${type}:data`, txData)
    }
    isActive = false
  } catch (err) {
    console.log('err', err.message)
    isActive = false
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

init()

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection', error)
  process.exit(1)
})
