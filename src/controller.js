const { redis } = require('./singletons')

async function getWithdrawalsCallData(req, res) {
  const callData = await redis.hgetall('withdrawal:data')
  console.log('withdrawal:callData', callData)

  return res.json(callData)
}

async function getDepositsCallData(req, res) {
  const callData = await redis.hgetall('deposit:data')
  console.log('deposit:callData', callData)

  return res.json(callData)
}

function test(req, res) {
  const callData = 'test 123'
  console.log('deposit:callData', callData)

  return res.json({ callData })
}

module.exports = {
  test,
  getWithdrawalsCallData,
  getDepositsCallData,
}
