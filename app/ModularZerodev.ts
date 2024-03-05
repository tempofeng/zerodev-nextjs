import { SessionKeyStore } from "@/app/sessionKeyStore"
import { toECDSASigner, toWebAuthnSigner, WebAuthnMode } from "@zerodev/modular-permission/signers"
import {
    type Account,
    Address,
    Chain,
    createPublicClient,
    hashMessage,
    Hex,
    http,
    type Transport,
    WalletClient,
} from "viem"
import { optimism } from "viem/chains"
import {
    createPermissionValidator,
    deserializeModularPermissionAccount,
    serializeModularPermissionAccount,
} from "@zerodev/modular-permission"
import { toMerklePolicy, toSignaturePolicy, toSudoPolicy } from "@zerodev/modular-permission/policies"
import { privateKeyToAccount } from "viem/accounts"
import {
    createKernelAccount,
    createKernelAccountClient,
    createZeroDevPaymasterClient,
    KernelSmartAccount,
} from "@zerodev/sdk"
import { bundlerActions, getAction, walletClientToSmartAccountSigner } from "permissionless"
import { readContract } from "viem/actions"
import { MockRequestorAbi } from "./abis/MockRequestorAbi"
import { erc20Abi, Erc20Proxy } from "@/app/Erc20Proxy"
import Big from "big.js"
import { clearingHouseABI, vaultABI } from "@/app/types/wagmi/generated"
import { VaultProxy } from "@/app/VaultProxy"
import { ClearingHouseProxy } from "@/app/ClearingHouseProxy"

const BUNDLER_URL = `https://rpc.zerodev.app/api/v2/bundler/${process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID}?bundlerProvider=PIMLICO`
const PAYMASTER_URL = `https://rpc.zerodev.app/api/v2/paymaster/${process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID}?paymasterProvider=PIMLICO`
const PASSKEY_SERVER_URL = `https://passkeys.zerodev.app/api/v2/${process.env.NEXT_PUBLIC_ZERODEV_PROJECT_ID}`
export const CHAIN = optimism

export const MOCK_REQUESTOR_ADDRESS = "0x67e0a05806A54f6C2162a91810BD50eFe28e0460" as Address
export const USDT_CONTRACT_ADDRESS = "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58" as Address
export const USDT_DECIMALS = 6

export const VAULT_ADDRESS = "0x5aa45D0349c54D5BD241Dc6ece7b42601179ec59" as Address

export const CLEARING_HOUSE_ADDRESS = "0x4570e98cEF4b602B7A66f51CD6A51E2281075a46" as Address

export const ORDER_GATEWAY_V2_ADDRESS = "0x186841f8c1B9514D7B627A691b7d15831A17553B" as Address

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
            const serializedSessionKeyAccount = await serializeModularPermissionAccount(
                kernelAccount,
                sessionPrivateKey,
            )
            this.sessionKeyStore.getState().setSerializedSessionKeyAccount(serializedSessionKeyAccount)
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
            const serializedSessionKeyAccount = await serializeModularPermissionAccount(
                kernelAccount,
                sessionPrivateKey,
            )
            this.sessionKeyStore.getState().setSerializedSessionKeyAccount(serializedSessionKeyAccount)
        }
        return kernelAccount
    }

    async signMessage(message: string) {
        const serializedSessionKeyAccount = this.sessionKeyStore.getState().serializedSessionKeyAccount
        if (!serializedSessionKeyAccount) {
            return undefined
        }

        const kernelAccount = await deserializeModularPermissionAccount(this.getPublicClient(), serializedSessionKeyAccount)
        const kernelClient = this.createKernelClient(CHAIN, kernelAccount)
        const sig = await kernelClient.signMessage({
            message,
        })
        console.log("signMessage", sig)
        return sig
    }

    async sendUserOp(kernelAccount: KernelSmartAccount) {
        const kernelClient = this.createKernelClient(CHAIN, kernelAccount)
        const erc20Proxy = new Erc20Proxy(USDT_CONTRACT_ADDRESS, USDT_DECIMALS)
        const callData = await kernelClient.account.encodeCallData(erc20Proxy.getApproveCallData(VAULT_ADDRESS, Big(10)))
        const userOpHash = await kernelClient.sendUserOperation({
            userOperation: {
                callData,
            },
        })
        const receipt = await kernelClient.extend(bundlerActions).waitForUserOperationReceipt({ hash: userOpHash })
        console.log("sendUserOpBySessionKey", userOpHash, receipt.receipt.transactionHash)
    }

    async sendUserOpBySessionKey() {
        const serializedSessionKeyAccount = this.sessionKeyStore.getState().serializedSessionKeyAccount
        if (!serializedSessionKeyAccount) {
            return
        }

        const kernelAccount = await deserializeModularPermissionAccount(this.getPublicClient(), serializedSessionKeyAccount)
        const kernelClient = this.createKernelClient(CHAIN, kernelAccount)
        const erc20Proxy = new Erc20Proxy(USDT_CONTRACT_ADDRESS, USDT_DECIMALS)
        const vaultProxy = new VaultProxy()
        const clearingHouseProxy = new ClearingHouseProxy()
        const callData = await kernelClient.account.encodeCallData([
            erc20Proxy.getApproveCallData(VAULT_ADDRESS, Big(10)),
            // vaultProxy.getDepositCallData(kernelAccount.address, Big(10)),
            // vaultProxy.getSetAuthorizationCallData(ORDER_GATEWAY_V2_ADDRESS, true),
            // clearingHouseProxy.getSetAuthorizationCallData(ORDER_GATEWAY_V2_ADDRESS, true),
        ])
        const userOpHash = await kernelClient.sendUserOperation({
            userOperation: {
                callData,
            },
        })
        const receipt = await kernelClient.extend(bundlerActions).waitForUserOperationReceipt({ hash: userOpHash })
        console.log("sendUserOpBySessionKey", userOpHash, receipt.receipt.transactionHash)
    }

    async verifySignature(message: string, signature: string) {
        const serializedSessionKeyAccount = this.sessionKeyStore.getState().serializedSessionKeyAccount
        if (!serializedSessionKeyAccount) {
            return
        }

        const kernelAccount = await deserializeModularPermissionAccount(this.getPublicClient(), serializedSessionKeyAccount)
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
                                target: VAULT_ADDRESS,
                                valueLimit: BigInt(0),
                                abi: vaultABI,
                                functionName: "deposit",
                                args: [null, null],
                            },
                            {
                                target: USDT_CONTRACT_ADDRESS,
                                valueLimit: BigInt(0),
                                // @ts-ignore
                                abi: erc20Abi,
                                // @ts-ignore
                                functionName: "approve",
                                args: [null, null],
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
                                target: USDT_CONTRACT_ADDRESS,
                                valueLimit: BigInt(0),
                                abi: erc20Abi,
                                functionName: "approve",
                                args: [null, null],
                            },
                            {
                                target: VAULT_ADDRESS,
                                valueLimit: BigInt(0),
                                // @ts-ignore
                                abi: vaultABI,
                                // @ts-ignore
                                functionName: "deposit",
                                args: [null, null],
                            },
                            {
                                target: VAULT_ADDRESS,
                                valueLimit: BigInt(0),
                                // @ts-ignore
                                abi: vaultABI,
                                // @ts-ignore
                                functionName: "setAuthorization",
                                args: [null, null],
                            },
                            {
                                target: CLEARING_HOUSE_ADDRESS,
                                valueLimit: BigInt(0),
                                // @ts-ignore
                                abi: clearingHouseABI,
                                // @ts-ignore
                                functionName: "setAuthorization",
                                args: [null, null],
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