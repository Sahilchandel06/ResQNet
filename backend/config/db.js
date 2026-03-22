const mongoose = require('mongoose')

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI

  if (!mongoUri) {
    console.warn('MongoDB connection skipped: set MONGO_URI to your MongoDB Atlas connection string.')
    return false
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
    })

    console.log(`MongoDB connected: ${mongoose.connection.name} @ ${mongoose.connection.host}`)
    return true
  } catch (error) {
    console.warn(`MongoDB connection failed: ${error.message}`)
    return false
  }
}

module.exports = connectDB
