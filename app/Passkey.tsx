import { useState } from "react"
import { useSessionKeyStore } from "@/app/SessionKeyStore"
import { ModularZerodev } from "@/app/ModularZerodev"
import { WebAuthnMode } from "@zerodev/modular-permission/signers"

export function Passkey() {
    const [email, setEmail] = useState("tempofeng@gmail.com")
    const { serializedSessionKeyAccount } = useSessionKeyStore()

    async function handleRegister() {
        console.log(`Register:${email}`)
        const modularZerodev = new ModularZerodev(useSessionKeyStore)
        const kernelAccount = await modularZerodev.signInByPasskey(email, WebAuthnMode.Register)

        await modularZerodev.sendUserOp(kernelAccount)

        const sig = await modularZerodev.signMessage(kernelAccount, "Hello, world!")
        await modularZerodev.verifySignature(kernelAccount, "Hello, world!", sig)
    }

    async function handleLogin() {
        console.log(`Login:${email}`)
        const modularZerodev = new ModularZerodev(useSessionKeyStore)
        const kernelAccount = await modularZerodev.signInByPasskey(email, WebAuthnMode.Login)

        await modularZerodev.sendUserOp(kernelAccount)

        const sig = await modularZerodev.signMessage(kernelAccount, "Hello, world!")
        await modularZerodev.verifySignature(kernelAccount, "Hello, world!", sig)
    }

    return (
        <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
            <input
                className="w-full p-2 border-2 border-gray-300 rounded-sm text-black"
                type="text"
                placeholder="Your username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <button
                className="m-2 border-2 border-gray-300 rounded-sm"
                onClick={handleRegister}>Register by Passkey
            </button>
            <button
                className="m-2 border-2 border-gray-300 rounded-sm"
                onClick={handleLogin}>Login by Passkey
            </button>
        </div>
    )
}
