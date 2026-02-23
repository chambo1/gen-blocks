import { createPublicClient, http } from 'viem';

const GENLAYER_RPC = 'https://studio.genlayer.com/api';
const CONTRACT_ADDRESS = '0xb9d3bbB33036FdB0Dfe6b5F7053e1F2E057F7E8E';

const CONTRACT_ABI = [
    {
        "type": "function",
        "name": "get_full_game_state",
        "inputs": [{ "name": "room_code", "type": "string" }],
        "outputs": [{ "name": "", "type": "string" }],
        "stateMutability": "view"
    },
    {
        "type": "function",
        "name": "get_active_room",
        "inputs": [{ "name": "player_addr", "type": "string" }],
        "outputs": [{ "name": "", "type": "string" }],
        "stateMutability": "view"
    }
];

const client = createPublicClient({
    transport: http(GENLAYER_RPC)
});

async function main() {
    const address = '0xc5f8cfb7ba40986de13670942e617d9197c38c82';

    try {
        console.log('Fetching active room for', address);
        const activeRoom = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'get_active_room',
            args: [address],
        });

        console.log('Active Room for', address, ':', activeRoom);

        if (!activeRoom || activeRoom === 'none') {
            console.log('No active room found. Try joining a game in the browser first.');
            process.exit(0);
        }

        const roomCode = activeRoom as string;

        const data = await client.readContract({
            address: CONTRACT_ADDRESS,
            abi: CONTRACT_ABI,
            functionName: 'get_full_game_state',
            args: [roomCode],
        });
        console.log('--- RAW PAYLOAD ---');
        console.log(data);

        const parts = (data as string).split('#');
        console.log('\n--- SPLIT PAYLOAD ---');
        console.log('Player Data:', parts[0]);

        const playerParts = parts[0].split(';');
        console.log('Main Parts:', playerParts);

        if (playerParts.length >= 4) {
            const playerStrings = playerParts[3].split('|');
            console.log('Player Strings:', playerStrings);

            const parsed = playerStrings.map(p => p.split(':'));
            console.log('Parsed Array:', parsed);
        }

        console.log('Gov Data:', parts[1]);
        console.log('Log Data:', parts[2]);
        console.log('Game Over:', parts[3]);
    } catch (err) {
        console.error('Error fetching state:', err);
    }
}

main();
