import { useConnect } from "wagmi"
import { ZeroDevConnector } from "@zerodev/wagmi"
import { createPasskeyOwner, getPasskeyOwner } from "@zerodev/sdk/passkey"
import { chains, projectId } from "@/app/Web3Provider"

function Passkey() {
    const { connect } = useConnect()

    const handleLogin = async () => {
        connect({
            connector: new ZeroDevConnector({
                chains, options: {
                    projectId,
                    owner: await getPasskeyOwner({ projectId }),
                },
            }),
        })
    }

    const handleRegister = async () => {
        connect({
            connector: new ZeroDevConnector({
                chains, options: {
                    projectId,
                    owner: await createPasskeyOwner({ name: "ZeroDev", projectId }),
                },
            }),
        })
    }


    return (
        <div className="flex">
            <button
                className="p-4 m-4 border-2"
                onClick={handleLogin}
            >
                Login
            </button>
            <button
                className="p-4 m-4 border-2"
                onClick={handleRegister}
            >
                Register
            </button>
        </div>
    )

}

export default Passkey