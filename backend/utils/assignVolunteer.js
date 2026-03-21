/**
 * assignVolunteer.js
 * Finds the nearest available volunteer within 50 km of the given SOS coordinates.
 * Uses pure Haversine math — no external APIs.
 */

const Volunteer = require('../models/Volunteer')

const MAX_RADIUS_KM = 50

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

    for (const volunteer of availableVolunteers) {
        const vLat = volunteer.coordinates?.lat
        const vLng = volunteer.coordinates?.lng

        // Skip volunteers with null / missing coordinates silently
        if (vLat == null || vLng == null) {
            continue
        }

        const distance = haversineDistance(sosLat, sosLng, vLat, vLng)

        if (distance < nearestDistance) {
            nearestDistance = distance
            nearest = volunteer
        }
    }

    // Apply 50 km radius filter
    if (!nearest || nearestDistance > MAX_RADIUS_KM) {
        return null
    }

    return { volunteer: nearest, distanceKm: nearestDistance }
}

module.exports = { findNearestVolunteer, haversineDistance }
