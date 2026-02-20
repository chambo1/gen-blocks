import { createClient } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'
import { CONTRACT_ADDRESS, GENLAYER_RPC } from './genlayer'

// Define the chain explicitly to ensure the RPC URL matches our configuration
const genlayerChain = {
    ...studionet,
    rpcUrls: {
        default: {
            http: [GENLAYER_RPC],
        },
    },
}

/**
 * GenLayer contract write helper using the official genlayer-js SDK (Builders Pattern).
 * This replaces the manual hex encoding and raw RPC calls with the official SDK methods.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function writeGenLayerContract(
    functionName: string,
    args: any[],
    fromAddress: string
): Promise<{ hash: `0x${string}`; wait: () => Promise<void> }> {

    // Initialize the client with the custom chain and the player's account
    const client = createClient({
        chain: genlayerChain,
        account: fromAddress as `0x${string}`,
    })

    try {
        console.log(`Sending GenLayer transaction: ${functionName}`, args)

        // Send the transaction using the SDK
        const hash = await client.writeContract({
            address: CONTRACT_ADDRESS,
            functionName,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            args: args as any,
            value: BigInt(0), // Required field - no ETH value sent with transaction
        })

        console.log(`Transaction sent: ${hash}`)

        // Return the hash and a wait function that uses the SDK's receipt polling
        return {
            hash,
            wait: async () => {
                console.log(`Waiting for transaction ${hash} to be ACCEPTED...`)
                await client.waitForTransactionReceipt({
                    hash,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    status: 'ACCEPTED' as any,
                })
                console.log(`Transaction ${hash} confirmed!`)
            }
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('GenLayer contract write error:', error)
        throw new Error(error.message || 'Transaction failed')
    }
}

/**
 * Read contract helper using the official SDK.
 * Useful for one-off reads that don't need Wagmi hooks.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function readGenLayerContract(
    functionName: string,
    args: any[]
): Promise<any> {
    const client = createClient({
        chain: genlayerChain,
    })

    try {
        const result = await client.readContract({
            address: CONTRACT_ADDRESS,
            functionName,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            args: args as any,
        })
        return result
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('GenLayer contract read error:', error)
        throw new Error(error.message || 'Read failed')
    }
}
