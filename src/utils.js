const { BigNumber } = require('ethers')
const { poseidon } = require('circomlib')

/** BigNumber to hex string of specified length */
const toFixedHex = (number, length = 32) =>
  '0x' +
  (number instanceof Buffer
    ? number.toString('hex')
    : BigNumber.from(number).toHexString().slice(2)
  ).padStart(length * 2, '0')

const poseidonHash = (items) => BigNumber.from(poseidon(items))
const poseidonHash2 = (a, b) => poseidonHash([a, b])

const action = Object.freeze({ DEPOSIT: 'deposit', WITHDRAWAL: 'withdrawal' })

const prefix = {
  1: '',
  5: 'goerli.',
  42: 'kovan.',
}

const getExplorer = (netId) => `https://${prefix[netId]}etherscan.io`

module.exports = {
  toFixedHex,
  poseidonHash,
  poseidonHash2,
  getExplorer,
  action,
}
