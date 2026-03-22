const express = require('express')
const { ethers } = require('ethers')

const Volunteer = require('../models/Volunteer')
const { geocodeWithFallback } = require('../utils/geocode')
const { normalizePhoneToE164, isE164Phone } = require('../utils/phone')

const router = express.Router()

// POST /api/volunteers — Register a new volunteer
router.post('/', async (req, res) => {
    try {
        const { name, phone, location, wallet, isAvailable } = req.body

        // Basic field validation
        if (!name || !phone || !location || !wallet) {
            return res.status(400).json({
                success: false,
                error: 'Name, phone, location, and wallet are required.',
            })
        }

        if (!ethers.isAddress(wallet)) {
            return res.status(400).json({
                success: false,
                error: 'A valid Ethereum wallet address is required.',
            })
        }

        const normalizedPhone = normalizePhoneToE164(phone)
        if (!isE164Phone(normalizedPhone)) {
            return res.status(400).json({
                success: false,
                error: 'Phone number must be in E.164 format, for example +919876543210.',
            })
        }

        // Geocode the location — two attempts: full string, then simplified
        const coords = await geocodeWithFallback(location)

        if (!coords) {
            return res.status(400).json({
                success: false,
                error:
                    'We could not locate this area. Please enter a nearby landmark, area name, or well-known location in your city and try again.',
            })
        }

        const volunteer = await Volunteer.create({
            name: name.trim(),
            phone: normalizedPhone,
            location: location.trim(),
            wallet: wallet.trim(),
            isAvailable: typeof isAvailable === 'boolean' ? isAvailable : true,
            coordinates: {
                lat: coords.lat,
                lng: coords.lng,
            },
            geoLocation: {
                type: 'Point',
                coordinates: [coords.lng, coords.lat], // GeoJSON: [lng, lat]
            },
        })

        return res.status(201).json({
            success: true,
            volunteer,
        })
    } catch (error) {
        console.error('POST /api/volunteers error:', error)

        // Duplicate wallet
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: 'A volunteer with this wallet address is already registered.',
            })
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({ success: false, error: error.message })
        }

        return res.status(500).json({
            success: false,
            error: 'Failed to register volunteer. Please try again.',
        })
    }
})

// GET /api/volunteers — List all volunteers (admin use)
router.get('/', async (_req, res) => {
    try {
        const volunteers = await Volunteer.find().sort({ createdAt: -1 })
        return res.json({ success: true, volunteers })
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Failed to fetch volunteers.' })
    }
})

module.exports = router
