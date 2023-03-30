import { Loading, Modal, Spacer, Text } from '@nextui-org/react'

export interface LoadingModalProps {
  open: boolean
  message?: string
}

export const LoadingModal: React.FC<LoadingModalProps> = ({
  open,
  message,
}) => {
  return (
    <Modal open={open} preventClose css={{ padding: 20 }}>
      <Loading />
      {message && <Spacer />}
      {message && <Text>{message}</Text>}
    </Modal>
  )
}
