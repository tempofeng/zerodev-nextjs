import { Address, encodeFunctionData, parseAbi } from "viem"
import { big2Bigint } from "@/app/bn"

export const erc20Abi = parseAbi([
    "function name() public view returns (string memory)",
    "function symbol() public view returns (string memory)",
    "function decimals() public view returns (uint8)",
    "function totalSupply() public view returns (uint256)",
    "function balanceOf(address account) public view returns (uint256)",
    "function transfer(address to, uint256 value) public returns (bool)",
    "function allowance(address owner, address spender) public view returns (uint256)",
    "function approve(address spender, uint256 value) public returns (bool)",
    "function transferFrom(address from, address to, uint256 value) public returns (bool)",
    "function increaseAllowance(address spender, uint256 addedValue) public returns (bool)",
    "function decreaseAllowance(address spender, uint256 requestedDecrease) public returns (bool)",
    "event Approval(address indexed owner, address indexed spender, uint256 value)",
    "event Transfer(address indexed from, address indexed to, uint256 value)",
])

export class Erc20Proxy {
    constructor(readonly contractAddress: Address, readonly decimals: number) {
    }

    getApproveCallData(spender: Address, amount: Big) {
        return {
            to: this.contractAddress,
            value: 0n,
            data: encodeFunctionData({
                abi: erc20Abi,
                functionName: "approve",
                args: [spender, big2Bigint(amount, this.decimals)],
            }),
        }
    }
}
