import "@rainbow-me/rainbowkit/styles.css"
import { configureChains, createConfig, WagmiConfig } from "wagmi"
import { ReactNode } from "react"
import { polygonMumbai } from "viem/chains"
import { publicProvider } from "@wagmi/core/providers/public"
import { connectorsForWallets, darkTheme, RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { enhanceWalletWithAAConnector } from "@zerodev/wagmi/rainbowkit"
import { metaMaskWallet } from "@rainbow-me/rainbowkit/wallets"

export const projectId = "b5486fa4-e3d9-450b-8428-646e757c10f6"

export const { chains, publicClient } = configureChains(
    [polygonMumbai],
    [
        publicProvider(),
    ],
)

const connectors = connectorsForWallets([
    {
        groupName: "EOA Wrapped with AA",
        wallets: [enhanceWalletWithAAConnector(
            metaMaskWallet({ chains, projectId: "017fb30c4a4c2cc7a9621738869c0214" }),
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