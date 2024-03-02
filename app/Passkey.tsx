import { useRef, useState } from "react"
import { useSessionKeyStore } from "@/app/sessionKeyStore"
import { ModularZerodev } from "@/app/ModularZerodev"
import { WebAuthnMode } from "@zerodev/modular-permission/signers"
import { KernelSmartAccount } from "@zerodev/sdk"

export function Passkey() {
    const [email, setEmail] = useState("tempofeng@gmail.com")
    const [smartWalletAddress, setSmartWalletAddress] = useState<string>()
    const [message, setMessage] = useState<string>()
    const kernelAccount = useRef<KernelSmartAccount>()

    async function register() {
        setMessage(undefined)
        const modularZerodev = new ModularZerodev(useSessionKeyStore)
        kernelAccount.current = await modularZerodev.signInByPasskey(email, WebAuthnMode.Register)
        setSmartWalletAddress(kernelAccount.current.address)
        setMessage("kernel account created")
    }

    async function login() {
        setMessage(undefined)
        const modularZerodev = new ModularZerodev(useSessionKeyStore)
        kernelAccount.current = await modularZerodev.signInByPasskey(email, WebAuthnMode.Login)
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
            <div className="z-10 w-full items-center justify-between font-mono text-lg lg:flex  pt-3 pb-3">
                <h1 className="underline">Passkey without session key</h1>
            </div>
            <div className="z-10 w-full items-center justify-between font-mono text-sm lg:flex">
                <div className="w-full">
                    <p>Email:</p>
                    <input
                        className="p-2 border-2 border-gray-300 rounded-sm text-black"
                        type="text"
                        placeholder="Your username"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <p>AA: {smartWalletAddress}</p>
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
            </div>
        </>
    )
}
