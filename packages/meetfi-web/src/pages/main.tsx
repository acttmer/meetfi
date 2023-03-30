import {
  Button,
  Card,
  Col,
  Container,
  Row,
  Spacer,
  Text,
} from '@nextui-org/react'
import { ConnectKitButton } from 'connectkit'
import { useNavigate } from 'react-router-dom'
import { useAccount } from 'wagmi'

export default () => {
  const navigate = useNavigate()
  const { address } = useAccount()

  return (
    <Container
      sm
      css={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        h1
        size={150}
        css={{
          textGradient: '45deg, $blue600 -20%, $pink600 50%',
        }}
        weight="bold"
      >
        MeetFi
      </Text>
      <Row>
        <Col>
          <Card css={{ padding: 20 }}>Create Meeting</Card>
        </Col>
        <Spacer />
        <Col>
          <Card css={{ padding: 20 }}>Share the Link</Card>
        </Col>
        <Spacer />
        <Col>
          <Card css={{ padding: 20 }}>Stake and Meet!</Card>
        </Col>
      </Row>
      <Spacer y={3} />
      <Row align="center" justify="center">
        {address && (
          <>
            <Button color="gradient" onPress={() => navigate('/create')}>
              Create a Meeting
            </Button>
            <Spacer />
          </>
        )}
        <ConnectKitButton />
      </Row>
    </Container>
  )
}
