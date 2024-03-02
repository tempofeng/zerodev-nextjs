import { useWalletClient } from "wagmi"
import { ModularZerodev } from "@/app/ModularZerodev"
import { useSessionKeyStore } from "@/app/sessionKeyStore"
import { useState } from "react"
import { Hex } from "viem"

export function EoaWalletWithSessionKey() {
    const [smartWalletAddress, setSmartWalletAddress] = useState<string>()
    const [sessionPrivateKey, setSessionPrivateKey] = useState<Hex>(process.env.NEXT_PUBLIC_DEFAULT_SESSION_PRIVATE_KEY! as Hex)
    const [message, setMessage] = useState<string>()
    const { data: signer } = useWalletClient()
    const { serializedSessionKeyAccount } = useSessionKeyStore()

    async function login() {
        if (!signer) {
            return
        }
        setMessage(undefined)
        const modularZerodev = new ModularZerodev(useSessionKeyStore)
        const kernelAccount = await modularZerodev.signInByEoa(signer, sessionPrivateKey)
        setSmartWalletAddress(kernelAccount.address)
        setMessage("kernel account created")
    }

    async function sendUserOp() {
        try {
            setMessage(undefined)
            const modularZerodev = new ModularZerodev(useSessionKeyStore)
            await modularZerodev.sendUserOpBySessionKey()
            setMessage("user op sent")
        } catch (e: any) {
            console.error(e)
            setMessage(e.details)
        }
    }

    async function signAndVerify() {
        console.log("signAndVerify")
        try {
            setMessage(undefined)
            const modularZerodev = new ModularZerodev(useSessionKeyStore)
            const sig = await modularZerodev.signMessage("Hello, world!")
            console.log("sig", sig)
            if (!sig) {
                return
            }
            const isValid = await modularZerodev.verifySignature("Hello, world!", sig)
            setMessage(`isValid:${isValid}`)
        } catch (e: any) {
            console.error(e)
            setMessage(e.details)
        }
    }

    return (
        <>
            <div className="z-10 w-full items-center justify-between font-mono text-lg lg:flex pt-3 pb-3">
                <h1 className="underline">EOA smart wallet with session key</h1>
            </div>
            <div className="z-10 w-full items-center justify-between font-mono text-sm lg:flex">
                <div className="w-full">
                    <p>Session Private Key:</p>
                    <input
                        className="p-2 w-full border-2 border-gray-300 rounded-sm text-black"
                        type="text"
                        value={sessionPrivateKey}
                        onChange={(e) => setSessionPrivateKey(e.target.value as Hex)}
                    />
                    <p>AA: {smartWalletAddress}</p>
                    <p>SerializedSessionKeyAccount: {`${serializedSessionKeyAccount?.substring(0, 24)}...`}</p>
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
                <button
                    className="m-2 p-2 border-2 border-gray-300 rounded-sm"
                    onClick={signAndVerify}>
                    Sign and verify
                </button>
            </div>
        </>
    )
}