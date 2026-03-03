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

// Helper to normalize addresses (handle 0x prefix mismatch)
const cleanArgs = (args: any[]) => {
    return args.map(arg => {
        if (typeof arg === 'string' && arg.startsWith('0x') && arg.length === 42) {
            return arg.toLowerCase().slice(2)
        }
        return arg
    })
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
    const cleanedArgs = cleanArgs(args)

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
            args: cleanedArgs as any,
            value: BigInt(0), // Required field - no ETH value sent with transaction
        })

        console.log(`Transaction sent: ${hash}`)

        // Return the hash and a fast-polling wait function
        return {
            hash,
            wait: async () => {
                console.log(`Waiting for transaction ${hash} to be ACCEPTED...`)
                // Poll manually every 1s for up to 60s instead of relying on SDK default (slow)
                const maxRetries = 60
                for (let i = 0; i < maxRetries; i++) {
                    try {
                        const receipt = await client.waitForTransactionReceipt({
                            hash,
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            status: 'ACCEPTED' as any,
                        })
                        if (receipt) {
                            console.log(`Transaction ${hash} ACCEPTED!`)
                            return
                        }
                    } catch {
                        // Not accepted yet — try FINALIZED as fallback
                        try {
                            const receipt2 = await client.waitForTransactionReceipt({
                                hash,
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                status: 'FINALIZED' as any,
                            })
                            if (receipt2) {
                                console.log(`Transaction ${hash} FINALIZED (accepted)!`)
                                return
                            }
                        } catch {
                            // still pending — wait 1s and retry
                        }
                    }
                    await new Promise(r => setTimeout(r, 1000))
                }
                console.warn(`Transaction ${hash} may not have been ACCEPTED within timeout.`)
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
    args: any[],
    fromAddress?: string
): Promise<any> {
    const cleanedArgs = cleanArgs(args)
    const client = createClient({
        chain: genlayerChain,
        account: fromAddress ? (fromAddress as `0x${string}`) : undefined,
    })

    try {
        const result = await client.readContract({
            address: CONTRACT_ADDRESS,
            functionName,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            args: cleanedArgs as any,
        })
        return result
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error(`GenLayer read error [${functionName}]:`, error)
        if (error.cause) console.error('Error cause detail:', error.cause)
        if (error.details) console.error('Error details:', error.details)
        throw new Error(`Read failed for ${functionName}: ${error.message || 'Unknown error'}`)
    }
}
