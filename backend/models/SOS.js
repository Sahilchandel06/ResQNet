const mongoose = require('mongoose')

const verificationSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ['completed', 'fake'],
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    verifiedAt: {
      type: Date,
    },
  },
  {
    _id: false,
  },
)

const blockchainSchema = new mongoose.Schema(
  {
    logged: {
      type: Boolean,
      default: false,
    },
    txHash: {
      type: String,
      trim: true,
      default: '',
    },
    contractAddress: {
      type: String,
      trim: true,
      default: '',
    },
    blockNumber: {
      type: Number,
      default: null,
    },
    chainId: {
      type: Number,
      default: null,
    },
    loggedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    _id: false,
  },
)

const sosSchema = new mongoose.Schema(
  {
    sequenceId: {
      type: Number,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
      enum: ['Medical', 'Fire', 'Accident', 'Crime', 'Disaster', 'Other'],
    },
    priority: {
      type: String,
      default: 'Medium',
      enum: ['Critical', 'High', 'Medium', 'Low'],
    },
    suspicious: {
      type: Boolean,
      default: false,
    },
    analysisSummary: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      default: 'pending',
      enum: ['pending', 'assigned', 'completed', 'fake', 'disputed'],
    },
    role: {
      type: String,
      default: 'user',
      enum: ['user', 'admin', 'volunteer'],
    },
    assignedVolunteer: {
      name: {
        type: String,
        trim: true,
        default: '',
      },
      wallet: {
        type: String,
        trim: true,
        default: '',
      },
      assignedAt: {
        type: Date,
        default: null,
      },
    },
    volunteerVerification: {
      type: verificationSchema,
      default: () => ({}),
    },
    adminVerification: {
      type: verificationSchema,
      default: () => ({}),
    },
    finalStatus: {
      type: String,
      enum: ['completed', 'fake', 'disputed', 'pending'],
      default: 'pending',
    },
    blockchain: {
      type: blockchainSchema,
      default: () => ({}),
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model('SOS', sosSchema)
