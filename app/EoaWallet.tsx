import { useWalletClient } from "wagmi"
import { ModularZerodev } from "@/app/ModularZerodev"
import { useSessionKeyStore } from "@/app/sessionKeyStore"
import { useRef, useState } from "react"
import { KernelSmartAccount } from "@zerodev/sdk"

export function EoaWallet() {
    const [smartWalletAddress, setSmartWalletAddress] = useState<string>()
    const [message, setMessage] = useState<string>()
    const kernelAccount = useRef<KernelSmartAccount>()
    const { data: signer } = useWalletClient()

    async function login() {
        if (!signer) {
            return
        }
        setMessage(undefined)
        const modularZerodev = new ModularZerodev(useSessionKeyStore)
        kernelAccount.current = await modularZerodev.signInByEoa(signer)
        setSmartWalletAddress(kernelAccount.current.address)
        setMessage("kernel account created")
    }

    async function sendUserOp() {
        if (!kernelAccount.current) {
            return
        }
        try {
            setMessage(undefined)
            const modularZerodev = new ModularZerodev(useSessionKeyStore)
            await modularZerodev.sendUserOp(kernelAccount.current)
            setMessage("user op sent")
        } catch (e: any) {
            console.error(e)
            setMessage(e.details)
        }
    }

    return (
        <>
            <div className="z-10 w-full items-center justify-between font-mono text-lg lg:flex pt-3 pb-3">
                <h1 className="underline">EOA smart wallet without session key</h1>
            </div>
            <div className="z-10 w-full items-center justify-between font-mono text-sm lg:flex">
                <div className="w-full">
                    <p>AA: {smartWalletAddress}</p>
                    <p>Message: {message}</p>
                </div>
                <button
                    className="m-2 p-2 border-2 border-gray-300 rounded-sm"
                    onClick={login}>
                    Login
                </button>
                <button
                    className="m-2 p-2 border-2 border-gray-300 rounded-sm"
                    onClick={sendUserOp}>
                    Send User Op
                </button>
            </div>
        </>
    )
}