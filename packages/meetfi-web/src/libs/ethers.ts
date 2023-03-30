import { getDefaultClient } from 'connectkit'
import { createClient } from 'wagmi'
import { baseGoerli } from 'wagmi/chains'
import { INFURA_API_KEY } from './constants'

export const wagmiClient = createClient(
  getDefaultClient({
    appName: 'MeetFi',
    chains: [baseGoerli],
    infuraId: INFURA_API_KEY,
  }),
)
