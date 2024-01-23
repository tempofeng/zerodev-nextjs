"use client"
import { Web3Provider } from "@/app/Web3Provider"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import Passkey from "@/app/Passkey"

export default function Home() {
    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
                <Web3Provider>
                    <ConnectButton />
                    <Passkey />
                </Web3Provider>
            </div>
        </main>
    )
}
