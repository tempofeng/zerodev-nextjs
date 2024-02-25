import { useAccount, useConnect, useDisconnect, useWalletClient } from "wagmi"
import { injected } from "@wagmi/connectors"
import { ModularZerodev } from "@/app/ModularZerodev"
import { useSessionKeyStore } from "@/app/SessionKeyStore"
import { useState } from "react"

export function EoaWallet() {
    const [smartWalletAddress, setSmartWalletAddress] = useState()
    const { connect } = useConnect()
    const { address } = useAccount()
    const { disconnect } = useDisconnect()
    const { data: signer } = useWalletClient()

    async function handleConnect() {
        connect({ connector: injected() })
    }

    async function handleDisconnect() {
        disconnect()
    }

    async function handleSignin() {
        if (!signer) {
            return
        }
        const modularZerodev = new ModularZerodev(useSessionKeyStore)
        const kernelAccount = await modularZerodev.signInByEoa(signer)

        await modularZerodev.sendUserOp(kernelAccount)

        const sig = await modularZerodev.signMessage(kernelAccount, "Hello, world!")
        await modularZerodev.verifySignature(kernelAccount, "Hello, world!", sig)
    }

    return (
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
            <div>
                <p>EOA: {address}</p>
                <p>AA: {smartWalletAddress}</p>
            </div>
            <button
                className="m-2 p-2 border-2 border-gray-300 rounded-sm"
                onClick={handleConnect}>
                Connect
            </button>
            <button
                className="m-2 p-2 border-2 border-gray-300 rounded-sm"
                onClick={handleDisconnect}>
                Disconnect
            </button>
            <button
                className="m-2 p-2 border-2 border-gray-300 rounded-sm"
                onClick={handleSignin}>
                Signin By EOA
            </button>
        </div>
    )
}