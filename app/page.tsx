"use client"
import { Web3Provider } from "@/app/Web3Provider"
import { PasskeyWithSessionKey } from "./PasskeyWithSessionKey"
import { EoaWalletWithSessionKey } from "@/app/EoaWalletWithSessionKey"
import { EoaWallet } from "@/app/EoaWallet"
import { WagmiConnect } from "@/app/WagmiConnect"
import { Passkey } from "@/app/Passkey"

export default function Home() {
    return (
        <Web3Provider>
            <main className="flex flex-col items-center justify-between p-24">
                <WagmiConnect />
                <EoaWallet />
                <EoaWalletWithSessionKey />
                <Passkey />
                <PasskeyWithSessionKey />
            </main>
        </Web3Provider>
    )
}
