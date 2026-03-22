const express = require('express')
const { ethers } = require('ethers')

const Counter = require('../models/Counter')
const SOS = require('../models/SOS')
const Volunteer = require('../models/Volunteer')
const { analyzeSOS } = require('../services/aiService')
const { sendAssignmentSms } = require('../services/notificationService')
const { geocodeWithFallback } = require('../utils/geocode')
const { findNearestVolunteer, haversineDistance, getRoadMetrics } = require('../utils/assignVolunteer')
const {
  getLatestOnChainSosId,
  sosExistsOnChain,
  createSOSOnChain,
  assignVolunteerOnChain,
  volunteerReportOnChain,
  finalizeSOSOnChain,
} = require('../services/blockchainService')

const router = express.Router()
const AUTO_ASSIGNMENT_SOURCE = 'System Auto-Assign'
const ASSIGNMENT_BACKFILL_SOURCE = 'System Assignment Backfill'
const activeSourceSubmissions = new Map()

const getNextSequenceId = async () => {
  const counter = await Counter.findOneAndUpdate(
    { key: 'sos' },
    { $inc: { value: 1 } },
    { new: true, upsert: true },
  )

  return counter.value
}

const syncCounterWithOnChain = async () => {
  const latestOnChainSosId = await getLatestOnChainSosId()

  if (!Number.isInteger(latestOnChainSosId) || latestOnChainSosId <= 0) {
    return
  }

  await Counter.findOneAndUpdate(
    {
      key: 'sos',
      $or: [
        { value: { $exists: false } },
        { value: { $lt: latestOnChainSosId } },
      ],
    },
    { $set: { value: latestOnChainSosId } },
    { new: true, upsert: true },
  )
}

const allocateSequenceId = async () => {
  const maxAttempts = 100

  await syncCounterWithOnChain()

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const sequenceId = await getNextSequenceId()
    const existsInMongo = await SOS.exists({ sequenceId })

    if (existsInMongo) {
      continue
    }

    const existsOnChain = await sosExistsOnChain(sequenceId)
    if (existsOnChain) {
      console.warn(`[SequenceAllocator] Skipping SOS #${sequenceId} because it already exists on-chain.`)
      continue
    }

    return sequenceId
  }

  throw new Error('Failed to allocate an unused SOS sequence ID.')
}

const waitForActiveSourceSubmission = async (sourceRequestKey) => {
  const activeSubmission = activeSourceSubmissions.get(sourceRequestKey)
  if (!activeSubmission) {
    return
  }

  try {
    await activeSubmission.promise
  } catch {
    // Ignore the previous submission error and let the current request continue.
  }
}

const mergeBlockchainState = (sos, updates) => ({
  ...(sos.blockchain?.toObject?.() || sos.blockchain || {}),
  ...updates,
})

const markAssignmentSyncSuccess = (sos, chainResult) => {
  sos.blockchain = mergeBlockchainState(sos, {
    assignedLogged: true,
    assignedTxHash: chainResult.txHash,
    assignBlockNumber: chainResult.blockNumber ?? null,
    chainId: chainResult.chainId ?? sos.blockchain?.chainId ?? null,
    contractAddress: process.env.CONTRACT_ADDRESS || '',
    lastError: '',
  })
}

const markBlockchainError = (sos, reason) => {
  sos.blockchain = mergeBlockchainState(sos, {
    lastError: reason,
  })
}

const notifyAssignedVolunteer = async ({ volunteer, sos }) => {
  const smsResult = await sendAssignmentSms({
    to: volunteer.phone,
    volunteerName: volunteer.name,
    sos,
  })

  if (smsResult.sent) {
    console.log(
      `[AssignmentSMS] Sent assignment SMS for SOS #${sos.sequenceId} to "${volunteer.name}" (${volunteer.phone}). SID: ${smsResult.sid}`,
    )
    return
  }

  console.error(
    `[AssignmentSMS] Failed to send assignment SMS for SOS #${sos.sequenceId} to "${volunteer.name}": ${smsResult.reason}`,
  )
}

