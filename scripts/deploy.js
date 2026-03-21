const hre = require('hardhat')

async function main() {
  const factory = await hre.ethers.getContractFactory('ResQNetProtocol')
  const contract = await factory.deploy()
  await contract.waitForDeployment()

  console.log(`ResQNetProtocol deployed to ${contract.target}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
