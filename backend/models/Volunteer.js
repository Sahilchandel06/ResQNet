const mongoose = require('mongoose')
const { normalizePhoneToE164, isE164Phone } = require('../utils/phone')

const volunteerSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },
        phone: {
            type: String,
            required: true,
            trim: true,
            set: normalizePhoneToE164,
            validate: {
                validator: isE164Phone,
                message: 'Phone number must be in E.164 format, for example +919876543210.',
            },
        },
        location: {
            type: String,
            required: true,
            trim: true,
        },
        wallet: {
            type: String,
            required: true,
            trim: true,
            unique: true,
        },
        isAvailable: {
            type: Boolean,
            default: true,
        },
        // Flat lat/lng for easy access
        coordinates: {
            lat: { type: Number, default: null },
            lng: { type: Number, default: null },
        },
        // GeoJSON Point for MongoDB $near / 2dsphere queries
        geoLocation: {
            type: { type: String, enum: ['Point'], default: 'Point' },
            coordinates: { type: [Number], default: [0, 0] },
        },
    },
    { timestamps: true },
)

// Enable geospatial queries on volunteers
volunteerSchema.index({ geoLocation: '2dsphere' })

module.exports = mongoose.model('Volunteer', volunteerSchema)