const syncAssignedVolunteerOnChain = async (sos, { volunteerName, volunteerWallet, assignedBy }) => {
  const chainResult = await assignVolunteerOnChain({
    sosId: sos.sequenceId,
    volunteerName,
    assignedBy,
    volunteerWallet,
  })

  if (chainResult.logged) {
    markAssignmentSyncSuccess(sos, chainResult)
  } else {
    markBlockchainError(sos, chainResult.reason)
  }

  return chainResult
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
  let releaseActiveSourceSubmission = null
  let normalizedSourceRequestKey = ''

  try {
    const {
      name, message, type, reporterWallet, location,
      priority, suspicious, analysisSummary,
      keywords, mlScores, sourceRequestKey,
    } = req.body

    if (!name || !message || !type) {
      return res.status(400).json({ message: 'Name, message, and type are required.' })
    }

    normalizedSourceRequestKey =
      typeof sourceRequestKey === 'string' ? sourceRequestKey.trim() : ''

    if (normalizedSourceRequestKey) {
      const existingSOS = await SOS.findOne({ sourceRequestKey: normalizedSourceRequestKey })
      if (existingSOS) {
        return res.status(200).json({
          message: 'Duplicate SOS submission ignored. Returning the existing SOS request.',
          sos: existingSOS,
          autoAssigned: Boolean(existingSOS.autoAssigned),
          assignedVolunteer: existingSOS.assignedVolunteer?.name
            ? { name: existingSOS.assignedVolunteer.name }
            : null,
        })
      }

      await waitForActiveSourceSubmission(normalizedSourceRequestKey)

      const existingAfterWait = await SOS.findOne({ sourceRequestKey: normalizedSourceRequestKey })
      if (existingAfterWait) {
        return res.status(200).json({
          message: 'Duplicate SOS submission ignored. Returning the existing SOS request.',
          sos: existingAfterWait,
          autoAssigned: Boolean(existingAfterWait.autoAssigned),
          assignedVolunteer: existingAfterWait.assignedVolunteer?.name
            ? { name: existingAfterWait.assignedVolunteer.name }
            : null,
        })
      }

      let resolveActiveSourceSubmission
      let rejectActiveSourceSubmission
      const promise = new Promise((resolve, reject) => {
        resolveActiveSourceSubmission = resolve
        rejectActiveSourceSubmission = reject
      })

      activeSourceSubmissions.set(normalizedSourceRequestKey, {
        promise,
      })

      releaseActiveSourceSubmission = (error = null) => {
        const activeSubmission = activeSourceSubmissions.get(normalizedSourceRequestKey)
        if (!activeSubmission || activeSubmission.promise !== promise) {
          return
        }

        activeSourceSubmissions.delete(normalizedSourceRequestKey)
        if (error) {
          rejectActiveSourceSubmission(error)
        } else {
          resolveActiveSourceSubmission()
        }
      }
    }

    const normalizedReporterWallet =
      reporterWallet && ethers.isAddress(reporterWallet) ? reporterWallet : ethers.ZeroAddress

    // Use ML-derived fields from resqnet-call if provided, otherwise fall back
    // to the keyword-heuristic analyzer for manual frontend submissions.
    const heuristic = analyzeSOS({ message, type })

    const resolvedPriority = priority || heuristic.priority
    const resolvedSuspicious =
      typeof suspicious === 'boolean' ? suspicious : heuristic.suspicious
    const resolvedSummary = analysisSummary || heuristic.analysisSummary

    let sequenceId = await allocateSequenceId()

    // --- Silent geocoding (never blocks the request) ---
    // Attempt 1: full location string; Attempt 2: simplified string.
    // If both fail, coordinates stay null — the complaint is still saved.
    let sosCoordinates = null
    let sosGeoLocation = null

    if (location && location.trim()) {
      try {
        const coords = await geocodeWithFallback(location)
        if (coords) {
          sosCoordinates = { lat: coords.lat, lng: coords.lng }
          sosGeoLocation = {
            type: 'Point',
            coordinates: [coords.lng, coords.lat], // GeoJSON: [lng, lat]
          }
        }
      } catch (_geoErr) {
        // Swallow silently — geocoding failure must never surface to the SOS sender
      }
    }
    // --- End of silent geocoding ---

    let chainResult = null
    let createAttempts = 0

    while (createAttempts < 5) {
      createAttempts += 1

      chainResult = await createSOSOnChain({
        sosId: sequenceId,
        reporterName: name,
        reporterWallet: normalizedReporterWallet,
        message,
        emergencyType: type,
        priority: resolvedPriority,
        suspicious: resolvedSuspicious,
      })

      if (chainResult.logged) {
        break
      }

      if (!chainResult.reason?.includes('already exists on-chain')) {
        return res.status(502).json({ message: chainResult.reason })
      }

      console.warn(
        `[SequenceAllocator] createSOS collision for SOS #${sequenceId}. Allocating a newer ID and retrying.`,
      )
      sequenceId = await allocateSequenceId()
    }

    if (!chainResult?.logged) {
      return res.status(502).json({ message: chainResult?.reason || 'Failed to create SOS on-chain.' })
    }

    const sos = await SOS.create({
      sequenceId,
      ...(normalizedSourceRequestKey ? { sourceRequestKey: normalizedSourceRequestKey } : {}),
      name,
      message,
      type,
      location: location || '',
      coordinates: sosCoordinates,
      geoLocation: sosGeoLocation,
      priority: resolvedPriority,
      suspicious: resolvedSuspicious,
      analysisSummary: resolvedSummary,
      keywords: Array.isArray(keywords) ? keywords : [],
      mlScores: mlScores || {},
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

    // ─── Auto-assign nearest available volunteer ───────────────────────────────
    // This block MUST NEVER throw — any error is caught and logged silently.
    // The SOS is already saved; auto-assignment is best-effort.
    let autoAssigned = false
    let autoAssignedInfo = null

    try {
      const result = await findNearestVolunteer(sosCoordinates)

      if (result) {
        const { volunteer, distanceKm, durationMin, metricSource } = result
        const assignedAt = new Date()

        // Update the SOS document
        sos.assignedVolunteer = {
          name: volunteer.name,
          wallet: volunteer.wallet,
          assignedAt,
        }
        sos.status = 'assigned'
        sos.autoAssigned = true

        const chainAssignResult = await syncAssignedVolunteerOnChain(sos, {
          volunteerName: volunteer.name,
          volunteerWallet: volunteer.wallet,
          assignedBy: AUTO_ASSIGNMENT_SOURCE,
        })

        await sos.save()

        // Mark the volunteer as unavailable so they are not double-assigned
        await Volunteer.findByIdAndUpdate(volunteer._id, { isAvailable: false })

        try {
          await notifyAssignedVolunteer({ volunteer, sos })
        } catch (smsErr) {
          console.error('[AutoAssign] SMS notification error (non-fatal):', smsErr)
        }

        autoAssigned = true
        autoAssignedInfo = {
          name: volunteer.name,
          distance: `${distanceKm.toFixed(1)} km`,
          etaMinutes: Number.isFinite(durationMin) ? Math.round(durationMin) : null,
          metricSource,
        }

        console.log(
          `[AutoAssign] SOS #${sequenceId} → volunteer "${volunteer.name}" (${distanceKm.toFixed(1)} km, ${Math.round(durationMin)} min, ${metricSource})`,
        )
        if (!chainAssignResult.logged) {
          console.error(
            `[AutoAssign] SOS #${sequenceId} → assigned in MongoDB but not synced on-chain: ${chainAssignResult.reason}`,
          )
        }
      } else {
        console.log(
          `[AutoAssign] SOS #${sequenceId} → no available volunteers within ${50} km`,
        )
      }
    } catch (assignErr) {
      // Auto-assignment failure must never break the SOS submission
      console.error('[AutoAssign] Error during auto-assignment (non-fatal):', assignErr)
    }
    // ─── End of auto-assignment ────────────────────────────────────────────────

    return res.status(201).json({
      message: 'SOS created successfully and stored on blockchain.',
      sos,
      autoAssigned,
      assignedVolunteer: autoAssignedInfo,
      ...(autoAssigned
        ? {}
        : { reason: 'No available volunteers found nearby' }),
    })
  } catch (error) {
    console.error('POST /api/sos error:', error)
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message })
    }

    return res.status(500).json({ message: 'Failed to create SOS request.', error: error.message })
  } finally {
    if (releaseActiveSourceSubmission) {
      releaseActiveSourceSubmission()
    }
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

    const chainResult = await syncAssignedVolunteerOnChain(sos, {
      volunteerName,
      assignedBy: assignedBy || 'Admin',
      volunteerWallet,
    })

    if (!chainResult.logged) {
      await sos.save()
      return res.status(502).json({ message: chainResult.reason })
    }

    sos.status = 'assigned'
    sos.autoAssigned = false
    sos.assignedVolunteer = {
      name: volunteerName,
      wallet: volunteerWallet,
      assignedAt: new Date(),
    }

    await sos.save()

    // Also mark the volunteer as unavailable if we can find them by wallet
    try {
      const assignedVolunteerRecord = await Volunteer.findOneAndUpdate(
        { wallet: { $regex: new RegExp(`^${volunteerWallet}$`, 'i') } },
        { isAvailable: false },
        { new: true },
      )

      if (assignedVolunteerRecord) {
        await notifyAssignedVolunteer({ volunteer: assignedVolunteerRecord, sos })
      } else {
        console.warn(
          `[AssignmentSMS] Volunteer "${volunteerName}" with wallet ${volunteerWallet} was assigned but no volunteer record was found for SMS delivery.`,
        )
      }
    } catch (vErr) {
      console.error('[ManualAssign] Could not update volunteer availability / SMS notification:', vErr)
    }

    return res.json({
      message: 'Volunteer assigned and written to blockchain.',
      sos,
    })
  } catch (error) {
    return res.status(500).json({ message: 'Failed to assign volunteer.' })
  }
})

