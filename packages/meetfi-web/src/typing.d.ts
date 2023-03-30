declare interface MeetingNFTMetadata {
  name: string
  description: string
  image: string
  meeting: {
    date: string
    time: string
    stake: string
  }
}

declare interface MeetingJoinRequest {
  tokenId: string
  user: string
  txHash: string
  approvals?: Record<string, boolean>
}
