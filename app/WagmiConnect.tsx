import { useAccount, useConnect, useDisconnect } from "wagmi"
import { injected } from "@wagmi/connectors"
import { CHAIN } from "@/app/ModularZerodev"

export function WagmiConnect() {
    const { connect } = useConnect()
    const { address } = useAccount()
    const { disconnect } = useDisconnect()

    async function handleConnect() {
        connect({ connector: injected(), chainId: CHAIN.id })
    }

    async function handleDisconnect() {
        disconnect()
    }

    return (
        <>
            <div className="z-10 w-full items-center justify-between font-mono text-lg lg:flex pt-3 pb-3">
                <h1 className="underline">EOA wallet</h1>
            </div>
            <div className="z-10 w-full items-center justify-between font-mono text-sm lg:flex">
                <div className="w-full">
                    <p>EOA: {address}</p>
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
            </div>
        </>
    )
}