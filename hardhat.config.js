require('dotenv').config()
require('@nomicfoundation/hardhat-ethers')
require('@nomicfoundation/hardhat-verify')

const accounts = process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []

module.exports = {
  solidity: '0.8.24',
  paths: {
    sources: './contracts',
    cache: './artifacts/cache',
    artifacts: './artifacts',
  },
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.RPC_URL || '',
      accounts,
    },
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || '',
  },
}
