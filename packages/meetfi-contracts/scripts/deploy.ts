import { ethers } from 'hardhat'

async function main() {
  const meetingNFTFactory = await ethers.getContractFactory('MeetingNFT')
  const meetingNFT = await meetingNFTFactory.deploy()

  await meetingNFT.deployed()

  console.log(meetingNFT.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
