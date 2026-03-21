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

  return {
    contract,
    signer,
  }
}

const formatContractError = (error) => {
  const errorName = error?.revert?.name || error?.data?.errorName || error?.info?.error?.data?.errorName

  if (errorName === 'CallerIsNotOwner') {
    return 'Blockchain call rejected: backend PRIVATE_KEY is not the contract owner.'
  }

  if (errorName === 'SOSAlreadyLogged') {
    return 'Blockchain call rejected: this SOS sequence ID was already logged on-chain.'
  }

  if (errorName === 'InvalidStatus') {
    return 'Blockchain call rejected: invalid final status sent to the contract.'
  }

  return error.shortMessage || error.message || 'Blockchain transaction failed.'
}

const logSOSOnChain = async ({ id, volunteerWallet, status }) => {
  if (!hasBlockchainConfig()) {
    return {
      logged: false,
      skipped: true,
      reason: 'Blockchain environment variables are not configured.',
    }
  }

  try {
    const { contract, signer } = getContract()
    const signerAddress = await signer.getAddress()
    const ownerAddress = await contract.owner()

    if (signerAddress.toLowerCase() !== ownerAddress.toLowerCase()) {
      return {
        logged: false,
        skipped: false,
        reason: `Blockchain call rejected: backend wallet ${signerAddress} is not contract owner ${ownerAddress}.`,
      }
    }

    const alreadyLogged = await contract.sosExists(id)
    if (alreadyLogged) {
      return {
        logged: false,
        skipped: false,
        reason: `Blockchain call rejected: SOS #${id} is already logged on-chain.`,
      }
    }

    if (!['completed', 'fake'].includes(status)) {
      return {
        logged: false,
        skipped: false,
        reason: `Blockchain call rejected: status "${status}" is not supported by the contract.`,
      }
    }

    const tx = await contract.logSOS(id, volunteerWallet, status)
    const receipt = await tx.wait()

    return {
      logged: true,
      skipped: false,
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      chainId: Number(receipt.chainId || 0),
      loggedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      logged: false,
      skipped: false,
      reason: formatContractError(error),
    }
  }
}

const getReputation = async (wallet) => {
  if (!hasBlockchainConfig()) {
    return {
      available: false,
      reputation: null,
      source: 'unconfigured',
      message:
        'Contract configuration missing. Deploy and configure the protocol to fetch on-chain reputation.',
    }
  }

  try {
    const { contract } = getContract()
    const reputation = await contract.getReputation(wallet)

    return {
      available: true,
      reputation: Number(reputation),
      source: 'on-chain',
      message: 'Reputation fetched from the deployed protocol contract.',
    }
  } catch (error) {
    return {
      available: false,
      reputation: null,
      source: 'error',
      message: formatContractError(error),
    }
  }
}

module.exports = {
  hasBlockchainConfig,
  logSOSOnChain,
  getReputation,
}
