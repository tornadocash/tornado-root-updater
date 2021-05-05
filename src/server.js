const express = require('express')

const { version } = require('../package.json')

const { port } = require('./config')
const controller = require('./controller')

const app = express()
app.use(express.json())

// Add CORS headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

// Log error to console but don't send it to the client to avoid leaking data
app.use((err, req, res, next) => {
  if (err) {
    console.error(err)
    return res.sendStatus(500)
  }
  next()
})

app.get('/deposit', controller.getDepositsCallData)
app.get('/withdrawal', controller.getWithdrawalsCallData)

app.listen(port)
console.log(`Relayer ${version} started on port ${port}`)
