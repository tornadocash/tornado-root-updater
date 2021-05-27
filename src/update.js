require('dotenv').config()

const { BigNumber } = require('ethers')
const tornadoTrees = require('tornado-trees')
const MerkleTree = require('fixed-merkle-tree')

const { insertBatchSize } = require('./config')
const { getTornadoTrees } = require('./singletons')
const { action, poseidonHash, poseidonHash2, toFixedHex } = require('./utils')

async function updateTree(committedEvents, pendingEvents, type) {
  const leaves = committedEvents.map((e) => poseidonHash([e.instance, e.hash, e.block]))
  const tree = new MerkleTree(20, leaves, { hashFunction: poseidonHash2 })
  const rootMethod = type === action.DEPOSIT ? 'depositRoot' : 'withdrawalRoot'
  const root = toFixedHex(await getTornadoTrees()[rootMethod]())

  if (!BigNumber.from(root).eq(tree.root())) {
    throw new Error(`Invalid ${type} root! Contract: ${BigNumber.from(root).toHexString()}, local: ${tree.root().toHexString()}`)
  }

  try {
    if (pendingEvents.length >= insertBatchSize) {
      const chunk = pendingEvents.splice(0, insertBatchSize)

      console.log('Generating snark proof')
      const { input, args } = tornadoTrees.batchTreeUpdate(tree, chunk)
      const proof = await tornadoTrees.prove(input, './snarks/BatchTreeUpdate')

      const method = type === action.DEPOSIT ? 'updateDepositTree' : 'updateWithdrawalTree'

      const [argsHash, oldRoot, newRoot, pathIndices, events] = args

      const txData = getTornadoTrees().interface.encodeFunctionData(`${method}`, [proof, argsHash, oldRoot, newRoot, pathIndices, events])

      return txData
    }
  } catch (err) {
    console.log('err', err.message)
  }
}

module.exports = {
  updateTree,
}
