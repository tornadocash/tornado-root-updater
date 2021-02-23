require('dotenv').config()
const cron = require('cron')
const { getMigrationEvents } = require('./events')
const { updateTree } = require('./update')
const { MIGRATION_TYPE } = process.env

async function main() {
  const type = MIGRATION_TYPE
  const { committedEvents, pendingEvents } = await getMigrationEvents(type)
  console.log(`There are ${pendingEvents.length} unprocessed ${type}s`)
  await updateTree(committedEvents, pendingEvents, type)
  console.log('Done')
}

cron.job(process.env.CRON_EXPRESSION, main, null, true, null, null, true)
