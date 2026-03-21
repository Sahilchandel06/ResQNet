const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')
const mongoose = require('mongoose')

const connectDB = require('./config/db')
const {
  getReputation,
  getSOSRecord,
  hasBlockchainConfig,
  getProtocolStatus,
} = require('./services/blockchainService')
const { router: sosRoutes, listSOSRequests } = require('./routes/sosRoutes')

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

app.use(
  cors({
    origin: [
      process.env.CLIENT_URL || 'http://localhost:5173',
      'http://localhost:3000',
    ],
  }),
)
app.use(express.json())

app.use('/api/sos', sosRoutes)
app.get('/api/sos', listSOSRequests)

app.get('/api/health', (_req, res) => {
  const connectionState = mongoose.connection.readyState
  const isConnected = connectionState === 1

  res.json({
    app: 'ResQNet API',
    message: isConnected
      ? 'Backend is live and MongoDB is connected.'
      : 'Backend is live. MongoDB is not connected yet.',
    database: {
      connected: isConnected,
      readyState: connectionState,
      name: mongoose.connection.name || null,
    },
    blockchain: {
      configured: hasBlockchainConfig(),
      contractAddress: process.env.CONTRACT_ADDRESS || null,
    },
    timestamp: new Date().toISOString(),
  })
})

app.get('/api/web3/status', async (_req, res) => {
  const protocolStatus = await getProtocolStatus()

  res.json({
    ...protocolStatus,
    configured: hasBlockchainConfig(),
    rpcUrl: process.env.RPC_URL || '',
  })
})

app.get('/api/web3/reputation/:wallet', async (req, res) => {
  const result = await getReputation(req.params.wallet)
  res.json(result)
})

app.get('/api/web3/sos/:id', async (req, res) => {
  const result = await getSOSRecord(Number(req.params.id))
  res.json(result)
})

app.get('/', (_req, res) => {
  res.json({
    message: 'ResQNet backend is running.',
  })
})

const startServer = async () => {
  await connectDB()

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
}

startServer()
