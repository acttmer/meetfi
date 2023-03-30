import { LoadingModal } from '@/components/LoadingModal'
import { MEETING_NFT_CONTRACT_ADDRESS } from '@/libs/constants'
import { firestore } from '@/libs/firebase'
import { getIPFSMetadataJSON } from '@/libs/ipfs'
import { getJazziconDataUrl } from '@/libs/utils'
import {
  Button,
  Card,
  Container,
  Row,
  Spacer,
  Text,
  User,
} from '@nextui-org/react'
import Safe from '@safe-global/safe-core-sdk'
import EthersAdapter from '@safe-global/safe-ethers-lib'
import SafeServiceClient from '@safe-global/safe-service-client'
import { ConnectKitButton } from 'connectkit'
import { ethers } from 'ethers'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  setDoc,
  where,
} from 'firebase/firestore'
import { MeetingNFT__factory } from 'meetfi-contracts/typechain-types'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useAccount, useProvider, useSigner } from 'wagmi'

const useTokenId = () => {
  const { id: id_ } = useParams()

  return ethers.BigNumber.from(id_)._hex
}

export default () => {
  const { address } = useAccount()
  const { data: signer } = useSigner()

  const id = useTokenId()
  const provider = useProvider()

  const [metadata, setMetadata] = useState<MeetingNFTMetadata>()
  const [safe, setSafe] = useState<Safe>()
  const [owners, setOwners] = useState<string[]>()
  const [joinRequests, setJoinRequests] = useState<MeetingJoinRequest[]>()
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>()

  const loadJoinRequests = useCallback(async () => {
    const snapshots = await getDocs(
      query(collection(firestore, 'join_requests'), where('tokenId', '==', id)),
    )

    setJoinRequests(snapshots.docs.map(doc => doc.data() as MeetingJoinRequest))
  }, [id])

  useEffect(() => {
    ;(async () => {
      const meetingNFTFactory = new MeetingNFT__factory()
      const meetingNFT = meetingNFTFactory
        .attach(MEETING_NFT_CONTRACT_ADDRESS)
        .connect(signer || provider)

      const ethAdapter = new EthersAdapter({
        ethers,
        signerOrProvider: signer || provider,
      })

      const uri = await meetingNFT.uri(id)
      const safeAddress = await meetingNFT.getSafeAddress(id)

      const metadata_ = await getIPFSMetadataJSON(uri)
      const safe_ = await Safe.create({ ethAdapter, safeAddress })
      const owners_ = await safe_.getOwners()

      await loadJoinRequests()

      setMetadata(metadata_)
      setSafe(safe_)
      setOwners(owners_)
    })()
  }, [id, loadJoinRequests, provider, signer])

  const handleJoin = useCallback(async () => {
    if (!signer || !address || !safe || !owners || !metadata) return

    setLoading(true)
    setLoadingMessage('Transferring stake')

    await signer.sendTransaction({
      to: safe.getAddress(),
      value: ethers.utils.parseEther(metadata.meeting.stake),
    })

    setLoadingMessage('Sending join request')

    const tx = await safe.createAddOwnerTx({ ownerAddress: address })
    const txHash = await safe.getTransactionHash(tx)

    await setDoc(doc(collection(firestore, 'join_requests'), txHash), {
      tokenId: id,
      user: address,
      txHash,
    })

    setLoading(false)
    setLoadingMessage(undefined)

    console.log(txHash)
  }, [address, id, metadata, owners, safe, signer])

  const handleWithdraw = useCallback(async () => {
    if (!signer) return
  }, [signer])

  const handleApprove = useCallback(
    async (txHash: string) => {
      if (!address || !signer || !safe) return

      setLoading(true)
      setLoadingMessage('Approving join request')

      const safeService = new SafeServiceClient({
        txServiceUrl: '',
        ethAdapter: new EthersAdapter({
          ethers,
          signerOrProvider: signer,
        }),
      })

      const threshold = await safe.getThreshold()

      const approval = await safe.approveTransactionHash(txHash)
      await approval.transactionResponse?.wait()

      const tx = await safeService.getTransaction(txHash)
      const owners_ = await safe.getOwnersWhoApprovedTx(txHash)

      if (owners_.length >= threshold) {
        const execution = await safe.executeTransaction(tx)
        await execution.transactionResponse?.wait()

        await deleteDoc(doc(collection(firestore, 'join_requests'), txHash))
      } else {
        await setDoc(doc(collection(firestore, 'join_requests'), txHash), {
          approvals: {
            address: true,
          },
        })
      }

      await loadJoinRequests()

      setLoading(false)
      setLoadingMessage(undefined)
    },
    [address, loadJoinRequests, safe, signer],
  )

  return (
    <Container sm css={{ paddingTop: 30, paddingBottom: 30 }}>
      <Text h1>{metadata?.name}</Text>
      <Text size="$lg">{metadata?.description}</Text>
      <Spacer />
      <Card css={{ padding: 20 }}>
        <Text h4>When</Text>
        {metadata && (
          <Text size="$lg">
            {new Date(
              `${metadata.meeting.date} ${metadata.meeting.time}`,
            ).toString()}
          </Text>
        )}
      </Card>
      <Spacer />
      <Card css={{ padding: 20 }}>
        <Text h4>Stake</Text>
        {metadata && <Text size="$lg">{metadata.meeting.stake} MATIC</Text>}
      </Card>
      <Spacer />
      <Card css={{ padding: 20 }}>
        <Text h4 css={{ margin: 0 }}>
          Participants
        </Text>
        <Spacer />
        <Row wrap="wrap">
          {owners?.map(owner => (
            <User
              key={owner}
              src={getJazziconDataUrl(owner)}
              name={owner}
              css={{
                padding: 0,
                marginBottom: 15,
                '&:last-child': {
                  marginBottom: 0,
                },
              }}
            />
          ))}
        </Row>
        <Spacer />
        <Row justify="flex-end">
          {signer && address && owners && joinRequests ? (
            owners.includes(address) ? (
              <Button color="secondary" onPress={handleWithdraw}>
                Request to Withdraw
              </Button>
            ) : joinRequests.some(
                joinRequest => joinRequest.user === address,
              ) ? (
              <Button color="gradient" disabled>
                Join Request is Pending
              </Button>
            ) : (
              <Button color="gradient" onPress={handleJoin}>
                Request to Join
              </Button>
            )
          ) : (
            <ConnectKitButton />
          )}
        </Row>
      </Card>
      {address &&
        owners &&
        owners.includes(address) &&
        joinRequests &&
        joinRequests.length > 0 && (
          <>
            <Spacer />
            <Card css={{ padding: 20 }}>
              <Text h4 css={{ margin: 0 }}>
                Pending Join Requests
              </Text>
              <Spacer />
              {joinRequests.map(joinRequest => (
                <Row key={joinRequest.txHash} justify="space-between">
                  <User
                    key={joinRequest.user}
                    src={getJazziconDataUrl(joinRequest.user)}
                    name={joinRequest.user}
                    css={{ padding: 0 }}
                  />
                  {joinRequest.approvals?.[address] ? null : (
                    <Button
                      color="success"
                      onPress={() => handleApprove(joinRequest.txHash)}
                    >
                      Approve
                    </Button>
                  )}
                </Row>
              ))}
            </Card>
          </>
        )}
      <LoadingModal open={loading} message={loadingMessage} />
    </Container>
  )
}
