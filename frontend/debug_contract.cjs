const { createClient } = require('genlayer-js');
const { studionet } = require('genlayer-js/chains');

const CONTRACT_ADDRESS = '0x2B2B8043eEaa88A5Bda692Bc5B4B8074D4ec82C9';
const RPC = 'https://studio.genlayer.com/api';
const chain = { ...studionet, rpcUrls: { default: { http: [RPC] } } };
const client = createClient({ chain });

// Simulate what the contract stores vs what wagmi returns
// The contract stores: addr.lower() where addr = gl.message.sender_address (which has 0x prefix from as_hex)
// Wagmi returns: 0x... (checksummed)
// Both sides call .toLowerCase() so they SHOULD match

// But what if the contract stores the address WITHOUT 0x prefix?
// Let's check get_all_players directly

async function debug() {
    // Use your actual room code if you have one
    const ROOM = 'YOUR_ROOM_CODE'; // Replace this

    const players = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_all_players',
        args: [ROOM],
    });
    console.log('get_all_players:', JSON.stringify(players));

    const allPlayerData = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: 'get_all_player_data',
        args: [ROOM],
    });
    console.log('get_all_player_data:', JSON.stringify(allPlayerData));

    // Parse it like the frontend does
    if (allPlayerData) {
        const mainParts = allPlayerData.split(';');
        console.log('\nmainParts count:', mainParts.length);
        if (mainParts.length >= 4) {
            const playerStrings = mainParts[3].split('|');
            console.log('playerStrings count:', playerStrings.length);
            playerStrings.forEach((ps, i) => {
                const parts = ps.split(':');
                console.log(`Player ${i}: parts.length=${parts.length}`, JSON.stringify(ps));
            });
        }
    }
}

debug().catch(e => console.error('Fatal:', e.message));
