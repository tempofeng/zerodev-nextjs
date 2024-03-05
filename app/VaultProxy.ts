import { parseAbi } from "viem"

export const vaultAbi = parseAbi([
        "function deposit(address trader, uint256 amount) external nonZero(amount)",
    ],
)