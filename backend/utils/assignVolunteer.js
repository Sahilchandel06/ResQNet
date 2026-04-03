/**
 * assignVolunteer.js
 * Finds and claims the nearest available volunteer within 50 km of the SOS.
 * Prefers OSRM road distance and duration and falls back to Haversine when needed.
 */

const axios = require('axios')
const Volunteer = require('../models/Volunteer')

const MAX_RADIUS_KM = 50
const OSRM_ROUTE_BASE_URL =
  process.env.OSRM_ROUTE_BASE_URL || 'https://router.project-osrm.org/route/v1/driving'
const OSRM_TIMEOUT_MS = 6000

function haversineDistance(lat1, lng1, lat2, lng2) {
  const earthRadiusKm = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusKm * c
}

async function getRoadMetrics(start, end) {
  if (
    !start ||
    !end ||
    start.lat == null ||
    start.lng == null ||
    end.lat == null ||
    end.lng == null
  ) {
    return null
  }

  try {
    const url = `${OSRM_ROUTE_BASE_URL}/${start.lng},${start.lat};${end.lng},${end.lat}`
    const response = await axios.get(url, {
      params: {
        overview: 'false',
        alternatives: 'false',
        steps: 'false',
        annotations: 'false',
      },
      timeout: OSRM_TIMEOUT_MS,
    })

    const route = response.data?.routes?.[0]
    if (!route || typeof route.distance !== 'number' || typeof route.duration !== 'number') {
      return null
    }

    return {
      distanceKm: route.distance / 1000,
      durationMin: route.duration / 60,
    }
  } catch (error) {
    console.warn('[routing] OSRM route lookup failed:', error.message)
    return null
  }
}

async function getVolunteerCandidates(sosCoordinates) {
  if (
    !sosCoordinates ||
    sosCoordinates.lat == null ||
    sosCoordinates.lng == null
  ) {
    return []
  }

  const { lat: sosLat, lng: sosLng } = sosCoordinates
  const availableVolunteers = await Volunteer.find({ isAvailable: true }).lean()

  if (!availableVolunteers.length) {
    return []
  }

  const candidates = []

  for (const volunteer of availableVolunteers) {
    const volunteerLat = volunteer.coordinates?.lat
    const volunteerLng = volunteer.coordinates?.lng

    if (volunteerLat == null || volunteerLng == null) {
      continue
    }

    const haversineKm = haversineDistance(sosLat, sosLng, volunteerLat, volunteerLng)
    const roadMetrics = await getRoadMetrics(
      { lat: volunteerLat, lng: volunteerLng },
      { lat: sosLat, lng: sosLng },
    )

    const distanceKm = roadMetrics?.distanceKm ?? haversineKm
    const durationMin = roadMetrics?.durationMin ?? ((haversineKm / 35) * 60)

    if (distanceKm > MAX_RADIUS_KM) {
      continue
    }

    candidates.push({
      volunteer,
      distanceKm,
      durationMin,
      metricSource: roadMetrics ? 'road' : 'haversine',
    })
  }

  candidates.sort((left, right) => {
    if (left.durationMin !== right.durationMin) {
      return left.durationMin - right.durationMin
    }

    return left.distanceKm - right.distanceKm
  })

  return candidates
}

async function findNearestVolunteer(sosCoordinates) {
  const candidates = await getVolunteerCandidates(sosCoordinates)
  return candidates[0] || null
}

async function findAndClaimNearestVolunteer(sosCoordinates) {
  const candidates = await getVolunteerCandidates(sosCoordinates)

  for (const candidate of candidates) {
    const claimedVolunteer = await Volunteer.findOneAndUpdate(
      { _id: candidate.volunteer._id, isAvailable: true },
      { isAvailable: false },
      { new: true },
    ).lean()

    if (claimedVolunteer) {
      return {
        ...candidate,
        volunteer: claimedVolunteer,
      }
    }
  }

  return null
}

async function releaseVolunteerClaim(volunteerId) {
  if (!volunteerId) {
    return
  }

  await Volunteer.findByIdAndUpdate(volunteerId, { isAvailable: true })
}

module.exports = {
  findNearestVolunteer,
  findAndClaimNearestVolunteer,
  releaseVolunteerClaim,
  haversineDistance,
  getRoadMetrics,
}
