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
  { _id: false },
)

const blockchainSchema = new mongoose.Schema(
  {
    createdLogged: {
      type: Boolean,
      default: false,
    },
    assignedLogged: {
      type: Boolean,
      default: false,
    },
    volunteerReportedLogged: {
      type: Boolean,
      default: false,
    },
    completedLogged: {
      type: Boolean,
      default: false,
    },
    createdTxHash: {
      type: String,
      trim: true,
      default: '',
    },
    assignedTxHash: {
      type: String,
      trim: true,
      default: '',
    },
    volunteerReportedTxHash: {
      type: String,
      trim: true,
      default: '',
    },
    completedTxHash: {
      type: String,
      trim: true,
      default: '',
    },
    contractAddress: {
      type: String,
      trim: true,
      default: '',
    },
    createBlockNumber: {
      type: Number,
      default: null,
    },
    assignBlockNumber: {
      type: Number,
      default: null,
    },
    volunteerReportedBlockNumber: {
      type: Number,
      default: null,
    },
    completeBlockNumber: {
      type: Number,
      default: null,
    },
    chainId: {
      type: Number,
      default: null,
    },
    lastError: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: false },
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
    location: {
      type: String,
      trim: true,
      default: '',
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
      enum: ['pending', 'assigned', 'volunteer_completed', 'volunteer_fake', 'completed', 'fake', 'disputed'],
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
  { timestamps: true },
)

module.exports = mongoose.model('SOS', sosSchema)
