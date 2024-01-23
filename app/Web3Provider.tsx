import "@rainbow-me/rainbowkit/styles.css"
import { configureChains, createConfig, WagmiConfig } from "wagmi"
import { ReactNode } from "react"
import { optimism } from "viem/chains"
import { publicProvider } from "@wagmi/core/providers/public"
import { connectorsForWallets, darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { enhanceWalletWithAAConnector } from "@zerodev/wagmi/rainbowkit"
import { metaMaskWallet } from "@rainbow-me/rainbowkit/wallets"

export const projectId = process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID!

export const { chains, publicClient } = configureChains(
    [optimism],
    [
        publicProvider(),
    ],
)

const connectors = connectorsForWallets([
    {
        groupName: "EOA Wrapped with AA",
        wallets: [enhanceWalletWithAAConnector(
            metaMaskWallet({ chains, projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_ID! }),
            { projectId })],
    },
])

const wagmiConfig = createConfig({
    autoConnect: false,
    connectors,
    publicClient,
})

export function Web3Provider({ children }: { children: ReactNode }) {
    return (
        <WagmiConfig config={wagmiConfig}>
            <RainbowKitProvider theme={darkTheme()} chains={chains} modalSize="compact">
                {children}
            </RainbowKitProvider>
        </WagmiConfig>
    )
}