// ─── GET /:id/assignment — return rich assignment details ──────────────────────
router.get('/:id/assignment', async (req, res) => {
  try {
    const sos = await SOS.findById(req.params.id).lean()
    if (!sos) {
      return res.status(404).json({ message: 'SOS request not found.' })
    }

    if (!sos.assignedVolunteer?.wallet) {
      return res.json({
        complaint: {
          id: sos._id,
          location: sos.location,
          coordinates: sos.coordinates,
        },
        assignedVolunteer: null,
        autoAssigned: false,
        assignedAt: null,
      })
    }

    // Look up the volunteer record by wallet address (case-insensitive)
    const volunteer = await Volunteer.findOne({
      wallet: { $regex: new RegExp(`^${sos.assignedVolunteer.wallet}$`, 'i') },
    }).lean()

    let distanceFromSOS = null
    let etaFromSOS = null
    let distanceMetricSource = null
    if (
      volunteer &&
      volunteer.coordinates?.lat != null &&
      volunteer.coordinates?.lng != null &&
      sos.coordinates?.lat != null &&
      sos.coordinates?.lng != null
    ) {
      const roadMetrics = await getRoadMetrics(
        { lat: volunteer.coordinates.lat, lng: volunteer.coordinates.lng },
        { lat: sos.coordinates.lat, lng: sos.coordinates.lng },
      )

      if (roadMetrics) {
        distanceFromSOS = `${roadMetrics.distanceKm.toFixed(1)} km`
        etaFromSOS = `${Math.round(roadMetrics.durationMin)} min`
        distanceMetricSource = 'road'
      } else {
        const km = haversineDistance(
          sos.coordinates.lat,
          sos.coordinates.lng,
          volunteer.coordinates.lat,
          volunteer.coordinates.lng,
        )
        distanceFromSOS = `${km.toFixed(1)} km`
        etaFromSOS = `${Math.round((km / 35) * 60)} min`
        distanceMetricSource = 'haversine'
      }
    }

    return res.json({
      complaint: {
        id: sos._id,
        location: sos.location,
        coordinates: sos.coordinates,
      },
      assignedVolunteer: volunteer
        ? {
          id: volunteer._id,
          name: volunteer.name,
          location: volunteer.location,
          coordinates: volunteer.coordinates,
          distanceFromSOS,
          etaFromSOS,
          distanceMetricSource,
        }
        : {
          name: sos.assignedVolunteer.name,
          wallet: sos.assignedVolunteer.wallet,
          distanceFromSOS: null,
          etaFromSOS: null,
          distanceMetricSource: null,
        },
      autoAssigned:
        typeof sos.autoAssigned === 'boolean'
          ? sos.autoAssigned
          : !sos.blockchain?.assignedLogged,
      assignedAt: sos.assignedVolunteer.assignedAt,
    })
  } catch (error) {
    console.error('GET /api/sos/:id/assignment error:', error)
    return res.status(500).json({ message: 'Failed to fetch assignment details.' })
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

    if (!sos.blockchain?.assignedLogged) {
      const assignmentBackfillResult = await syncAssignedVolunteerOnChain(sos, {
        volunteerName: sos.assignedVolunteer.name || 'Assigned Volunteer',
        volunteerWallet: sos.assignedVolunteer.wallet,
        assignedBy: sos.autoAssigned ? AUTO_ASSIGNMENT_SOURCE : ASSIGNMENT_BACKFILL_SOURCE,
      })

      if (!assignmentBackfillResult.logged) {
        await sos.save()
        return res.status(502).json({ message: assignmentBackfillResult.reason })
      }
    }

    const chainResult = await volunteerReportOnChain({
      sosId: sos.sequenceId,
      status,
      volunteerNote: note || '',
    })

    if (!chainResult.logged) {
      markBlockchainError(sos, chainResult.reason)
      await sos.save()
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
    console.error('PUT /api/sos/:id/volunteer-confirm error:', error)
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

    // ─── Release volunteer back to the available pool ─────────────────────────
    // When a complaint is resolved (any final status), the assigned volunteer
    // becomes available again for future SOS assignments.
    if (sos.assignedVolunteer?.wallet) {
      try {
        await Volunteer.findOneAndUpdate(
          { wallet: { $regex: new RegExp(`^${sos.assignedVolunteer.wallet}$`, 'i') } },
          { isAvailable: true },
        )
        console.log(
          `[VolunteerRelease] Volunteer "${sos.assignedVolunteer.name}" is now available again.`,
        )
      } catch (releaseErr) {
        // Non-fatal — do not block the confirmation response
        console.error('[VolunteerRelease] Could not release volunteer (non-fatal):', releaseErr)
      }
    }
    // ─── End volunteer release ────────────────────────────────────────────────

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
