const { ethers } = require('ethers')

const contractArtifact = require('../../artifacts/contracts/ResQNetProtocol.sol/ResQNetProtocol.json')

const contractAbi = contractArtifact.abi

const hasBlockchainConfig = () =>
  Boolean(process.env.RPC_URL && process.env.PRIVATE_KEY && process.env.CONTRACT_ADDRESS)

const getContract = () => {
  if (!hasBlockchainConfig()) {
    return null
  }

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider)
  const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, contractAbi, signer)

  return { contract, signer }
}

const formatContractError = (error) => {
  const errorName = error?.revert?.name || error?.data?.errorName || error?.info?.error?.data?.errorName

  if (errorName === 'CallerIsNotOwner') {
    return 'Blockchain call rejected: backend PRIVATE_KEY is not the contract owner.'
  }
  if (errorName === 'SOSAlreadyExists') {
    return 'Blockchain call rejected: this SOS ID already exists on-chain.'
  }
  if (errorName === 'SOSNotFound') {
    return 'Blockchain call rejected: this SOS ID does not exist on-chain.'
  }
  if (errorName === 'VolunteerNotAssigned') {
    return 'Blockchain call rejected: volunteer must be assigned before reporting or finalizing.'
  }
  if (errorName === 'VolunteerNotReported') {
    return 'Blockchain call rejected: the volunteer must report before admin finalization.'
  }
  if (errorName === 'SOSAlreadyFinalized') {
    return 'Blockchain call rejected: this SOS was already finalized on-chain.'
  }
  if (errorName === 'InvalidStatus') {
    return 'Blockchain call rejected: invalid status sent to the contract.'
  }
  if (errorName === 'MismatchedFinalStatus') {
    return 'Blockchain call rejected: admin final status does not match the volunteer report.'
  }
  if (errorName === 'InvalidRewardAmount') {
    return 'Blockchain call rejected: the reward value sent with finalization is invalid.'
  }
  if (errorName === 'RewardTransferFailed') {
    return 'Blockchain call rejected: the reward transfer to the volunteer wallet failed.'
  }

  return error.shortMessage || error.message || 'Blockchain transaction failed.'
}

const ensureOwner = async (contract, signer) => {
  const signerAddress = await signer.getAddress()
  const ownerAddress = await contract.owner()

  if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
    return {
      ok: false,
      reason: `Blockchain call rejected: backend wallet ${signerAddress} is not contract owner ${ownerAddress}.`,
    }
  }

  return { ok: true }
}

const shapeReceipt = async (receipt, extra = {}) => ({
  logged: true,
  txHash: receipt.hash,
  blockNumber: receipt.blockNumber,
  chainId: Number(receipt.chainId || 0),
  loggedAt: new Date().toISOString(),
  ...extra,
})

const createSOSOnChain = async ({ sosId, reporterName, reporterWallet, message, emergencyType, priority, suspicious }) => {
  if (!hasBlockchainConfig()) {
    return { logged: false, reason: 'Blockchain environment variables are not configured.' }
  }

  try {
    const { contract, signer } = getContract()
    const ownerCheck = await ensureOwner(contract, signer)
    if (!ownerCheck.ok) {
      return { logged: false, reason: ownerCheck.reason }
    }

    if (await contract.sosExists(sosId)) {
      return { logged: false, reason: `Blockchain call rejected: SOS #${sosId} already exists on-chain.` }
    }

    const tx = await contract.createSOS(
      sosId,
      reporterName,
      reporterWallet,
      message,
      emergencyType,
      priority,
      suspicious,
    )
    const receipt = await tx.wait()
    return shapeReceipt(receipt)
  } catch (error) {
    return { logged: false, reason: formatContractError(error) }
  }
}

const assignVolunteerOnChain = async ({ sosId, volunteerName, assignedBy, volunteerWallet }) => {
  if (!hasBlockchainConfig()) {
    return { logged: false, reason: 'Blockchain environment variables are not configured.' }
  }

  try {
    const { contract, signer } = getContract()
    const ownerCheck = await ensureOwner(contract, signer)
    if (!ownerCheck.ok) {
      return { logged: false, reason: ownerCheck.reason }
    }

    if (!(await contract.sosExists(sosId))) {
      return { logged: false, reason: `Blockchain call rejected: SOS #${sosId} does not exist on-chain.` }
    }

    const tx = await contract.assignVolunteer(sosId, volunteerName, assignedBy, volunteerWallet)
    const receipt = await tx.wait()
    return shapeReceipt(receipt)
  } catch (error) {
    return { logged: false, reason: formatContractError(error) }
  }
}

