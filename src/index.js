require('dotenv').config()
const cron = require('cron')
const { getEvents } = require('./events')
const { updateTree } = require('./update')
const { action } = require('./utils')

async function main() {
  // todo retry
  for (const type of Object.values(action)) {
    const { committedEvents, pendingEvents } = await getEvents(type)
    console.log(`There are ${pendingEvents.length} unprocessed ${type}s`)
    await updateTree(committedEvents, pendingEvents, type)
  }
  console.log('Done')
}

cron.job(process.env.CRON_EXPRESSION, main, null, true, null, null, true)
