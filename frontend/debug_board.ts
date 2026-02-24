import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '.env.local') });

async function query() {
  const rpc = process.env.NEXT_PUBLIC_GENLAYER_RPC;
  const address = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS;

  // We need a transaction body. Let's send a standard eth_call for get_board_layout('ROOM_CODE')
  // We can't easily guess the room code! So let's ask the contract for players first.
  console.log('Contract:', address);
}
query();
