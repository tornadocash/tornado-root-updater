const { bigInt } = require('snarkjs')
const { poseidon } = require('circomlib')

/** BigNumber to hex string of specified length */
const toFixedHex = (number, length = 32) =>
  '0x' +
  (number instanceof Buffer ? number.toString('hex') : bigInt(number).toString(16)).padStart(length * 2, '0')

const poseidonHash = (items) => toFixedHex(poseidon(items))
const poseidonHash2 = (a, b) => poseidonHash([a, b])

module.exports = {
  toFixedHex,
  poseidonHash,
  poseidonHash2,
}
