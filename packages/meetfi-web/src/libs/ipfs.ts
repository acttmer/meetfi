import { NFTStorage } from 'nft.storage'
import { NFT_STORAGE_TOKEN } from './constants'

export const nftStorage = new NFTStorage({ token: NFT_STORAGE_TOKEN })

export const getIPFSURL = (uri: string) => {
  const replaced = uri.replace('ipfs://', '')

  return `https://nftstorage.link/ipfs/${replaced}`
}

export const getIPFSMetadataJSON = async (uri: string) => {
  const res = await fetch(getIPFSURL(uri))

  return res.json()
}
