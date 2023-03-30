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
  safeTxHash: string
  safeTxData: any
}

declare interface MeetingWithdrawRequest {
  tokenId: string
  user: string
  transferSafeTxHash: string
  transferSafeTxData: any
  removeOwnerSafeTxHash: string
  removeOwnerSafeTxData: any
}
