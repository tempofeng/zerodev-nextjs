"use client"
import { Web3Provider } from "@/app/Web3Provider"
import { Passkey } from "./Passkey"
import { EoaWallet } from "@/app/EoaWallet"

export default function Home() {
    return (
        <Web3Provider>
            <main className="flex flex-col items-center justify-between p-24">
                <Passkey/>
                <EoaWallet/>
            </main>
        </Web3Provider>
    )
}
