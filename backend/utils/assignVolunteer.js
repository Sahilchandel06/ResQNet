/**
 * assignVolunteer.js
 * Finds the nearest available volunteer within 50 km of the given SOS coordinates.
 * Prefers OSRM road distance/duration and falls back to Haversine when needed.
 */

const axios = require('axios')
const Volunteer = require('../models/Volunteer')

const MAX_RADIUS_KM = 50
const OSRM_ROUTE_BASE_URL = process.env.OSRM_ROUTE_BASE_URL || 'https://router.project-osrm.org/route/v1/driving'
const OSRM_TIMEOUT_MS = 6000

/**
 * Haversine formula — returns distance in km between two lat/lng points.
 */
function haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371 // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180
    const dLng = ((lng2 - lng1) * Math.PI) / 180
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
}

/**
 * Fetch road distance + duration between two coordinates from OSRM.
 * Returns null when OSRM cannot provide a route.
 *
 * @param {{ lat: number, lng: number }} start
 * @param {{ lat: number, lng: number }} end
 * @returns {Promise<{ distanceKm: number, durationMin: number } | null>}
 */
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
    } catch (err) {
        console.warn('[routing] OSRM route lookup failed:', err.message)
        return null
    }
}

/**
 * Finds the nearest available volunteer to the given SOS coordinates.
 *
 * @param {{ lat: number, lng: number } | null} sosCoordinates
 * @returns {Promise<{ volunteer: object, distanceKm: number } | null>}
 *   Returns an object with the volunteer document and distance, or null if none found.
 */
async function findNearestVolunteer(sosCoordinates) {
    // If the SOS has no coordinates, we cannot compute distance — bail out
    if (
        !sosCoordinates ||
        sosCoordinates.lat == null ||
        sosCoordinates.lng == null
    ) {
        return null
    }

    const { lat: sosLat, lng: sosLng } = sosCoordinates

    // Fetch all currently available volunteers from the DB
    const availableVolunteers = await Volunteer.find({ isAvailable: true }).lean()

    if (!availableVolunteers.length) {
        return null
    }

    let nearest = null
    let nearestDistance = Infinity
    let nearestDurationMin = Infinity
    let nearestMetricSource = 'haversine'

    for (const volunteer of availableVolunteers) {
        const vLat = volunteer.coordinates?.lat
        const vLng = volunteer.coordinates?.lng

        // Skip volunteers with null / missing coordinates silently
        if (vLat == null || vLng == null) {
            continue
        }

        const distance = haversineDistance(sosLat, sosLng, vLat, vLng)

        const roadMetrics = await getRoadMetrics(
            { lat: vLat, lng: vLng },
            { lat: sosLat, lng: sosLng },
        )

        const effectiveDistanceKm = roadMetrics?.distanceKm ?? distance
        const effectiveDurationMin = roadMetrics?.durationMin ?? ((distance / 35) * 60)

        if (effectiveDistanceKm > MAX_RADIUS_KM) {
            continue
        }

        if (effectiveDurationMin < nearestDurationMin) {
            nearestDurationMin = effectiveDurationMin
            nearestDistance = effectiveDistanceKm
            nearest = volunteer
            nearestMetricSource = roadMetrics ? 'road' : 'haversine'
        }
    }

    if (!nearest) {
        return null
    }

    return {
        volunteer: nearest,
        distanceKm: nearestDistance,
        durationMin: nearestDurationMin,
        metricSource: nearestMetricSource,
    }
}

module.exports = { findNearestVolunteer, haversineDistance, getRoadMetrics }
