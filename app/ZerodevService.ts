import { createPasskeyValidator, getPasskeyValidator, KernelValidator } from "@zerodev/passkey-validator"
import { Chain, createPublicClient, http, parseAbi, PrivateKeyAccount, PublicClient } from "viem"
import { oneAddress, serializeSessionKeyAccount, signerToSessionKeyValidator } from "@zerodev/session-key"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import {
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient,
    KernelSmartAccount,
} from "@zerodev/sdk"
import { SessionKeyStore } from "@/app/sessionKeyStore"
import { polygonMumbai } from "viem/chains"

const BUNDLER_URL = `https://rpc.zerodev.app/api/v2/bundler/${process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID}`
const PAYMASTER_URL = `https://rpc.zerodev.app/api/v2/paymaster/${process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID}`
const PASSKEY_SERVER_URL = `https://passkeys.zerodev.app/api/v2/${process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID}`

const contractAddress = "0x34bE7f35132E97915633BC1fc020364EA5134863"
const contractABI = parseAbi([
    "function mint(address _to) public",
    "function balanceOf(address owner) external view returns (uint256 balance)",
])


export class ZerodevService {
    constructor(private readonly sessionKeyStore: SessionKeyStore) {
    }

    getPublicClient() {
        return createPublicClient({
            chain: polygonMumbai,
            transport: http(BUNDLER_URL),
        })
    }

    async registerByPasskey(username: string) {
        const publicClient = this.getPublicClient()
        const passkeyValidator = await createPasskeyValidator(publicClient, {
            passkeyName: username,
            passkeyServerUrl: PASSKEY_SERVER_URL,
        })

        const sessionPrivateKey = generatePrivateKey()
        const sessionKeySigner = privateKeyToAccount(sessionPrivateKey)
        const sessionKeyAccount = await this.createSessionKeyAccount(publicClient, passkeyValidator, sessionKeySigner)
        const serializedSessionKeyAccount = await serializeSessionKeyAccount(sessionKeyAccount, sessionPrivateKey)
        this.sessionKeyStore.getState().update(username, serializedSessionKeyAccount)
        console.log(serializedSessionKeyAccount)
    }

    async loginByPasskey(username: string) {
        const publicClient = this.getPublicClient()
        const passkeyValidator = await getPasskeyValidator(publicClient, {
            passkeyServerUrl: PASSKEY_SERVER_URL,
        })

        const sessionPrivateKey = generatePrivateKey()
        const sessionKeySigner = privateKeyToAccount(sessionPrivateKey)
        const sessionKeyAccount = await this.createSessionKeyAccount(publicClient, passkeyValidator, sessionKeySigner)

        const serializedSessionKeyAccount = await serializeSessionKeyAccount(sessionKeyAccount, sessionPrivateKey)
        this.sessionKeyStore.getState().update(username, serializedSessionKeyAccount)
        console.log(serializedSessionKeyAccount)
    }

    async createSessionKeyAccount(publicClient: PublicClient, sudoValidator: KernelValidator, sessionKeySigner: PrivateKeyAccount) {
        const sessionKeyValidator = await signerToSessionKeyValidator(publicClient, {
            signer: sessionKeySigner,
            validatorData: {
                paymaster: oneAddress,
                permissions: [
                    {
                        target: contractAddress,
                        // Maximum value that can be transferred.  In this case we
                        // set it to zero so that no value transfer is possible.
                        valueLimit: BigInt(0),
                        // Contract abi
                        abi: contractABI,
                        // Function name
                        functionName: "mint",
                        // An array of conditions, each corresponding to an argument for
                        // the function.
                        args: [null],
                    },
                ],
            },
        })

        return createKernelAccount(publicClient, {
            plugins: {
                sudo: sudoValidator,
                regular: sessionKeyValidator,
            },
        })
    }

    createKernelClient(chain: Chain, kernelAccount: KernelSmartAccount) {
        return createKernelAccountClient({
            account: kernelAccount,
            chain,
            transport: http(BUNDLER_URL),
            sponsorUserOperation: async ({ userOperation }) => {
                const zerodevPaymaster = createZeroDevPaymasterClient({
                    chain,
                    transport: http(PAYMASTER_URL),
                })
                return zerodevPaymaster.sponsorUserOperation({
                    userOperation,
                })
            },
        })
    }
}