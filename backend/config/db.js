const mongoose = require('mongoose')

const DEFAULT_URI = 'mongodb://127.0.0.1:27017/resqnet'

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || DEFAULT_URI

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    })

    console.log(`MongoDB connected: ${mongoose.connection.host}`)
    return true
  } catch (error) {
    console.warn(`MongoDB connection failed: ${error.message}`)
    return false
  }
}

module.exports = connectDB
