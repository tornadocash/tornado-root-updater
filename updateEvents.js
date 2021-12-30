const fs = require('fs')
const Web3 = require('web3')
const ethers = require('ethers')
const { toFixedHex, poseidonHash } = require('./src/utils')

const MAIN_NET_RPC_URL = 'https://mainnet.infura.io/v3/8f786b96d16046b78e0287fa61c6fcf8'
const GOERLI_RPC_URL = 'https://goerli.infura.io/v3/8f786b96d16046b78e0287fa61c6fcf8'

const TornadoTree1 = '0x527653eA119F3E6a1F5BD18fbF4714081D7B31ce'
const TornadoTree5 = '0x722122df12d4e14e13ac3b6895a86e84145b6967'

const TornadoTreesABI = require('./abi/tornadoTrees.json')

const abi = new ethers.utils.AbiCoder()

function getWeb3(netId) {
  const rpc = Number(netId) === 1 ? MAIN_NET_RPC_URL : GOERLI_RPC_URL
  const provider = new Web3.providers.HttpProvider(rpc)
  const web3 = new Web3(provider)

  return web3
}

const types = ['withdrawal', 'deposit']

async function saveFarmingEvents(netId) {
  const web3 = getWeb3(netId)
  const contractAddress = Number(netId) === 1 ? TornadoTree1 : TornadoTree5
  const contract = new web3.eth.Contract(TornadoTreesABI, contractAddress)

  const currentBlockNumber = await web3.eth.getBlockNumber()

  for (const type of types) {
    let events = []

    const cachedEvents = require(`./cache/${type}_${netId}.json`)
    console.log('cachedEvents', cachedEvents.length)

    const [lastEvent] = cachedEvents.slice(-1)

    const startBlock = lastEvent.block + 1

    const NUMBER_PARTS = 20
    const part = parseInt((currentBlockNumber - startBlock) / NUMBER_PARTS)

    let fromBlock = startBlock
    let toBlock = startBlock + part

    const method = type === 'withdrawal' ? 'WithdrawalData' : 'DepositData'

    for (let i = 0; i <= NUMBER_PARTS; i++) {
      const partOfEvents = await contract.getPastEvents(method, {
        toBlock,
        fromBlock,
      })
      if (partOfEvents) {
        events = events.concat(partOfEvents)
      }
      fromBlock = toBlock
      toBlock += part
    }
    console.log('events', type, netId, events.length)

    events = events.map(({ returnValues }) => {
      const { instance, hash, block, index } = returnValues

      const instance1 = toFixedHex(instance, 20)
      const hash1 = toFixedHex(hash)

      const encodedData = abi.encode(['address', 'bytes32', 'uint256'], [instance1, hash1, block])

      return {
        hash: hash1,
        instance: instance1,
        block: Number(block),
        index: Number(index),
        sha3: ethers.utils.keccak256(encodedData),
        poseidon: toFixedHex(poseidonHash([instance1, hash1, block])),
      }
    })

    const file = `./cache/${type}_${netId}.json`

    const eventsJson = JSON.stringify(cachedEvents.concat(events), null, 2) + '\n'
    fs.writeFileSync(file, eventsJson)
  }
}

async function main() {
  const NETWORKS = [1]

  for await (const netId of NETWORKS) {
    await saveFarmingEvents(netId)
  }
}

main()
