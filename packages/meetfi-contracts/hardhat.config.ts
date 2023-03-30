import '@nomicfoundation/hardhat-toolbox'
import { config as dotenvConfig } from 'dotenv'
import { HardhatUserConfig } from 'hardhat/config'

dotenvConfig()

const config: HardhatUserConfig = {
  solidity: '0.8.18',
  defaultNetwork: 'base',
  networks: {
    base: {
      url: 'https://goerli.base.org',
      accounts: [process.env.DEPLOYER_ACCOUNT_PRIVATE_KEY!],
    },
  },
}

export default config
