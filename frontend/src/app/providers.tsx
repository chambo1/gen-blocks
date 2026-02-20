"use client"

import { ReactNode, useState, useEffect } from "react"
import { http, createConfig, WagmiProvider } from "wagmi"
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { CONTRACT_ADDRESS, CONTRACT_ABI, GENLAYER_RPC, GENLAYER_CHAIN_ID } from '@/lib/genlayer'

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

//
// 🧠 Wagmi v2 Config
//
const config = getDefaultConfig({
  appName: "GenBlocks",
  projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "YOUR_WALLETCONNECT_PROJECT_ID",
  chains: [genlayerTestnet],
  // Removed ssr: true because it breaks localStorage persistence on refresh without cookieStorage
  transports: {
    [genlayerTestnet.id]: http(GENLAYER_RPC),
  },
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
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