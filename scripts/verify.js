const hre = require('hardhat')

async function main() {
  const contractAddress = process.env.CONTRACT_ADDRESS

  if (!contractAddress) {
    throw new Error('CONTRACT_ADDRESS is missing in .env. Set it before verifying.')
  }

  if (!process.env.ETHERSCAN_API_KEY) {
    throw new Error('ETHERSCAN_API_KEY is missing in .env. Set it before verifying.')
  }

  await hre.run('verify:verify', {
    address: contractAddress,
    constructorArguments: [],
  })

  console.log(`ResQNetProtocol verified on Etherscan: ${contractAddress}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
