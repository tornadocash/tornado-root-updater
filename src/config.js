require('dotenv').config()

module.exports = {
  netId: Number(process.env.NET_ID) || 1,
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  rpcUrl: process.env.HTTP_RPC_URL,
  wsRpcUrl: process.env.WS_RPC_URL,
  privateKey: process.env.PRIVATE_KEY,
  confirmations: process.env.CONFIRMATION_BLOCKS,
  maxGasPrice: process.env.GAS_PRICE,
  treesContract: process.env.TORNADO_TREES,
  broadcastNodes: process.env.BROADCAST_NODES ? process.env.BROADCAST_NODES.split(',') : undefined,
  multicallAddress: process.env.MULTICALL_ADDRESS || '0xeefba1e63905ef1d7acba5a8513c70307c1ce441',
  port: process.env.APP_PORT || 8000,
  insertBatchSize: process.env.INSERT_BATCH_SIZE,
  gasPrice: process.env.GAS_PRICE,
}
