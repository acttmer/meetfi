import { LoadingModal } from '@/components/LoadingModal'
import {
  MEETING_NFT_CONTRACT_ADDRESS,
  MEETING_NFT_IMAGE_URL,
} from '@/libs/constants'
import { nftStorage } from '@/libs/ipfs'
import {
  Button,
  Container,
  Input,
  Row,
  Spacer,
  Text,
  Textarea,
} from '@nextui-org/react'
import { SafeFactory } from '@safe-global/safe-core-sdk'
import EthersAdapter from '@safe-global/safe-ethers-lib'
import { ethers } from 'ethers'
import { MeetingNFT__factory } from 'meetfi-contracts/typechain-types'
import { useCallback, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAccount, useSigner } from 'wagmi'

export default () => {
  const navigate = useNavigate()

  const { address } = useAccount()
  const { data: signer } = useSigner()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [stake, setStake] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMessage, setLoadingMessage] = useState<string>()

  const handleSumbit = useCallback(async () => {
    if (!address || !signer) return

    setLoading(true)
    setLoadingMessage('Creating Safe')

    const ethAdapter = new EthersAdapter({ ethers, signerOrProvider: signer })
    const safeFactory = await SafeFactory.create({ ethAdapter })
    const safe = await safeFactory.deploySafe({
      safeAccountConfig: {
        owners: [address],
        threshold: 1,
      },
    })

    const safeAddress = safe.getAddress()

    console.log('Safe Address', safeAddress)

    setLoadingMessage('Transferring initial stake')

    const transferTx = await signer.sendTransaction({
      to: safeAddress,
      value: ethers.utils.parseEther(stake),
    })

    await transferTx.wait()

    setLoadingMessage('Uploading NFT metadata to IPFS')

    const imageRes = await fetch(MEETING_NFT_IMAGE_URL)
    const image = await imageRes.blob()

    const { url } = await nftStorage.store({
      name,
      description,
      image,
      meeting: {
        date,
        time,
        stake,
      },
    })

    console.log('IPFS URL', url)

    setLoadingMessage('Minting NFT')

    const meetingNFTFactory = new MeetingNFT__factory().connect(signer)
    const meetingNFT = meetingNFTFactory.attach(MEETING_NFT_CONTRACT_ADDRESS)

    const id = ethers.BigNumber.from(ethers.utils.randomBytes(32))

    const mintTx = await meetingNFT.mint(id, safeAddress, url)
    await mintTx.wait()

    console.log('ID', id)

    setLoading(false)
    setLoadingMessage(undefined)

    navigate(`/${id._hex}`)
  }, [address, date, description, name, navigate, signer, stake, time])

  if (!address) {
    return <Navigate to="/" replace />
  }

  return (
    <Container sm css={{ paddingTop: 30, paddingBottom: 30 }}>
      <Text h1>Create Meeting</Text>
      <Spacer />
      <Input
        fullWidth
        size="lg"
        label="Name"
        placeholder="E.g. John Doe"
        value={name}
        onChange={event => setName(event.target.value)}
      />
      <Spacer />
      <Textarea
        fullWidth
        size="lg"
        label="Description"
        placeholder="What's going on?"
        value={description}
        onChange={event => setDescription(event.target.value)}
      />
      <Spacer />
      <Row>
        <Input
          fullWidth
          size="lg"
          type="date"
          label="Date"
          value={date}
          onChange={event => setDate(event.target.value)}
        />
        <Spacer />
        <Input
          fullWidth
          size="lg"
          type="time"
          label="Time"
          value={time}
          onChange={event => setTime(event.target.value)}
        />
      </Row>
      <Spacer />
      <Input
        fullWidth
        size="lg"
        type="number"
        label="Stake"
        placeholder="Amount of native token (E.g. 0.02)"
        value={stake}
        onChange={event => setStake(event.target.value)}
      />
      <Spacer />
      <Row justify="flex-end">
        <Button flat color="error" onPress={() => window.history.back()}>
          Cancel
        </Button>
        <Spacer />
        <Button color="gradient" onPress={handleSumbit}>
          Submit
        </Button>
      </Row>
      <LoadingModal open={loading} message={loadingMessage} />
    </Container>
  )
}
