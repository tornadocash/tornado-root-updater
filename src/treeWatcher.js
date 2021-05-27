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
    if (!isActive) {
      await updateRedis()
    }
  }
}

async function updateRedis() {
  isActive = true

  for (const type of Object.values(action)) {
    try {
      const countEventCache = await redis.get(`${type}pendingEvent`)

      const { committedEvents, pendingEvents } = await getEvents(type)
      console.log(`There are ${pendingEvents.length} unprocessed ${type}s`)

      const countEvent = String(pendingEvents.length)

      if (pendingEvents && countEventCache === countEvent) {
        continue
      }

      const txData  = await updateTree(committedEvents, pendingEvents, type)
      console.log('updateRedis:data', type, txData)

      if (txData) {
        console.log('set countEvent', type, countEvent)
        await redis.hset(`${type}pendingEvent`, countEvent)
        await redis.hset(`${type}:data`, txData)
      }
    } catch {
      continue
    }
  }
  isActive = false
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
