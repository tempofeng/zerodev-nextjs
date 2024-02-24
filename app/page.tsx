"use client"
import { Web3Provider } from "@/app/Web3Provider"
import { Passkey } from "./Passkey"

export default function Home() {
    return (
        <Web3Provider>
            <main className="flex min-h-screen flex-col items-center justify-between p-24">
                <Passkey></Passkey>
            </main>
        </Web3Provider>
    )
}
