import { useState } from "react"
import { useSessionKeyStore } from "@/app/SessionKeyStore"
import { ModularZerodev } from "@/app/ModularZerodev"
import { WebAuthnMode } from "@zerodev/modular-permission/signers"
import { Hex } from "viem"

export function PasskeyWithSessionKey() {
    const [email, setEmail] = useState("tempofeng@gmail.com")
    const [sessionPrivateKey, setSessionPrivateKey] = useState<Hex>(process.env.NEXT_PUBLIC_DEFAULT_SESSION_PRIVATE_KEY! as Hex)
    const { serializedSessionKeyAccount } = useSessionKeyStore()
    const [smartWalletAddress, setSmartWalletAddress] = useState<string>()
    const [message, setMessage] = useState<string>()

    async function register() {
        setMessage(undefined)
        const modularZerodev = new ModularZerodev(useSessionKeyStore)
        const kernelAccount = await modularZerodev.signInByPasskey(email, WebAuthnMode.Register, sessionPrivateKey)
        setSmartWalletAddress(kernelAccount.address)
        setMessage("kernel account created")
    }

    async function login() {
        setMessage(undefined)
        const modularZerodev = new ModularZerodev(useSessionKeyStore)
        const kernelAccount = await modularZerodev.signInByPasskey(email, WebAuthnMode.Login, sessionPrivateKey)
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
            <div className="z-10 w-full items-center justify-between font-mono text-lg lg:flex  pt-3 pb-3">
                <h1 className="underline">Passkey with session key</h1>
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
                    <p>Email:</p>
                    <input
                        className="p-2 w-full border-2 border-gray-300 rounded-sm text-black"
                        type="text"
                        placeholder="Your username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <p>AA: {smartWalletAddress}</p>
                    <p>SerializedSessionKeyAccount: {`${serializedSessionKeyAccount?.substring(0, 24)}...`}</p>
                    <p>Message: {message}</p>
                </div>
                <button
                    className="m-2 p-2 border-2 border-gray-300 rounded-sm"
                    onClick={register}>Register
                </button>
                <button
                    className="m-2 p-2 border-2 border-gray-300 rounded-sm"
                    onClick={login}>Login
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