const volunteerReportOnChain = async ({ sosId, status, volunteerNote }) => {
  if (!hasBlockchainConfig()) {
    return { logged: false, reason: 'Blockchain environment variables are not configured.' }
  }

  try {
    const { contract, signer } = getContract()
    const ownerCheck = await ensureOwner(contract, signer)
    if (!ownerCheck.ok) {
      return { logged: false, reason: ownerCheck.reason }
    }

    if (!(await contract.sosExists(sosId))) {
      return { logged: false, reason: `Blockchain call rejected: SOS #${sosId} does not exist on-chain.` }
    }

    const tx = await contract.volunteerReportSOS(sosId, status, volunteerNote)
    const receipt = await tx.wait()
    return shapeReceipt(receipt)
  } catch (error) {
    return { logged: false, reason: formatContractError(error) }
  }
}

const finalizeSOSOnChain = async ({ sosId, finalStatus, finalizedBy, adminNote }) => {
  if (!hasBlockchainConfig()) {
    return { logged: false, reason: 'Blockchain environment variables are not configured.' }
  }

  try {
    const { contract, signer } = getContract()
    const ownerCheck = await ensureOwner(contract, signer)
    if (!ownerCheck.ok) {
      return { logged: false, reason: ownerCheck.reason }
    }

    if (!(await contract.sosExists(sosId))) {
      return { logged: false, reason: `Blockchain call rejected: SOS #${sosId} does not exist on-chain.` }
    }

    const rewardAmount = await contract.rewardAmount()
    const overrides = finalStatus === 'completed' ? { value: rewardAmount } : {}

    const tx = await contract.finalizeSOS(sosId, finalStatus, finalizedBy, adminNote, overrides)
    const receipt = await tx.wait()
    return shapeReceipt(receipt, {
      rewardPaidWei: finalStatus === 'completed' ? rewardAmount.toString() : '0',
    })
  } catch (error) {
    return { logged: false, reason: formatContractError(error) }
  }
}

const getSOSRecord = async (sosId) => {
  if (!hasBlockchainConfig()) {
    return {
      available: false,
      message: 'Contract configuration missing. Deploy and configure the protocol to fetch on-chain SOS data.',
      sos: null,
    }
  }

  try {
    const { contract } = getContract()
    const record = await contract.getSOS(sosId)

    return {
      available: true,
      message: 'SOS record fetched from blockchain.',
      sos: {
        sosId: Number(record.sosId),
        reporterName: record.reporterName,
        reporterWallet: record.reporterWallet,
        message: record.message,
        emergencyType: record.emergencyType,
        priority: record.priority,
        suspicious: record.suspicious,
        status: record.status,
        volunteerName: record.volunteerName,
        volunteerWallet: record.volunteerWallet,
        assignedBy: record.assignedBy,
        volunteerNote: record.volunteerNote,
        volunteerReportedStatus: record.volunteerReportedStatus,
        finalizedBy: record.finalizedBy,
        adminNote: record.adminNote,
        createdAt: Number(record.createdAt),
        assignedAt: Number(record.assignedAt),
        volunteerReportedAt: Number(record.volunteerReportedAt),
        completedAt: Number(record.completedAt),
        rewardPaidWei: Number(record.rewardPaidWei),
        rewardPaidAt: Number(record.rewardPaidAt),
      },
    }
  } catch (error) {
    return {
      available: false,
      message: formatContractError(error),
      sos: null,
    }
  }
}

const getReputation = async (wallet) => {
  if (!hasBlockchainConfig()) {
    return {
      available: false,
      reputation: null,
      source: 'unconfigured',
      message: 'Contract configuration missing. Deploy and configure the protocol to fetch on-chain reputation.',
    }
  }

  try {
    const { contract } = getContract()
    const reputation = await contract.getReputation(wallet)
    const rewardAmount = await contract.rewardAmount()
    return {
      available: true,
      reputation: Number(reputation),
      rewardAmountWei: rewardAmount.toString(),
      source: 'on-chain',
      message: 'Reputation fetched from the deployed protocol contract.',
    }
  } catch (error) {
    return {
      available: false,
      reputation: null,
      rewardAmountWei: null,
      source: 'error',
      message: formatContractError(error),
    }
  }
}

const getProtocolStatus = async () => {
  if (!hasBlockchainConfig()) {
    return {
      configured: false,
      contractAddress: process.env.CONTRACT_ADDRESS || '',
      rewardAmountWei: null,
    }
  }

  try {
    const { contract } = getContract()
    const rewardAmount = await contract.rewardAmount()

    return {
      configured: true,
      contractAddress: process.env.CONTRACT_ADDRESS || '',
      rewardAmountWei: rewardAmount.toString(),
    }
  } catch {
    return {
      configured: true,
      contractAddress: process.env.CONTRACT_ADDRESS || '',
      rewardAmountWei: null,
    }
  }
}

module.exports = {
  hasBlockchainConfig,
  createSOSOnChain,
  assignVolunteerOnChain,
  volunteerReportOnChain,
  finalizeSOSOnChain,
  getSOSRecord,
  getReputation,
  getProtocolStatus,
}
