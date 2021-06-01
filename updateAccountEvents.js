const fs = require('fs')
const Web3 = require('web3')
const { Utils } = require('tornado-anonymity-mining')
const networkConfig = require('./networkConfig.json')
const MAIN_NET_RPC_URL = networkConfig.netId1.rpcUrls.Infura.url
const GOERLI_RPC_URL = 'https://goerli.infura.io/v3/8f786b96d16046b78e0287fa61c6fcf8'

const ABI = require('./abis/TornadoProxy.abi.json')
const FarmerABI = require('./abis/Farmer.abi.json')
const TornadoTreesABI = require('./abis/TornadoTrees.abi.json')

function getWeb3(netId) {
  const rpc = Number(netId) === 1 ? MAIN_NET_RPC_URL : GOERLI_RPC_URL
  const provider = new Web3.providers.HttpProvider(rpc)
  const web3 = new Web3(provider)

  return web3
}

const types = ['WithdrawalData', 'DepositData']

async function loadCachedEvents({ type, netId }) {
  try {
    const module = await import(`./store/events/${type}s_farmer_${netId}.json`)

    if (module) {
      const events = module.default

      return {
        events,
        lastBlock: events[events.length - 1].block
      }
    }
  } catch (err) {
    throw new Error(`Method loadCachedEvents has error: ${err.message}`)
  }
}

async function saveFarmingEvents(netId) {
  const web3 = getWeb3(netId)
  const contract = new web3.eth.Contract(TornadoTreesABI, '0x527653eA119F3E6a1F5BD18fbF4714081D7B31ce')

  const currentBlockNumber = await web3.eth.getBlockNumber()

  for (const type of types) {
    let events = []

    const typeEvent = type === 'WithdrawalData' ? 'withdrawal' : 'deposit'

    const cachedEvents = await loadCachedEvents({ type: typeEvent, netId })
    console.log('cachedEvents', cachedEvents)

    const startBlock = cachedEvents.lastBlock + 1

    const NUMBER_PARTS = 20
    const part = parseInt((currentBlockNumber - startBlock) / NUMBER_PARTS)

    let fromBlock = startBlock
    let toBlock = startBlock + part

    for (let i = 0; i <= NUMBER_PARTS; i++) {
      const partOfEvents = await contract.getPastEvents(type, {
        toBlock,
        fromBlock
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

      return {
        block: Number(block),
        index: Number(index),
        hash: Utils.toFixedHex(hash),
        instance: Utils.toFixedHex(instance, 20),
        poseidon: Utils.toFixedHex(Utils.poseidonHash([instance, hash, block]))
      }
    })

    const name = type === 'WithdrawalData' ? 'withdrawals' : 'deposits'

    const eventsJson = JSON.stringify(cachedEvents.events.concat(events), null, 2) + '\n'
    fs.writeFileSync(`./store/events/${name}_farmer_${netId}.json`, eventsJson)
  }
}

async function main() {
  const NETWORKS = [1, 5]

  for await (const netId of NETWORKS) {
    await saveFarmingEvents(netId)
  }
}

main()
