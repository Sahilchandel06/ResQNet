const express = require('express')
const { ethers } = require('ethers')

const Counter = require('../models/Counter')
const SOS = require('../models/SOS')
const { analyzeSOS } = require('../services/aiService')
const { logSOSOnChain } = require('../services/blockchainService')

const router = express.Router()

const getNextSequenceId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { key: 'sos' },
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  )

  return counter.value
}

const resolveConsensus = async (sos) => {
  const volunteerStatus = sos.volunteerVerification?.status
  const adminStatus = sos.adminVerification?.status

  if (!volunteerStatus || !adminStatus) {
    return sos
  }

  if (volunteerStatus !== adminStatus) {
    sos.status = 'disputed'
    sos.finalStatus = 'disputed'
    await sos.save()
    return sos
  }

  sos.status = volunteerStatus
  sos.finalStatus = volunteerStatus

  if (sos.blockchain.logged) {
    await sos.save()
    return sos
  }

  const wallet = sos.assignedVolunteer?.wallet

  if (!wallet || !ethers.isAddress(wallet)) {
    sos.blockchain.lastError = 'Volunteer wallet is missing or invalid for on-chain logging.'
    await sos.save()
    return sos
  }

  const blockchainResult = await logSOSOnChain({
    id: sos.sequenceId,
    volunteerWallet: wallet,
    status: volunteerStatus,
  })

  sos.blockchain = {
    ...(sos.blockchain?.toObject?.() || sos.blockchain || {}),
    logged: blockchainResult.logged,
    txHash: blockchainResult.txHash || '',
    contractAddress: process.env.CONTRACT_ADDRESS || '',
    blockNumber: blockchainResult.blockNumber ?? null,
    chainId: blockchainResult.chainId ?? null,
    loggedAt: blockchainResult.loggedAt ? new Date(blockchainResult.loggedAt) : null,
    lastError: blockchainResult.reason || '',
  }

  await sos.save()
  return sos
}

const listSOSRequests = async (_req, res) => {
  try {
    const sosRequests = await SOS.find().sort({ createdAt: -1 })
    return res.json({ sosRequests })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch SOS requests.' })
  }
}

router.get('/', listSOSRequests)
router.get('/recent', async (_req, res) => {
  try {
    const sosRequests = await SOS.find().sort({ createdAt: -1 }).limit(5)
    return res.json({ sosRequests })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch SOS requests.' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { name, message, type } = req.body

    if (!name || !message || !type) {
      return res.status(400).json({ message: 'Name, message, and type are required.' })
    }

    const analysis = analyzeSOS({ message, type })
    const sequenceId = await getNextSequenceId()

    const sos = await SOS.create({
      sequenceId,
      name,
      message,
      type,
      priority: analysis.priority,
      suspicious: analysis.suspicious,
      analysisSummary: analysis.analysisSummary,
      status: 'pending',
      role: 'user',
      finalStatus: 'pending',
    })

    return res.status(201).json({
      message: 'SOS created successfully.',
      sos,
    })
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message })
    }

    return res.status(500).json({ message: 'Failed to create SOS request.' })
  }
})

router.put('/:id/assign', async (req, res) => {
  try {
    const { volunteerName, volunteerWallet } = req.body

    if (!volunteerName || !volunteerWallet) {
      return res.status(400).json({ message: 'Volunteer name and wallet are required.' })
    }

    if (!ethers.isAddress(volunteerWallet)) {
      return res.status(400).json({ message: 'A valid volunteer wallet address is required.' })
    }

    const sos = await SOS.findById(req.params.id)

    if (!sos) {
      return res.status(404).json({ message: 'SOS request not found.' })
    }

    sos.status = 'assigned'
    sos.assignedVolunteer = {
      name: volunteerName,
      wallet: volunteerWallet,
      assignedAt: new Date(),
    }

    await sos.save()

    return res.json({
      message: 'Volunteer assigned successfully.',
      sos,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to assign volunteer.' })
  }
})

router.put('/:id/volunteer-confirm', async (req, res) => {
  try {
    const { status, note, volunteerWallet } = req.body

    if (!['completed', 'fake'].includes(status)) {
      return res.status(400).json({ message: 'Volunteer status must be completed or fake.' })
    }

    const sos = await SOS.findById(req.params.id)

    if (!sos) {
      return res.status(404).json({ message: 'SOS request not found.' })
    }

    if (!sos.assignedVolunteer?.wallet) {
      return res.status(400).json({ message: 'Volunteer must be assigned before confirmation.' })
    }

    if (
      volunteerWallet &&
      sos.assignedVolunteer.wallet.toLowerCase() !== volunteerWallet.toLowerCase()
    ) {
      return res.status(403).json({ message: 'This task is assigned to a different volunteer wallet.' })
    }

    sos.volunteerVerification = {
      status,
      note: note || '',
      verifiedAt: new Date(),
    }
    await sos.save()

    const updatedSOS = await resolveConsensus(await SOS.findById(req.params.id))

    return res.json({
      message: 'Volunteer verification recorded.',
      sos: updatedSOS,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to record volunteer verification.' })
  }
})

router.put('/:id/admin-confirm', async (req, res) => {
  try {
    const { status, note } = req.body

    if (!['completed', 'fake'].includes(status)) {
      return res.status(400).json({ message: 'Admin status must be completed or fake.' })
    }

    const sos = await SOS.findById(req.params.id)

    if (!sos) {
      return res.status(404).json({ message: 'SOS request not found.' })
    }

    sos.adminVerification = {
      status,
      note: note || '',
      verifiedAt: new Date(),
    }
    await sos.save()

    const updatedSOS = await resolveConsensus(await SOS.findById(req.params.id))

    return res.json({
      message: 'Admin verification recorded.',
      sos: updatedSOS,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to record admin verification.' })
  }
})

module.exports = {
  router,
  listSOSRequests,
}
