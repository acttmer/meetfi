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
  const [safeService, setSafeService] = useState<SafeServiceClient>()
  const [owners, setOwners] = useState<string[]>()
  const [joinRequests, setJoinRequests] = useState<MeetingJoinRequest[]>()
  const [withdrawRequests, setWithdrawRequests] =
    useState<MeetingWithdrawRequest[]>()

  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>()

  const loadJoinRequests = useCallback(async () => {
    const snapshots = await getDocs(
      query(collection(firestore, 'join_requests'), where('tokenId', '==', id)),
    )

    setJoinRequests(snapshots.docs.map(doc => doc.data() as MeetingJoinRequest))
  }, [id])

  const loadWithdrawRequests = useCallback(async () => {
    const snapshots = await getDocs(
      query(
        collection(firestore, 'withdraw_requests'),
        where('tokenId', '==', id),
      ),
    )

    setWithdrawRequests(
      snapshots.docs.map(doc => doc.data() as MeetingWithdrawRequest),
    )
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
      const safeService_ = new SafeServiceClient({
        txServiceUrl: 'https://safe-transaction-base-testnet.safe.global/',
        ethAdapter,
      })

      const owners_ = await safe_.getOwners()

      await loadJoinRequests()
      await loadWithdrawRequests()

      setMetadata(metadata_)
      setSafe(safe_)
      setSafeService(safeService_)
      setOwners(owners_)
    })()
  }, [id, loadJoinRequests, loadWithdrawRequests, provider, signer])

  const handleJoin = useCallback(async () => {
    if (!signer || !address || !safe || !safeService || !owners || !metadata)
      return

    setLoading(true)
    setLoadingMessage('Transferring stake')

    await signer.sendTransaction({
      to: safe.getAddress(),
      value: ethers.utils.parseEther(metadata.meeting.stake),
    })

    setLoadingMessage('Sending join request')

    const safeTx = await safe.createAddOwnerTx({
      ownerAddress: address,
      threshold: 1,
    })

    const safeTxHash = await safe.getTransactionHash(safeTx)

    await setDoc(doc(collection(firestore, 'join_requests'), safeTxHash), {
      tokenId: id,
      user: address,
      safeTxHash,
      safeTxData: safeTx.data,
    })

    await loadJoinRequests()

    setLoading(false)
    setLoadingMessage(undefined)
  }, [
    address,
    id,
    loadJoinRequests,
    metadata,
    owners,
    safe,
    safeService,
    signer,
  ])

  const handleWithdraw = useCallback(async () => {
    if (!signer || !address || !safe || !safeService || !owners || !metadata)
      return

    setLoading(true)
    setLoadingMessage('Sending withdraw request')

    const transferSafeTx = await safe.createTransaction({
      safeTransactionData: {
        to: address,
        value: ethers.utils
          .parseUnits(metadata.meeting.stake, 'ether')
          .toString(),
        data: '0x',
      },
    })

    const transferSafeTxHash = await safe.getTransactionHash(transferSafeTx)

    const removeOwnerSafeTx = await safe.createRemoveOwnerTx({
      ownerAddress: address,
      threshold: 1,
    })

    const removeOwnerSafeTxHash = await safe.getTransactionHash(
      removeOwnerSafeTx,
    )

    await setDoc(doc(collection(firestore, 'withdraw_requests'), address), {
      tokenId: id,
      user: address,
      transferSafeTxHash,
      transferSafeTxData: transferSafeTx.data,
      removeOwnerSafeTxHash,
      removeOwnerSafeTxData: removeOwnerSafeTx.data,
    })

    await loadWithdrawRequests()

    setLoading(false)
    setLoadingMessage(undefined)
  }, [
    address,
    id,
    loadWithdrawRequests,
    metadata,
    owners,
    safe,
    safeService,
    signer,
  ])

  const handleApproveJoin = useCallback(
    async ({ safeTxHash, safeTxData }: MeetingJoinRequest) => {
      if (!address || !signer || !safe || !safeService) return

      setLoading(true)
      setLoadingMessage('Approving join request')

      const ethSignSignature = await safe.signTransactionHash(safeTxHash)

      await safeService.proposeTransaction({
        safeAddress: safe.getAddress(),
        safeTxHash,
        safeTransactionData: safeTxData,
        senderAddress: address,
        senderSignature: ethSignSignature.data,
      })

      const safeTx = await safeService.getTransaction(safeTxHash)

      const approval = await safe.approveTransactionHash(safeTxHash)
      await approval.transactionResponse?.wait()

      const execution = await safe.executeTransaction(safeTx)
      await execution.transactionResponse?.wait()

      await deleteDoc(doc(collection(firestore, 'join_requests'), safeTxHash))
      await loadJoinRequests()

      setOwners(await safe.getOwners())

      setLoading(false)
      setLoadingMessage(undefined)
    },
    [address, loadJoinRequests, safe, safeService, signer],
  )

  const handleApproveWithdraw = useCallback(
    async ({
      user,
      transferSafeTxHash,
      transferSafeTxData,
      removeOwnerSafeTxHash,
      removeOwnerSafeTxData,
    }: MeetingWithdrawRequest) => {
      if (!address || !signer || !safe || !safeService) return

      setLoading(true)
      setLoadingMessage('Approving withdraw request')

      const transferSig = await safe.signTransactionHash(transferSafeTxHash)
      const removeOwnerSig = await safe.signTransactionHash(
        removeOwnerSafeTxHash,
      )

      await safeService.proposeTransaction({
        safeAddress: safe.getAddress(),
        safeTxHash: transferSafeTxHash,
        safeTransactionData: transferSafeTxData,
        senderAddress: address,
        senderSignature: transferSig.data,
      })

      await safeService.proposeTransaction({
        safeAddress: safe.getAddress(),
        safeTxHash: removeOwnerSafeTxHash,
        safeTransactionData: removeOwnerSafeTxData,
        senderAddress: address,
        senderSignature: removeOwnerSig.data,
      })

      const transferSafeTx = await safeService.getTransaction(
        transferSafeTxHash,
      )
      const removeOwnerSafeTx = await safeService.getTransaction(
        removeOwnerSafeTxHash,
      )

      const transferApproval = await safe.approveTransactionHash(
        transferSafeTxHash,
      )

      await transferApproval.transactionResponse?.wait()

      const removeOwnerApproval = await safe.approveTransactionHash(
        removeOwnerSafeTxHash,
      )

      await removeOwnerApproval.transactionResponse?.wait()

      const transferExec = await safe.executeTransaction(transferSafeTx)
      await transferExec.transactionResponse?.wait()

      const removeOwnerExec = await safe.executeTransaction(removeOwnerSafeTx)
      await removeOwnerExec.transactionResponse?.wait()

      await deleteDoc(doc(collection(firestore, 'withdraw_requests'), user))
      await loadWithdrawRequests()

      setOwners(await safe.getOwners())

      setLoading(false)
      setLoadingMessage(undefined)
    },
    [address, loadWithdrawRequests, safe, safeService, signer],
  )

  return (
    <Container sm css={{ paddingTop: 30, paddingBottom: 30 }}>
      <Text h1>{metadata?.name}</Text>
      <Text size="$lg">{metadata?.description}</Text>
      <Spacer />
      <Card css={{ padding: 20 }}>
        <Text h4>Date & Time</Text>
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
        <Text h4>Need to Stake</Text>
        {metadata && <Text size="$lg">{metadata.meeting.stake} ETH</Text>}
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
          {signer && address && owners && joinRequests && withdrawRequests ? (
            owners.includes(address) ? (
              withdrawRequests.some(
                withdrawRequest => withdrawRequest.user === address,
              ) ? (
                <Button color="secondary" disabled>
                  Withdraw Request is Pending
                </Button>
              ) : owners.length === 1 ? (
                <Button color="secondary" onPress={handleWithdraw}>
                  Finish the Meeting
                </Button>
              ) : (
                <Button color="secondary" onPress={handleWithdraw}>
                  Request to Withdraw
                </Button>
              )
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
                <Row key={joinRequest.safeTxHash} justify="space-between">
                  <User
                    key={joinRequest.user}
                    src={getJazziconDataUrl(joinRequest.user)}
                    name={joinRequest.user}
                    css={{ padding: 0 }}
                  />
                  <Button
                    disabled={!signer}
                    color="success"
                    onPress={() => handleApproveJoin(joinRequest)}
                  >
                    Approve
                  </Button>
                </Row>
              ))}
            </Card>
          </>
        )}
      {address &&
        owners &&
        owners.includes(address) &&
        withdrawRequests &&
        withdrawRequests.length > 0 && (
          <>
            <Spacer />
            <Card css={{ padding: 20 }}>
              <Text h4 css={{ margin: 0 }}>
                Pending Withdraw Requests
              </Text>
              <Spacer />
              {withdrawRequests.map(withdrawRequest => (
                <Row key={withdrawRequest.user} justify="space-between">
                  <User
                    key={withdrawRequest.user}
                    src={getJazziconDataUrl(withdrawRequest.user)}
                    name={withdrawRequest.user}
                    css={{ padding: 0 }}
                  />
                  {withdrawRequest.user !== address && (
                    <Button
                      disabled={!signer}
                      color="success"
                      onPress={() => handleApproveWithdraw(withdrawRequest)}
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
