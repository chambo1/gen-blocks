import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables manually
config({ path: resolve(__dirname, '.env.local') });

// Make sure to mock window/document if needed, but for simple fetch we might not.
// We'll just define the SDK call manually.

async function testPoll() {
  const rpc = process.env.NEXT_PUBLIC_GENLAYER_RPC;
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;
  console.log('RPC:', rpc);
  console.log('Contract:', address);
  
  // Quick fetch using direct JSON-RPC to see what the contract actually returns
  const body = {
    jsonrpc: "2.0",
    method: "eth_call",
    params: [{
      to: address,
      data: "0x8faeecf800000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000006324b423337440000000000000000000000000000000000000000000000000000" // We need the actual encoded data for get_full_game_state. Let's just use the genlayer SDK if possible.
    }, "latest"],
    id: 1
  };
}
testPoll();
