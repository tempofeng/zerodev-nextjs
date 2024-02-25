import { SessionKeyStore } from "@/app/SessionKeyStore"
import { toECDSASigner, toWebAuthnSigner, WebAuthnMode } from "@zerodev/modular-permission/signers"
import {
    type Account,
    Address,
    Chain,
    createPublicClient,
    hashMessage,
    http,
    pad,
    type Transport,
    WalletClient,
    zeroAddress,
} from "viem"
import { polygonMumbai } from "viem/chains"
import { createPermissionValidator } from "@zerodev/modular-permission"
import { toMerklePolicy, toSignaturePolicy, toSudoPolicy } from "@zerodev/modular-permission/policies"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import {
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient,
    KernelSmartAccount,
} from "@zerodev/sdk"
import { getAction, walletClientToSmartAccountSigner } from "permissionless"
import { readContract } from "viem/actions"
import { MockRequestorAbi } from "./abis/MockRequestorAbi"

const BUNDLER_URL = `https://rpc.zerodev.app/api/v2/bundler/${process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID}`
const PAYMASTER_URL = `https://rpc.zerodev.app/api/v2/paymaster/${process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID}`
const PASSKEY_SERVER_URL = `https://passkeys.zerodev.app/api/v2/${process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID}`
const CHAIN = polygonMumbai

const ENTRY_POINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789"
const ACCOUNT_LOGIC_ADDRESS = "0x5FC0236D6c88a65beD32EECDC5D60a5CAb377717"
const MOCK_REQUESTOR_ADDRESS = "0x67e0a05806A54f6C2162a91810BD50eFe28e0460"

export class ModularZerodev<TChain extends Chain | undefined = Chain | undefined> {
    constructor(private readonly sessionKeyStore: SessionKeyStore) {
    }

    private getPublicClient() {
        return createPublicClient({
            transport: http(BUNDLER_URL),
        })
    }

    async signInByPasskey(passkeyName: string, mode: WebAuthnMode) {
        const sessionPrivateKey = generatePrivateKey()
        const kernelAccount = await this.createPasskeyKernelAccount(passkeyName, mode, sessionPrivateKey)
        console.log("kernelAccount", kernelAccount)

        // TODO serializeSessionKeyAccount() doesn't work on modular account
        // const serializedSessionKeyAccount = await serializeSessionKeyAccount(kernelAccount, sessionPrivateKey)
        // this.sessionKeyStore.getState().update(passkeyName, serializedSessionKeyAccount)
        return kernelAccount
    }

    async signInByEoa(walletClient: WalletClient<Transport, TChain, Account>) {
        const sessionPrivateKey = generatePrivateKey()
        const smartAccountSigner = walletClientToSmartAccountSigner(walletClient)
        const kernelAccount = await this.createEoaKernelAccount(walletClient, sessionPrivateKey)
        console.log("kernelAccount", kernelAccount)

        // TODO serializeSessionKeyAccount() doesn't work on modular account
        // const serializedSessionKeyAccount = await serializeSessionKeyAccount(kernelAccount, sessionPrivateKey)
        // this.sessionKeyStore.getState().update(passkeyName, serializedSessionKeyAccount)
        return kernelAccount
    }

    async signMessage(kernelAccount: KernelSmartAccount, message: string) {
        const kernelClient = this.createKernelClient(CHAIN, kernelAccount)
        const sig = await kernelClient.signMessage({
            message,
        })
        console.log("signMessage", sig)
        return sig
    }

    async sendUserOp(kernelAccount: KernelSmartAccount) {
        const kernelClient = this.createKernelClient(CHAIN, kernelAccount)
        const userOpHash = await kernelClient.sendUserOperation({
            userOperation: {
                callData: await kernelClient.account.encodeCallData({
                    to: zeroAddress,
                    value: 0n,
                    data: pad("0x", { size: 4 }),
                }),
            },
        })
        console.log("sendUserOp", userOpHash)
    }

    async verifySignature(kernelAccount: KernelSmartAccount, message: string, signature: string) {
        const kernelClient = this.createKernelClient(CHAIN, kernelAccount)
        const response = await getAction(
            kernelClient.account.client,
            readContract,
        )({
            abi: MockRequestorAbi,
            address: MOCK_REQUESTOR_ADDRESS,
            functionName: "verifySignature",
            args: [
                kernelClient.account.address,
                hashMessage(message),
                signature,
            ],
        })
        console.log("Signature verified response: ", response)
    }

    async createEoaKernelAccount(walletClient: WalletClient<Transport, TChain, Account>, sessionPrivateKey: Address) {
        const publicClient = this.getPublicClient()
        const smartAccountSigner = walletClientToSmartAccountSigner(walletClient)
        // TODO signer type mismatch
        const modularPermissionPlugin = await createPermissionValidator(
            publicClient,
            {
                signer: smartAccountSigner,
                policies: [await toSudoPolicy({})],
            },
        )

        const sessionKeyAccount = privateKeyToAccount(sessionPrivateKey)
        const sessionKeySigner = toECDSASigner({ signer: sessionKeyAccount })
        const sessionKeyModularPermissionPlugin = await createPermissionValidator(
            publicClient,
            {
                signer: sessionKeySigner,
                policies: [
                    await toMerklePolicy({
                        permissions: [
                            {
                                target: zeroAddress,
                            },
                        ],
                    }),
                    await toSignaturePolicy({
                        allowedRequestors: [
                            MOCK_REQUESTOR_ADDRESS,
                        ],
                    }),
                ],
            },
        )

        return createKernelAccount(publicClient, {
            entryPoint: ENTRY_POINT_ADDRESS,
            accountLogicAddress: ACCOUNT_LOGIC_ADDRESS,
            plugins: {
                sudo: modularPermissionPlugin,
                regular: sessionKeyModularPermissionPlugin,
            },
        })
    }

    async createPasskeyKernelAccount(passkeyName: string, mode: WebAuthnMode, sessionPrivateKey: Address) {
        const publicClient = this.getPublicClient()

        const webAuthnModularSigner = await toWebAuthnSigner(publicClient, {
            passkeyName,
            passkeyServerUrl: PASSKEY_SERVER_URL,
            mode,
        })
        const modularPermissionPlugin = await createPermissionValidator(
            publicClient,
            {
                signer: webAuthnModularSigner,
                policies: [await toSudoPolicy({})],
            },
        )

        const sessionKeyAccount = privateKeyToAccount(sessionPrivateKey)
        const sessionKeySigner = toECDSASigner({ signer: sessionKeyAccount })
        const sessionKeyModularPermissionPlugin = await createPermissionValidator(
            publicClient,
            {
                signer: sessionKeySigner,
                policies: [
                    await toMerklePolicy({
                        permissions: [
                            {
                                target: zeroAddress,
                            },
                        ],
                    }),
                    await toSignaturePolicy({
                        allowedRequestors: [
                            MOCK_REQUESTOR_ADDRESS,
                        ],
                    }),
                ],
            },
        )

        return createKernelAccount(publicClient, {
            entryPoint: ENTRY_POINT_ADDRESS,
            accountLogicAddress: ACCOUNT_LOGIC_ADDRESS,
            plugins: {
                sudo: modularPermissionPlugin,
                regular: sessionKeyModularPermissionPlugin,
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
                    entryPoint: ENTRY_POINT_ADDRESS,
                })
            },
        })
    }
}