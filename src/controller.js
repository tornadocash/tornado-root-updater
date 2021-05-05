const { redis } = require('./singletons')

async function getWithdrawalsCallData(req, res) {
  const callData = await redis.get('withdrawal:data')
  console.log('withdrawal:callData', callData)

  return res.json({ callData })
}

async function getDepositsCallData(req, res) {
  const callData = await redis.get('deposit:data')
  console.log('deposit:callData', callData)

  return res.json({ callData })
}

module.exports = {
  getWithdrawalsCallData,
  getDepositsCallData,
}
