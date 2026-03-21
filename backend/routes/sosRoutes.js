const express = require('express')
const { ethers } = require('ethers')

const Counter = require('../models/Counter')
const SOS = require('../models/SOS')
const { analyzeSOS } = require('../services/aiService')
const {
  createSOSOnChain,
  assignVolunteerOnChain,
  volunteerReportOnChain,
  finalizeSOSOnChain,
} = require('../services/blockchainService')

const router = express.Router()

const getNextSequenceId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { key: 'sos' },
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  )

  return counter.value
}

const mergeBlockchainState = (sos, updates) => ({
  ...(sos.blockchain?.toObject?.() || sos.blockchain || {}),
  ...updates,
})

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
    const { name, message, type, reporterWallet } = req.body

    if (!name || !message || !type) {
      return res.status(400).json({ message: 'Name, message, and type are required.' })
    }

    const normalizedReporterWallet =
      reporterWallet && ethers.isAddress(reporterWallet) ? reporterWallet : ethers.ZeroAddress

    const analysis = analyzeSOS({ message, type })
    const sequenceId = await getNextSequenceId()

    const chainResult = await createSOSOnChain({
      sosId: sequenceId,
      reporterName: name,
      reporterWallet: normalizedReporterWallet,
      message,
      emergencyType: type,
      priority: analysis.priority,
      suspicious: analysis.suspicious,
    })

    if (!chainResult.logged) {
      return res.status(502).json({ message: chainResult.reason })
    }

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
      blockchain: {
        createdLogged: true,
        assignedLogged: false,
        volunteerReportedLogged: false,
        completedLogged: false,
        createdTxHash: chainResult.txHash,
        assignedTxHash: '',
        volunteerReportedTxHash: '',
        completedTxHash: '',
        contractAddress: process.env.CONTRACT_ADDRESS || '',
        createBlockNumber: chainResult.blockNumber ?? null,
        assignBlockNumber: null,
        volunteerReportedBlockNumber: null,
        completeBlockNumber: null,
        chainId: chainResult.chainId ?? null,
        lastError: '',
      },
    })

    return res.status(201).json({
      message: 'SOS created successfully and stored on blockchain.',
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
    const { volunteerName, volunteerWallet, assignedBy } = req.body

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

    const chainResult = await assignVolunteerOnChain({
      sosId: sos.sequenceId,
      volunteerName,
      assignedBy: assignedBy || 'Admin',
      volunteerWallet,
    })

    if (!chainResult.logged) {
      return res.status(502).json({ message: chainResult.reason })
    }

    sos.status = 'assigned'
    sos.assignedVolunteer = {
      name: volunteerName,
      wallet: volunteerWallet,
      assignedAt: new Date(),
    }
    sos.blockchain = mergeBlockchainState(sos, {
      assignedLogged: true,
      assignedTxHash: chainResult.txHash,
      assignBlockNumber: chainResult.blockNumber ?? null,
      chainId: chainResult.chainId ?? sos.blockchain?.chainId ?? null,
      contractAddress: process.env.CONTRACT_ADDRESS || '',
      lastError: '',
    })

    await sos.save()

    return res.json({
      message: 'Volunteer assigned and written to blockchain.',
      sos,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to assign volunteer.' })
  }
})

const handleVolunteerReport = async (req, res) => {
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
      return res.status(400).json({ message: 'Volunteer must be assigned before reporting completion.' })
    }

    if (
      volunteerWallet &&
      sos.assignedVolunteer.wallet.toLowerCase() !== volunteerWallet.toLowerCase()
    ) {
      return res.status(403).json({ message: 'This task is assigned to a different volunteer wallet.' })
    }

    const chainResult = await volunteerReportOnChain({
      sosId: sos.sequenceId,
      status,
      volunteerNote: note || '',
    })

    if (!chainResult.logged) {
      return res.status(502).json({ message: chainResult.reason })
    }

    sos.volunteerVerification = {
      status,
      note: note || '',
      verifiedAt: new Date(),
    }
    sos.status = status === 'completed' ? 'volunteer_completed' : 'volunteer_fake'
    sos.finalStatus = 'pending'
    sos.blockchain = mergeBlockchainState(sos, {
      volunteerReportedLogged: true,
      volunteerReportedTxHash: chainResult.txHash,
      volunteerReportedBlockNumber: chainResult.blockNumber ?? null,
      chainId: chainResult.chainId ?? sos.blockchain?.chainId ?? null,
      contractAddress: process.env.CONTRACT_ADDRESS || '',
      lastError: '',
    })

    await sos.save()

    return res.json({
      message: 'Volunteer report recorded on blockchain. Awaiting admin final confirmation.',
      sos,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to record volunteer report.' })
  }
}

router.put('/:id/complete', handleVolunteerReport)
router.put('/:id/volunteer-confirm', handleVolunteerReport)

router.put('/:id/admin-confirm', async (req, res) => {
  try {
    const { status, note, finalizedBy } = req.body

    if (!['completed', 'fake'].includes(status)) {
      return res.status(400).json({ message: 'Admin final status must be completed or fake.' })
    }

    const sos = await SOS.findById(req.params.id)
    if (!sos) {
      return res.status(404).json({ message: 'SOS request not found.' })
    }

    if (!sos.volunteerVerification?.status) {
      return res.status(400).json({ message: 'Volunteer must report before admin final confirmation.' })
    }

    const finalStatus = sos.volunteerVerification.status === status ? status : 'disputed'

    const chainResult = await finalizeSOSOnChain({
      sosId: sos.sequenceId,
      finalStatus,
      finalizedBy: finalizedBy || 'Admin',
      adminNote: note || '',
    })

    if (!chainResult.logged) {
      return res.status(502).json({ message: chainResult.reason })
    }

    sos.adminVerification = {
      status,
      note: note || '',
      verifiedAt: new Date(),
    }
    sos.status = finalStatus
    sos.finalStatus = finalStatus
    sos.blockchain = mergeBlockchainState(sos, {
      completedLogged: true,
      completedTxHash: chainResult.txHash,
      completeBlockNumber: chainResult.blockNumber ?? null,
      chainId: chainResult.chainId ?? sos.blockchain?.chainId ?? null,
      contractAddress: process.env.CONTRACT_ADDRESS || '',
      lastError: '',
    })

    await sos.save()

    return res.json({
      message:
        finalStatus === 'completed'
          ? 'Admin confirmed completion. Reward sent on-chain to the volunteer wallet.'
          : finalStatus === 'fake'
            ? 'Admin confirmed the fake report. Final result stored on-chain without reward.'
            : 'Admin review created a dispute. Dispute stored on-chain and no reward was sent.',
      sos,
      rewardPaidWei: chainResult.rewardPaidWei || '0',
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to finalize SOS.' })
  }
})

module.exports = {
  router,
  listSOSRequests,
}
