import { Address } from 'viem'

// Contract address: must match the contract deployed in GenLayer Studio exactly.
// Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local to override (e.g. from GenLayer Studio deploy).
const contractAddress = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CONTRACT_ADDRESS
  ? process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
  : '0xaBeB325C86916535A25E5C39b3b49aD905080D31'
export const CONTRACT_ADDRESS = contractAddress as Address
const rawRpc = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GENLAYER_RPC
  ? process.env.NEXT_PUBLIC_GENLAYER_RPC
  : 'https://studio.genlayer.com/api'
export const GENLAYER_RPC = rawRpc.trim()

console.log('⛓️ GenLayer Config:', {
  RPC: GENLAYER_RPC,
  Contract: CONTRACT_ADDRESS,
  ChainId: typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GENLAYER_CHAIN_ID ? process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID : 61999
})

if (!GENLAYER_RPC.startsWith('http')) {
  console.warn('⚠️ Invalid GENLAYER_RPC format:', GENLAYER_RPC)
}

export const GENLAYER_CHAIN_ID = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GENLAYER_CHAIN_ID
  ? parseInt(process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID)
  : 61999

// ABI for GenLayer contract - using string types as GenLayer Python contracts use strings
export const CONTRACT_ABI = [
  // Room management
  {
    name: 'create_room',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'join_room',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'start_game',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'roll_dice',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'leave_room',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  // Room info
  {
    name: 'get_room_creator',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_player_count',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'is_game_started',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'is_room_game_over',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_room_diagnostics',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_winner',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  // Player stats
  {
    name: 'get_player_xp',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'player', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_player_position',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'player', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_player_shields',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'player', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_player_combo',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'player', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_player_multiplier',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'player', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  // Board and game state
  {
    name: 'get_board_layout',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'is_player_in_room',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'player', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_last_dice_roll',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'player', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_full_game_state',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'get_active_room',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player_addr', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'handle_end_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'is_player_eliminated',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'player', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_room_log',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'handle_danger_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'handle_hazard_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_all_players',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_current_turn_index',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'is_player_turn',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'player', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  // Turn timer
  {
    name: 'is_turn_expired',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_turn_time_remaining',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  // Governance
  {
    name: 'deliberate_governance',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_governance_proposal',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  // Leaderboards
  {
    name: 'get_player_global_stats',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_player_weekly_stats',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_player_daily_stats',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'player', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  // Block interactions
  {
    name: 'handle_build_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'handle_bonus_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'handle_mystery_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'handle_lucky_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'handle_steal_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'target_player', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'respond_to_steal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'action', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'handle_governance_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'room_code', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'handle_auction_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'room_code', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'respond_to_auction',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'action', type: 'string' },
      { name: 'bid_amount', type: 'string' },
    ],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'end_turn',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'force_end_turn',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'get_all_player_data',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'string' }],
  },
] as const

// Helper to format player key for contract calls
export function getPlayerKey(roomCode: string, playerAddress: string): string {
  return `${roomCode}:${playerAddress.toLowerCase()}`
}