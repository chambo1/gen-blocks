import { Address } from 'viem'

// Contract address: must match the contract deployed in GenLayer Studio exactly.
// Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local to override (e.g. from GenLayer Studio deploy).
const contractAddress = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_CONTRACT_ADDRESS
  ? process.env.NEXT_PUBLIC_CONTRACT_ADDRESS
  : '0xaBeB325C86916535A25E5C39b3b49aD905080D31'
export const CONTRACT_ADDRESS = contractAddress as Address
export const GENLAYER_RPC = typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_GENLAYER_RPC
  ? process.env.NEXT_PUBLIC_GENLAYER_RPC
  : 'https://studio.genlayer.com/api'

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
    outputs: [],
  },
  {
    name: 'join_room',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [],
  },
  {
    name: 'start_game',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [],
  },
  {
    name: 'roll_dice',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [],
  },
  {
    name: 'leave_room',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [],
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
    outputs: [{ type: 'bool' }],
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
    outputs: [{ type: 'bool' }],
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
    outputs: [{ type: 'bool' }],
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
    outputs: [],
  },
  {
    name: 'is_player_eliminated',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'player', type: 'string' },
    ],
    outputs: [{ type: 'bool' }],
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
    outputs: [],
  },
  {
    name: 'handle_hazard_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [],
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
    outputs: [{ type: 'bool' }],
  },
  // Turn timer
  {
    name: 'is_turn_expired',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [{ type: 'bool' }],
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
    name: 'create_governance_proposal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'proposal_type', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'vote_on_proposal',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'vote_yes', type: 'bool' },
    ],
    outputs: [],
  },
  {
    name: 'execute_governance',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [],
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
    outputs: [],
  },
  {
    name: 'handle_bonus_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [],
  },
  {
    name: 'handle_mystery_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [],
  },
  {
    name: 'handle_lucky_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'room_code', type: 'string' }],
    outputs: [],
  },
  {
    name: 'handle_steal_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'target_player', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'handle_governance_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'vote', type: 'string' },
    ],
    outputs: [],
  },
  {
    name: 'handle_auction_block',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'room_code', type: 'string' },
      { name: 'bid_amount', type: 'string' },
    ],
    outputs: [],
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