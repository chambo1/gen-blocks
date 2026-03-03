"use client"

import { ReactNode, useState, useEffect, useRef } from "react"
import { http, WagmiProvider } from "wagmi"
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { GENLAYER_RPC, GENLAYER_CHAIN_ID } from '@/lib/genlayer'

/**
 * 🔥 Your GenLayer Chain (EXPORTED)
 */
export const genlayerTestnet = {
  id: GENLAYER_CHAIN_ID,
  name: "GenLayer StudioNet",
  network: "genlayer",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [GENLAYER_RPC],
    },
  },
  blockExplorers: {
    default: {
      name: "GenLayer Explorer",
      url: "https://studio.genlayer.com/explorer",
    },
  },
  testnet: true,
} as const

const queryClient = new QueryClient()

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [config, setConfig] = useState<any>(null)

  useEffect(() => {
    // Initialize config ONLY in the browser
    const web3Config = getDefaultConfig({
      appName: "GenBlocks",
      projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "YOUR_WALLETCONNECT_PROJECT_ID",
      chains: [genlayerTestnet],
      transports: {
        [GENLAYER_CHAIN_ID]: http(GENLAYER_RPC),
      },
    })

    setConfig(web3Config)
    setMounted(true)
  }, [])

  if (!mounted || !config) {
    return null
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}