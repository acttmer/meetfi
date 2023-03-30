import { createTheme, NextUIProvider } from '@nextui-org/react'
import { ConnectKitProvider } from 'connectkit'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { WagmiConfig } from 'wagmi'
import { wagmiClient } from './libs/ethers'
import CreateMeeting from './pages/create-meeting'
import Main from './pages/main'
import Meeting from './pages/meeting'

const theme = createTheme({
  type: 'dark',
  theme: {
    fonts: {
      sans: 'Ubuntu',
    },
  },
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <WagmiConfig client={wagmiClient}>
      <ConnectKitProvider>
        <NextUIProvider theme={theme}>
          <RouterProvider
            router={createBrowserRouter([
              { path: '/', element: <Main /> },
              { path: '/create', element: <CreateMeeting /> },
              { path: '/:id', element: <Meeting /> },
            ])}
          />
        </NextUIProvider>
      </ConnectKitProvider>
    </WagmiConfig>
  </React.StrictMode>,
)
