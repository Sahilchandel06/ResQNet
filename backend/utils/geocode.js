const axios = require('axios')

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const USER_AGENT = 'GlyphCoders/1.0'

/**
 * Geocode a text location string using the Nominatim OpenStreetMap API.
 * Returns { lat, lng } as numbers, or null if no result was found.
 *
 * @param {string} locationText - e.g. "Mall Road, Surat"
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
async function geocodeLocation(locationText) {
    if (!locationText || typeof locationText !== 'string' || !locationText.trim()) {
        return null
    }

    try {
        const response = await axios.get(NOMINATIM_URL, {
            params: {
                q: locationText.trim(),
                format: 'json',
                limit: 1,
            },
            headers: {
                'User-Agent': USER_AGENT,
                'Accept-Language': 'en',
            },
            timeout: 8000,
        })

        const results = response.data
        if (Array.isArray(results) && results.length > 0) {
            const { lat, lon } = results[0]
            const latNum = parseFloat(lat)
            const lngNum = parseFloat(lon)

            if (!isNaN(latNum) && !isNaN(lngNum)) {
                return { lat: latNum, lng: lngNum }
            }
        }

        return null
    } catch (err) {
        // Do not throw — callers decide what to do on failure
        console.warn('[geocode] Nominatim request failed:', err.message)
        return null
    }
}

/**
 * Extract a simplified fallback query from a location string.
 * e.g. "Near Mall Road, Andheri, Mumbai"  →  "Andheri, Mumbai"
 *      "Sector 5, Noida"                  →  "Noida"
 *
 * @param {string} locationText
 * @returns {string | null}
 */
function simplifyLocation(locationText) {
    const parts = locationText
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)

    // Need at least 2 parts to simplify; drop the first part
    if (parts.length >= 2) {
        return parts.slice(1).join(', ')
    }

    // Single-word or already minimal — nothing to simplify
    return null
}

/**
 * Try geocoding with automatic fallback:
 *   1. Full location string
 *   2. Simplified location (first comma-separated part dropped)
 *
 * Returns { lat, lng } on success or null on total failure.
 *
 * @param {string} locationText
 * @returns {Promise<{ lat: number, lng: number } | null>}
 */
async function geocodeWithFallback(locationText) {
    // Attempt 1: full string
    const result = await geocodeLocation(locationText)
    if (result) return result

    // Attempt 2: simplified
    const simplified = simplifyLocation(locationText)
    if (simplified) {
        const fallbackResult = await geocodeLocation(simplified)
        if (fallbackResult) return fallbackResult
    }

    return null
}

module.exports = { geocodeLocation, geocodeWithFallback, simplifyLocation }
