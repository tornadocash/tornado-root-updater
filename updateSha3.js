const fs = require('fs')
const ethers = require('ethers')

const abi = new ethers.utils.AbiCoder()

function updateDeposit(type, netId) {
  const events = require(`./cache/${type}_${netId}.json`)

  const parsedEvents = events.map(({ instance, poseidon, hash, block, index }) => {
    const encodedData = abi.encode(['address', 'bytes32', 'uint256'], [instance, hash, block])
    return {
      hash,
      poseidon,
      instance,
      block: Number(block),
      index: Number(index),
      sha3: ethers.utils.keccak256(encodedData),
    }
  })

  const eventsJson = JSON.stringify(parsedEvents, null, 2) + '\n'
  fs.writeFileSync(`./cache/${type}_${netId}.json`, eventsJson)
}

function main() {
  const TYPES = ['deposit', 'withdrawal']
  const NET_ID = [1, 5]

  for (const type of TYPES) {
    for (const id of NET_ID) {
      updateDeposit(type, id)
    }
  }
}

main()
