require('dotenv').config()
const { getTornadoTrees, txManager, getProvider } = require('./singletons')
const { action, getExplorer, poseidonHash, poseidonHash2, toFixedHex } = require('./utils')
const ethers = require('ethers')
const BigNumber = ethers.BigNumber
const { parseUnits } = ethers.utils
const tornadoTrees = require('tornado-trees')
const MerkleTree = require('fixed-merkle-tree')

const { INSERT_BATCH_SIZE, GAS_PRICE } = process.env

async function updateTree(committedEvents, pendingEvents, type) {
  const netId = (await getProvider().getNetwork()).chainId
  const leaves = committedEvents.map((e) => poseidonHash([e.instance, e.hash, e.block]))
  const tree = new MerkleTree(20, leaves, { hashFunction: poseidonHash2 })
  const rootMethod = type === action.DEPOSIT ? 'depositRoot' : 'withdrawalRoot'
  const root = toFixedHex(await getTornadoTrees()[rootMethod]())
  if (!BigNumber.from(root).eq(tree.root())) {
    throw new Error(`Invalid ${type} root! Contract: ${BigNumber.from(root).toHexString()}, local: ${tree.root().toHexString()}`)
  }
  while (pendingEvents.length >= INSERT_BATCH_SIZE) {
    const chunk = pendingEvents.splice(0, INSERT_BATCH_SIZE)

    console.log('Generating snark proof')
    const { input, args } = tornadoTrees.batchTreeUpdate(tree, chunk)
    const proof = await tornadoTrees.prove(input, './snarks/BatchTreeUpdate')

    console.log('Sending update tx')
    const method = type === action.DEPOSIT ? 'updateDepositTree' : 'updateWithdrawalTree'
    const txData = await getTornadoTrees().populateTransaction[method](proof, ...args, { gasPrice: parseUnits(GAS_PRICE, 'gwei') })
    const tx = txManager.createTx(txData)

    const receiptPromise = tx
      .send()
      .on('transactionHash', (hash) => console.log(`Transaction: ${getExplorer(netId)}/tx/${hash}`))
      .on('mined', (receipt) => console.log('Mined in block', receipt.blockNumber))
      .on('confirmations', (n) => console.log(`Got ${n} confirmations`))

    await receiptPromise // todo optional
  }
}

module.exports = {
  updateTree,
}
