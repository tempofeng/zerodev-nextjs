import { SessionKeyStore } from "@/app/SessionKeyStore"
import { toECDSASigner, toWebAuthnSigner, WebAuthnMode } from "@zerodev/modular-permission/signers"
import {
    type Account,
    Address,
    Chain,
    createPublicClient,
    hashMessage,
    Hex,
    http,
    pad,
    type Transport,
    WalletClient,
    zeroAddress,
} from "viem"
import { polygonMumbai } from "viem/chains"
import { createPermissionValidator } from "@zerodev/modular-permission"
import { toMerklePolicy, toSignaturePolicy, toSudoPolicy } from "@zerodev/modular-permission/policies"
import { privateKeyToAccount } from "viem/accounts"
import {
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient,
    KernelSmartAccount,
} from "@zerodev/sdk"
import { getAction, walletClientToSmartAccountSigner } from "permissionless"
import { readContract } from "viem/actions"
import { MockRequestorAbi } from "./abis/MockRequestorAbi"

const BUNDLER_URL = `https://rpc.zerodev.app/api/v2/bundler/${process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID}?bundlerProvider=PIMLICO`
const PAYMASTER_URL = `https://rpc.zerodev.app/api/v2/paymaster/${process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID}?paymasterProvider=PIMLICO`
const PASSKEY_SERVER_URL = `https://passkeys.zerodev.app/api/v2/${process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID}`
export const CHAIN = polygonMumbai

const MOCK_REQUESTOR_ADDRESS = "0x67e0a05806A54f6C2162a91810BD50eFe28e0460"

export class ModularZerodev<TChain extends Chain | undefined = Chain | undefined> {
    constructor(private readonly sessionKeyStore: SessionKeyStore) {
    }

    private getPublicClient() {
        return createPublicClient({
            transport: http(BUNDLER_URL),
        })
    }

    async signInByPasskey(passkeyName: string, mode: WebAuthnMode, sessionPrivateKey?: Hex) {
        let kernelAccount: KernelSmartAccount
        if (sessionPrivateKey) {
            kernelAccount = await this.createPasskeySessionKeyKernelAccount(passkeyName, mode, sessionPrivateKey)
        } else {
            kernelAccount = await this.createPasskeyKernelAccount(passkeyName, mode)
        }
        console.log("kernelAccount", kernelAccount)

        if (sessionPrivateKey) {
            // TODO serializeSessionKeyAccount() doesn't work on modular account
            // const serializedSessionKeyAccount = await serializeSessionKeyAccount(kernelAccount, sessionPrivateKey)
            // this.sessionKeyStore.getState().update(passkeyName, serializedSessionKeyAccount)
        }
        return kernelAccount
    }

    async signInByEoa(walletClient: WalletClient<Transport, TChain, Account>, sessionPrivateKey?: Hex) {
        let kernelAccount: KernelSmartAccount
        if (sessionPrivateKey) {
            kernelAccount = await this.createEoaSessionKeyKernelAccount(walletClient, sessionPrivateKey)
        } else {
            kernelAccount = await this.createEoaKernelAccount(walletClient)
        }
        console.log("kernelAccount", kernelAccount)

        if (sessionPrivateKey) {
            // TODO serializeSessionKeyAccount() doesn't work on modular account
            // const serializedSessionKeyAccount = await serializeSessionKeyAccount(kernelAccount, sessionPrivateKey)
            // this.sessionKeyStore.getState().update(passkeyName, serializedSessionKeyAccount)
        }
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
        return response
    }

    async createEoaSessionKeyKernelAccount(walletClient: WalletClient<Transport, TChain, Account>, sessionPrivateKey: Address) {
        const start = Date.now()

        const publicClient = this.getPublicClient()
        const eoaSigner = walletClientToSmartAccountSigner(walletClient)
        const eoaEcdsaSigner = toECDSASigner({ signer: eoaSigner })

        console.log("create eoaEcdsaSigner", Date.now() - start)

        const modularPermissionPlugin = await createPermissionValidator(
            publicClient,
            {
                signer: eoaEcdsaSigner,
                policies: [await toSudoPolicy({})],
            },
        )

        console.log("create modularPermissionPlugin", Date.now() - start)

        const sessionKeyAccount = privateKeyToAccount(sessionPrivateKey)
        const sessionKeySigner = toECDSASigner({ signer: sessionKeyAccount })

        console.log("create sessionKeySigner", Date.now() - start)

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

        console.log("create sessionKeyModularPermissionPlugin", Date.now() - start)

        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: {
                sudo: modularPermissionPlugin,
                regular: sessionKeyModularPermissionPlugin,
            },
        })

        console.log("create kernelAccount", Date.now() - start)

        return kernelAccount
    }

    async createEoaKernelAccount(walletClient: WalletClient<Transport, TChain, Account>) {
        const start = Date.now()

        const publicClient = this.getPublicClient()
        const eoaSigner = walletClientToSmartAccountSigner(walletClient)
        const eoaEcdsaSigner = toECDSASigner({ signer: eoaSigner })

        console.log("create eoaEcdsaSigner", Date.now() - start)

        const modularPermissionPlugin = await createPermissionValidator(
            publicClient,
            {
                signer: eoaEcdsaSigner,
                policies: [await toSudoPolicy({})],
            },
        )

        console.log("create modularPermissionPlugin", Date.now() - start)

        const kernelAccount = await createKernelAccount(publicClient, {
            plugins: {
                sudo: modularPermissionPlugin,
            },
        })

        console.log("create kernelAccount", Date.now() - start)

        return kernelAccount
    }

    async createPasskeySessionKeyKernelAccount(passkeyName: string, mode: WebAuthnMode, sessionPrivateKey: Address) {
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
            plugins: {
                sudo: modularPermissionPlugin,
                regular: sessionKeyModularPermissionPlugin,
            },
        })
    }


    async createPasskeyKernelAccount(passkeyName: string, mode: WebAuthnMode) {
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

        return createKernelAccount(publicClient, {
            plugins: {
                sudo: modularPermissionPlugin,
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