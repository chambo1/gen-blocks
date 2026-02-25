"use client"

import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useChainId, useSwitchChain, useSignMessage, useDisconnect, useReadContract } from "wagmi"
import { useEffect, useRef, useState, useCallback } from "react"
import Link from "next/link"
import { CONTRACT_ADDRESS, CONTRACT_ABI, getPlayerKey } from '@/lib/genlayer'
import { writeGenLayerContract, readGenLayerContract } from '@/lib/genlayer-client'
import { PlayersDisplay } from '@/components/PlayersDisplay'
import { GovernanceVoting } from '@/components/GovernanceVoting'

interface Player {
  address: string
  name: string
  xp: number
  position: number
  shields: number
  comboCount: number
  hasMultiplier: boolean
  isEliminated: boolean
  lastDiceRoll: number
  globalIndex: number
  isCurrentTurn: boolean
}

interface BoardBlock {
  id: number
  type: string
  emoji: string
  name: string
  description: string
}

export default function PlayGame() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { signMessage } = useSignMessage()
  const { disconnect } = useDisconnect()

  const [isSigned, setIsSigned] = useState(false)
  const [isWrongNetwork, setIsWrongNetwork] = useState(false)
  const [gameState, setGameState] = useState<'lobby' | 'waiting' | 'playing' | 'finished'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('genblocks_gameState')
      if (saved === 'playing' || saved === 'waiting') return saved
    }
    return 'lobby'
  })
  const [playerPosition, setPlayerPosition] = useState(0)
  const [playerXP, setPlayerXP] = useState(10)
  const [diceValue, setDiceValue] = useState<number | null>(null)
  const [isRolling, setIsRolling] = useState(false)
  const [showActionPrompt, setShowActionPrompt] = useState(false)
  const [showStealPrompt, setShowStealPrompt] = useState(false)
  const [showChallengePrompt, setShowChallengePrompt] = useState(false)
  const [showAuctionPrompt, setShowAuctionPrompt] = useState(false)
  const [currentBlock, setCurrentBlock] = useState<any>(null)
  const [gameLog, setGameLog] = useState<string[]>([])
  const [allGamePlayers, setAllGamePlayers] = useState<Player[]>([])
  const [roomCode, setRoomCode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('genblocks_roomCode') || ''
    return ''
  })
  const [shields, setShields] = useState(0)
  const [comboCount, setComboCount] = useState(0)
  const [hasMultiplier, setHasMultiplier] = useState(false)
  const [showJoinOptions, setShowJoinOptions] = useState(false)
  const [joinRoomCode, setJoinRoomCode] = useState('')
  const [xpPopup, setXpPopup] = useState<{ show: boolean, amount: number, type: 'gain' | 'loss' }>({ show: false, amount: 0, type: 'gain' })
  const [currentBid, setCurrentBid] = useState(0)
  const [highestBidder, setHighestBidder] = useState<string>('')
  const [lastBuilder, setLastBuilder] = useState<string>('')
  const [canBeChallenged, setCanBeChallenged] = useState(false)
  const [board, setBoard] = useState<BoardBlock[]>([])

  // Reconnection state
  const [isCheckingActiveRoom, setIsCheckingActiveRoom] = useState(false)
  const [turnPhase, setTurnPhase] = useState<'rolling' | 'finishing' | 'stealing_response' | 'auctioning' | 'governing'>('rolling')
  const [pendingStealTarget, setPendingStealTarget] = useState<string>('')
  const [pendingStealAttacker, setPendingStealAttacker] = useState<string>('')
  const [stealTimeleft, setStealTimeleft] = useState<number>(40)
  const [hasRespondedToSteal, setHasRespondedToSteal] = useState<boolean>(false)
  const [auctionCurrentBid, setAuctionCurrentBid] = useState<number>(0)
  const [auctionHighestBidder, setAuctionHighestBidder] = useState<string>('')
  const [auctionTurnIndex, setAuctionTurnIndex] = useState<number>(0)
  const [auctionTimeleft, setAuctionTimeleft] = useState<number>(30)
  const [hasRespondedToAuction, setHasRespondedToAuction] = useState<boolean>(false)

  // Governance State
  const [govTimeleft, setGovTimeleft] = useState<number>(30)
  const [hasRespondedToGov, setHasRespondedToGov] = useState<boolean>(false)
  const [pendingGovVoters, setPendingGovVoters] = useState<string[]>([])
  const [govYesVotes, setGovYesVotes] = useState<number>(0)
  const [govNoVotes, setGovNoVotes] = useState<number>(0)

  const [xpBeforeRoll, setXpBeforeRoll] = useState(0)
  const [pendingRoomCode, setPendingRoomCode] = useState<string>('')
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [showGovernanceVoting, setShowGovernanceVoting] = useState(false)
  const [governanceProposal, setGovernanceProposal] = useState<string>('none')
  const [isMyTurn, setIsMyTurn] = useState(false)
  const [isLocalPlayerEliminated, setIsLocalPlayerEliminated] = useState(false)

  // Contract State (replaced Wagmi hooks)
  const [rawPlayerCount, setRawPlayerCount] = useState<string>('0')
  const [rawRoomCreator, setRawRoomCreator] = useState<string>('')
  const [rawGameStarted, setRawGameStarted] = useState<boolean>(false)
  const [rawBoardLayout, setRawBoardLayout] = useState<string>('')

  const hasSwitched = useRef(false)
  const hasPromptedSign = useRef(false)
  const lastProcessedHash = useRef<string>('')
  const manuallyWaiting = useRef(false)
  const lastRollValue = useRef<string>('')
  const allGamePlayersRef = useRef<Player[]>([])
  const rollStartPosition = useRef<number>(-1)

  const GENLAYER_ID = 61999
  const MAX_PLAYERS = 4
  const MIN_PLAYERS = 2

  // Helper functions
  const addLog = useCallback((message: string) => {
    setGameLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }, [])

  const showXPPopup = useCallback((amount: number, type: 'gain' | 'loss' = 'gain') => {
    setXpPopup({ show: true, amount, type })
    setTimeout(() => {
      setXpPopup({ show: false, amount: 0, type: 'gain' })
    }, 2000)
  }, [])

  // Persist roomCode and gameState to localStorage
  useEffect(() => {
    if (roomCode) {
      localStorage.setItem('genblocks_roomCode', roomCode)
    } else {
      localStorage.removeItem('genblocks_roomCode')
    }
  }, [roomCode])

  useEffect(() => {
    if (gameState === 'playing' || gameState === 'waiting') {
      localStorage.setItem('genblocks_gameState', gameState)
    } else if (gameState === 'finished' || gameState === 'lobby') {
      localStorage.removeItem('genblocks_gameState')
      if (gameState === 'lobby') localStorage.removeItem('genblocks_roomCode')
    }
  }, [gameState])

  // Contract read hooks for syncing state
  // NOTE: Critical state (player count, creator, started) is now fetched via SDK polling
  // to avoid Wagmi undefined/caching issues.

  // Dedicated polling for lobby state
  const fetchLobbyState = useCallback(async () => {
    if (!roomCode) return

    try {
      const [count, creator, started, layout] = await Promise.all([
        readGenLayerContract('get_player_count', [roomCode]),
        readGenLayerContract('get_room_creator', [roomCode]),
        readGenLayerContract('is_game_started', [roomCode]),
        readGenLayerContract('get_board_layout', [roomCode])  // Always fetch layout
      ])

      console.log('Poll Lobby:', { count, creator, started, hasLayout: !!layout })

      if (count !== undefined) setRawPlayerCount(String(count))
      if (creator !== undefined) setRawRoomCreator(String(creator))
      if (started !== undefined) setRawGameStarted(Boolean(started))
      if (layout && String(layout).trim() !== '') setRawBoardLayout(String(layout))

    } catch (err) {
      console.error('Lobby poll failed:', err)
    }
  }, [roomCode])

  // Poll lobby state — runs in ALL game states to ensure board layout is fetched
  useEffect(() => {
    if (!roomCode) return

    // Initial fetch
    fetchLobbyState()

    const interval = setInterval(() => {
      // Always poll during lobby/waiting. During playing, only poll for board if not loaded.
      if (gameState === 'lobby' || gameState === 'waiting') {
        fetchLobbyState()
      } else if (gameState === 'playing' && board.length === 0) {
        // Only fetch layout if board isn't loaded yet
        fetchLobbyState()
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [roomCode, fetchLobbyState, gameState, board.length])

  // NEW: Auto-reconnect effect
  useEffect(() => {
    if (!isConnected || !address || roomCode) return

    const checkActiveRoom = async () => {
      // Only check if we are disconnected and not in a room
      if (roomCode) return

      setIsCheckingActiveRoom(true)
      console.log('🔄 Checking for active room...', address)
      try {
        const activeRoom = await readGenLayerContract('get_active_room', [address])
        console.log('🔄 Active room result:', activeRoom)

        if (activeRoom && activeRoom !== 'none') {
          console.log('✅ Reconnecting to:', activeRoom)
          setRoomCode(activeRoom)
          // Set to lobby so the polling hooks can fetch the layout and transition to playing safely
          setGameState('lobby')
          addLog(`🔄 Reconnected to room: ${activeRoom}`)
          console.log('[DEBUG] checkActiveRoom setting gameState to lobby for room:', activeRoom)
        } else {
          console.log('[DEBUG] checkActiveRoom returned none or empty')
        }
      } catch (error) {
        console.error('Failed to check active room:', error)
      } finally {
        setIsCheckingActiveRoom(false)
      }
    }

    checkActiveRoom()
  }, [isConnected, address, roomCode, addLog])

  // Board layout fetched in fetchLobbyState now


  // Timer for auction response
  useEffect(() => {
    if (turnPhase === 'auctioning' && !hasRespondedToAuction && allGamePlayers.length > 0) {
      const currentAuctionAddr = allGamePlayers[auctionTurnIndex % allGamePlayers.length]?.address;
      if (currentAuctionAddr?.toLowerCase() === address?.toLowerCase()) {
        if (auctionTimeleft > 0) {
          const timerId = setTimeout(() => {
            setAuctionTimeleft(prev => prev - 1)
          }, 1000)
          return () => clearTimeout(timerId)
        } else {
          handleAuctionResponse('timeout')
        }
      }
    }
  }, [turnPhase, auctionTurnIndex, address, auctionTimeleft, hasRespondedToAuction, allGamePlayers.length])

  // Timer for governance response
  useEffect(() => {
    if (turnPhase === 'governing' && !hasRespondedToGov && address) {
      const lowerAddress = address.toLowerCase()
      if (pendingGovVoters.includes(lowerAddress)) {
        if (govTimeleft > 0) {
          const timerId = setTimeout(() => {
            setGovTimeleft(prev => prev - 1)
          }, 1000)
          return () => clearTimeout(timerId)
        } else {
          handleVoteProposal('timeout')
        }
      }
    }
  }, [turnPhase, pendingGovVoters.join(','), address, govTimeleft, hasRespondedToGov])

  // Timer for steal response
  useEffect(() => {
    if (turnPhase === 'stealing_response' && pendingStealTarget.toLowerCase() === address?.toLowerCase() && !hasRespondedToSteal) {
      if (stealTimeleft > 0) {
        const timerId = setTimeout(() => {
          setStealTimeleft(prev => prev - 1)
        }, 1000)
        return () => clearTimeout(timerId)
      } else {
        // Auto-forfeit/allow when timer hits 0
        handleStealResponse('timeout')
      }
    }
  }, [turnPhase, pendingStealTarget, address, stealTimeleft, hasRespondedToSteal])

  // Derived state for the last dice roll to reduce RPC calls
  const localPlayer = allGamePlayers.find(p => p.address.toLowerCase() === address?.toLowerCase())
  const lastDiceRoll = localPlayer?.lastDiceRoll?.toString() || '0'
  const otherPlayers = allGamePlayers.filter(p => p.address.toLowerCase() !== address?.toLowerCase())

  const { data: gameFinished, isLoading: isLoadingFinished, isRefetching: isRefetchingFinished } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'is_room_game_over',
    args: roomCode ? [roomCode] : undefined,
    query: {
      enabled: !!roomCode && gameState === 'playing',
      refetchInterval: 30000, // Slow down
    },
  })

  const { data: roomDiagnostics } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'get_room_diagnostics',
    args: roomCode ? [roomCode] : undefined,
    query: {
      enabled: !!roomCode,
      refetchInterval: 30000, // Slow down
    },
  })

  const isRoomCreator = rawRoomCreator && address && (rawRoomCreator as string).toLowerCase() === address.toLowerCase()

  // Sync local player state from allGamePlayers (THE SINGLE SOURCE OF TRUTH)
  useEffect(() => {
    if (!address || allGamePlayers.length === 0) return

    const localPlayer = allGamePlayers.find(p => p.address.toLowerCase() === address.toLowerCase())
    if (localPlayer) {
      // Only update if changed to avoid render loops
      if (localPlayer.xp !== playerXP) setPlayerXP(localPlayer.xp)
      if (localPlayer.shields !== shields) setShields(localPlayer.shields)
      if (localPlayer.comboCount !== comboCount) setComboCount(localPlayer.comboCount)
      if (localPlayer.hasMultiplier !== hasMultiplier) setHasMultiplier(localPlayer.hasMultiplier)

      // Position update triggers block logic
      if (localPlayer.position !== playerPosition) {
        setPlayerPosition(localPlayer.position)
        if (board.length > 0) {
          setCurrentBlock(board[localPlayer.position])
        }
      }
    }
  }, [allGamePlayers, address, playerPosition, playerXP, shields, comboCount, hasMultiplier, board])
  // isMyTurn is now managed by state and polling

  // Use raw values from SDK
  const playerCount = rawPlayerCount
  const roomCreator = rawRoomCreator
  const gameStarted = rawGameStarted

  // Resolved player count from contract (for display and logic)
  const displayPlayerCount = (() => {
    const n = playerCount != null ? parseInt(String(playerCount)) : NaN
    return Number.isNaN(n) ? allGamePlayers.length : n
  })()

  // Manual refresh of room state with retries
  const refreshWaitingRoom = useCallback(async () => {
    addLog('Refreshing room state...')

    // Retry 5 times with 1s delay to catch updates
    for (let i = 0; i < 5; i++) {
      await fetchLobbyState()
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    addLog('Room state updated.')
  }, [fetchLobbyState, addLog])

  // Poll on mount/return if room code exists
  useEffect(() => {
    if (roomCode && gameState === 'waiting') {
      refreshWaitingRoom()
    }
  }, [roomCode, gameState, refreshWaitingRoom])

  // Base board blocks (will be randomized)
  const baseBlocks: BoardBlock[] = [
    { id: 0, type: 'start', emoji: '🏁', name: 'START', description: 'Welcome! +10 XP' },
    { id: 1, type: 'build', emoji: '🟩', name: 'Build Block', description: 'Build contract' },
    { id: 2, type: 'build', emoji: '🟩', name: 'Build Block', description: 'Build contract' },
    { id: 3, type: 'build', emoji: '🟩', name: 'Build Block', description: 'Build contract' },
    { id: 4, type: 'build', emoji: '🟩', name: 'Build Block', description: 'Build contract' },
    { id: 5, type: 'build', emoji: '🟩', name: 'Build Block', description: 'Build contract' },
    { id: 6, type: 'bonus', emoji: '🟨', name: 'Bonus Block', description: 'Instant reward!' },
    { id: 7, type: 'bonus', emoji: '🟨', name: 'Bonus Block', description: 'Instant reward!' },
    { id: 8, type: 'bonus', emoji: '🟨', name: 'Bonus Block', description: 'Instant reward!' },
    { id: 9, type: 'mystery', emoji: '⭐', name: 'Mystery Block', description: 'Random reward!' },
    { id: 10, type: 'mystery', emoji: '⭐', name: 'Mystery Block', description: 'Random reward!' },
    { id: 11, type: 'steal', emoji: '🏴‍☠️', name: 'Steal Block', description: 'Steal from player!' },
    { id: 12, type: 'steal', emoji: '🏴‍☠️', name: 'Steal Block', description: 'Steal from player!' },
    { id: 13, type: 'governance', emoji: '🟥', name: 'Governance', description: 'Vote on proposal' },
    { id: 14, type: 'governance', emoji: '🟥', name: 'Governance', description: 'Vote on proposal' },
    { id: 15, type: 'lucky', emoji: '🎁', name: 'Lucky Block', description: 'Free bonus!' },
    { id: 16, type: 'lucky', emoji: '🎁', name: 'Lucky Block', description: 'Free bonus!' },
    { id: 17, type: 'auction', emoji: '💰', name: 'Auction Block', description: 'Bid for multiplier!' },
    { id: 18, type: 'auction', emoji: '💰', name: 'Auction Block', description: 'Bid for multiplier!' },
  ]

  // Resolved game state from raw contract data (fallback to local state)
  const [currentTurnAddress, setCurrentTurnAddress] = useState<string | null>(null)
  const [notificationQueue, setNotificationQueue] = useState<string[]>([])
  const [globalNotification, setGlobalNotification] = useState<{ message: string, type: string } | null>(null)
  const lastSeenLogRef = useRef<string[]>([])

  // Notification queue processor
  useEffect(() => {
    if (notificationQueue.length > 0 && !globalNotification) {
      const nextMsg = notificationQueue[0]
      setGlobalNotification({ message: nextMsg, type: 'info' })
      setNotificationQueue(prev => prev.slice(1))
      setTimeout(() => setGlobalNotification(null), 4000)
    }
  }, [notificationQueue, globalNotification])

  // Map block type numbers to block objects
  const blockTypeMap: Record<string, BoardBlock> = {
    '0': { id: 0, type: 'start', emoji: '🏁', name: 'START', description: 'Welcome! +10 XP' },
    '1': { id: 1, type: 'build', emoji: '🟩', name: 'Build Block', description: 'Build contract' },
    '2': { id: 2, type: 'bonus', emoji: '🟨', name: 'Bonus Block', description: 'Instant reward!' },
    '3': { id: 3, type: 'mystery', emoji: '⭐', name: 'Mystery Block', description: 'Random reward!' },
    '4': { id: 4, type: 'lucky', emoji: '🎁', name: 'Lucky Block', description: 'Free bonus!' },
    '5': { id: 5, type: 'steal', emoji: '🏴‍☠️', name: 'Steal Block', description: 'Steal from player!' },
    '6': { id: 6, type: 'auction', emoji: '💰', name: 'Auction Block', description: 'Bid for multiplier!' },
    '7': { id: 7, type: 'governance', emoji: '🟥', name: 'Governance', description: 'Vote on proposal' },
    '8': { id: 8, type: 'danger', emoji: '⚠️', name: 'Danger Block', description: '-2 XP penalty' },
    '9': { id: 9, type: 'hazard', emoji: '💀', name: 'Hazard Block', description: '-5 XP penalty' },
    '10': { id: 10, type: 'end', emoji: '☠️', name: 'END Block', description: '-10 XP & ELIMINATED!' },
  }

  // Parse board layout from contract
  const parseBoardLayout = (layoutString: string | undefined) => {
    if (!layoutString) return []

    const types = layoutString.split(',')
    return types.map((type, index) => ({
      ...blockTypeMap[type.trim()],
      id: index,
    }))
  }



  useEffect(() => {
    if (lastDiceRoll !== undefined && lastDiceRoll !== '0') {
      const roll = parseInt(lastDiceRoll as string) || 0
      if (roll > 0 && roll !== diceValue) {
        setDiceValue(roll)
      }
    }
  }, [lastDiceRoll])

  // CONSOLIDATED MEGA-POLL
  useEffect(() => {
    if (!roomCode || !address || gameState === 'lobby') return

    const fetchFullGameState = async () => {
      try {
        console.log('⛓️ Mega-Poll starting...')
        const megaData = await readGenLayerContract('get_full_game_state', [roomCode])
        if (!megaData || typeof megaData !== 'string') return

        const [playerData, govData, logData, gameOver] = megaData.split('#')

        // 1. Process Player Data
        if (playerData) {
          console.log('[DEBUG] Mega-Poll PlayerData received:', playerData)
          const mainParts = playerData.split(';')
          if (mainParts.length >= 4) {
            const turnIdx = parseInt(mainParts[0]) || 0
            const phase = mainParts[2] as 'rolling' | 'finishing' | 'stealing_response' | 'auctioning' | 'governing' || 'rolling'
            const pTarget = mainParts[4] || ''
            const pAttacker = mainParts[5] || ''
            setPendingStealTarget(pTarget === 'none' ? '' : pTarget)
            setPendingStealAttacker(pAttacker === 'none' ? '' : pAttacker)

            const abid = parseInt(mainParts[6]) || 0
            const abidder = mainParts[7] || ''
            const aturn = parseInt(mainParts[8]) || 0
            setAuctionCurrentBid(abid)
            setAuctionHighestBidder(abidder === 'none' ? '' : abidder)
            setAuctionTurnIndex(aturn)

            const gvoters = mainParts[14] || ''
            setPendingGovVoters(gvoters ? gvoters.split(',') : [])

            if (phase !== 'stealing_response') {
              setStealTimeleft(40)
              setHasRespondedToSteal(false)
            }
            if (phase !== 'auctioning') {
              setAuctionTimeleft(30)
              setHasRespondedToAuction(false)
            }
            if (phase !== 'governing') {
              setGovTimeleft(30)
              setHasRespondedToGov(false)
            }
            const playerStrings = mainParts[3].split('|')
            console.log('[DEBUG] Mega-Poll PARSED turnIdx:', turnIdx, 'phase:', phase, 'playerStrings:', playerStrings)

            setTurnPhase(phase)

            const results: Player[] = playerStrings.map((pStr: string, idx: number) => {
              const parts = pStr.split(':')
              if (parts.length < 7) return null
              const [addr, xp, pos, shields, combo, mult, elim, roll] = parts
              const currentIdx = playerStrings.length > 0 ? (turnIdx % playerStrings.length) : 0
              return {
                address: addr,
                name: addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : 'Unknown',
                xp: parseInt(xp) || 0,
                position: parseInt(pos) || 0,
                shields: parseInt(shields) || 0,
                comboCount: parseInt(combo) || 0,
                hasMultiplier: mult === '1',
                isEliminated: elim === '1',
                lastDiceRoll: parseInt(roll) || 0,
                globalIndex: idx,
                isCurrentTurn: idx === currentIdx
              }
            }).filter((p: Player | null): p is Player => p !== null)

            console.log('[DEBUG] Mega-Poll Final Players array:', results)

            if (results.length > 0) {
              setAllGamePlayers(results)
              allGamePlayersRef.current = results

              const currentIdx = results.length > 0 ? (turnIdx % results.length) : 0
              const currentTurnAddr = results[currentIdx]?.address
              if (currentTurnAddr) {
                setCurrentTurnAddress(currentTurnAddr)
                const myTurn = currentTurnAddr.toLowerCase() === address.toLowerCase()
                console.log('[DEBUG] TURN CHECK:', {
                  currentTurnAddr: currentTurnAddr,
                  myAddress: address,
                  currentTurnAddrLower: currentTurnAddr.toLowerCase(),
                  myAddressLower: address.toLowerCase(),
                  isMyTurn: myTurn,
                  allAddresses: results.map(p => p.address)
                })
                setIsMyTurn(myTurn)
              }

              const me = results.find(p => p.address.toLowerCase() === address.toLowerCase())
              if (me) {
                setPlayerPosition(me.position)
                setPlayerXP(me.xp)
                setShields(me.shields)
                setComboCount(me.comboCount)
                setHasMultiplier(me.hasMultiplier)
                setIsLocalPlayerEliminated(me.isEliminated)
              }
            }
          }
        }

        // 2. Process Governance
        if (govData && govData !== 'none' && govData !== governanceProposal) {
          setGovernanceProposal(govData)
          setShowGovernanceVoting(true)
        }

        // 3. Process Logs
        if (logData) {
          const entries = logData.split('|').filter(e => e.trim() !== '')
          const newEntries = entries.filter(e => !lastSeenLogRef.current.includes(e))

          if (newEntries.length > 0) {
            newEntries.forEach(entry => {
              const lowerEntry = entry.toLowerCase()
              if (lowerEntry.includes('rolled') ||
                lowerEntry.includes('wins') ||
                lowerEntry.includes('eliminated') ||
                lowerEntry.includes('stepped') ||
                lowerEntry.includes('reached')) {
                setNotificationQueue(prev => [...prev, entry])
              }

              setGameLog(prev => {
                const logMsg = `${new Date().toLocaleTimeString()}: ⛓️ ${entry}`
                if (!prev.includes(logMsg)) return [...prev, logMsg]
                return prev
              })
            })
            lastSeenLogRef.current = [...lastSeenLogRef.current, ...newEntries].slice(-20)
          }
        }

        // 4. Process Game Over
        if (gameOver === 'FINISHED' && gameState === 'playing') {
          setGameState('finished')
          addLog('🏁 Game finished! Checking winner...')
        }

      } catch (error) {
        console.error('Mega-poll failed:', error)
      }
    }

    fetchFullGameState()
    const interval = setInterval(fetchFullGameState, 6000)
    return () => clearInterval(interval)
  }, [roomCode, address, gameState, governanceProposal])

  useEffect(() => {
    // Always try to load board if we have layout data from the contract
    if (rawBoardLayout && typeof rawBoardLayout === 'string' && rawBoardLayout.trim() !== '') {
      const parsedBoard = parseBoardLayout(rawBoardLayout)
      console.log('[DEBUG] rawBoardLayout string:', rawBoardLayout)
      console.log('[DEBUG] parsedBoard array:', parsedBoard)
      if (parsedBoard.length > 0) {
        // Always override with contract board — it's the source of truth
        setBoard(parsedBoard)
        console.log('🎲 Board loaded from blockchain:', parsedBoard.length, 'blocks')
      }
    } else if (gameState === 'playing' && board.length === 0 && roomCode) {
      // Retry fetching layout specifically if missing
      readGenLayerContract('get_board_layout', [roomCode]).then(layout => {
        if (layout) setRawBoardLayout(String(layout))
      })
    }
  }, [rawBoardLayout, gameState, roomCode])

  // REMOVED: Inconsistent setPlayers poll that was causing type issues.
  // displayPlayerCount and rendering now rely on allGamePlayers polled above.

  useEffect(() => {
    // Only transition to playing when contract explicitly says game started AND we're in waiting state
    // AND we haven't just manually set it to waiting
    // FAILSAFE: Ensure we have at least 2 players before starting (prevents glitch starts)
    const count = parseInt(playerCount as string) || 0

    // Debug log for troubleshooting disappearing board
    if (roomCode && (gameState === 'waiting' || gameState === 'playing')) {
      console.log(`[Board Debug] State: ${gameState}, Started: ${gameStarted}, Players: ${count}, ManualWait: ${manuallyWaiting.current}`)
    }

    if (gameStarted === true && (gameState === 'waiting' || gameState === 'lobby') && roomCode && !manuallyWaiting.current && count >= 2) {
      setGameState('playing')
      addLog('✅ Game started on blockchain!')
      manuallyWaiting.current = false // Reset flag
    }

    // REMOVED: Auto-revert to waiting. Once game starts, we stay in playing/finished.
    // This prevents the "disappearing board" issue if one poll returns false.
  }, [gameStarted, gameState, roomCode, addLog, playerCount])

  // Auto-start when 4 players join
  useEffect(() => {
    const count = parseInt(playerCount as string) || 0
    if (count === 4 && gameStarted === false && gameState === 'waiting' && roomCode) {
      addLog('🎮 4 players joined! Game starting automatically...')
      // Game will auto-start via contract when 4th player joins
    }
  }, [playerCount, gameStarted, gameState, roomCode, addLog])

  // Handle game finished state
  useEffect(() => {
    if (gameFinished === 'FINISHED' && gameState === 'playing') {
      setGameState('finished')
      addLog('🏁 Game finished! Checking winner...')
    }
  }, [gameFinished, gameState, addLog])

  useEffect(() => {
    if (!isConnected) {
      hasSwitched.current = false
      setIsWrongNetwork(false)
      return
    }

    if (chainId && chainId !== GENLAYER_ID && switchChain && !hasSwitched.current) {
      hasSwitched.current = true
      setTimeout(() => {
        try {
          switchChain({ chainId: GENLAYER_ID }, {
            onError: () => setIsWrongNetwork(true),
            onSuccess: () => setIsWrongNetwork(false)
          })
        } catch (err) {
          console.error("Failed to switch chain:", err)
          setIsWrongNetwork(true)
        }
      }, 800)
    } else if (chainId && chainId !== GENLAYER_ID) {
      setIsWrongNetwork(true)
    } else if (chainId === GENLAYER_ID) {
      setIsWrongNetwork(false)
    }
  }, [isConnected, chainId, switchChain])

  useEffect(() => {
    if (!isConnected || !address || isWrongNetwork || hasPromptedSign.current) return

    const signedAddress = localStorage.getItem('genblocks_signed_address')
    if (signedAddress === address) {
      setIsSigned(true)
      return
    }

    hasPromptedSign.current = true
    const message = `Welcome to Gen Blocks!\n\nSign this message to verify your wallet ownership.\n\nWallet: ${address}\nTimestamp: ${Date.now()}`

    signMessage({ message }, {
      onSuccess: () => {
        setIsSigned(true)
        localStorage.setItem('genblocks_signed_address', address)
        hasPromptedSign.current = false
      },
      onError: () => {
        disconnect()
        hasPromptedSign.current = false
      }
    })
  }, [isConnected, address, isWrongNetwork, signMessage, disconnect])

  useEffect(() => {
    if (!isConnected) {
      setIsSigned(false)
      hasPromptedSign.current = false
    }
  }, [isConnected])

  const canPlay = isConnected && !isWrongNetwork && isSigned

  // Create room with blockchain (with signing)
  const createRoom = async () => {
    if (!address) return

    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    addLog(`Creating room ${code} on blockchain...`)

    try {
      const { hash: txHash, wait } = await writeGenLayerContract('create_room', [code], address)
      console.log('Create room transaction sent:', txHash)
      addLog(`📤 Transaction sent: ${txHash.slice(0, 10)}...`)

      await wait()

      setRoomCode(code)
      setAllGamePlayers([{
        address: address || '',
        name: 'You',
        xp: 10,
        position: 0,
        shields: 0,
        comboCount: 0,
        hasMultiplier: false,
        isEliminated: false,
        lastDiceRoll: 0,
        globalIndex: 0,
        isCurrentTurn: true
      }])
      manuallyWaiting.current = true
      setGameState('waiting')
      addLog(`✅ Room ${code} created on blockchain!`)
      addLog(`📋 Share room code: ${code}`)
      addLog(`⏳ Waiting for players to join...`)

      // Immediate refetch to update UI
      setTimeout(() => {
        refreshWaitingRoom()
      }, 1000)

      // Reset manual waiting flag after a delay to allow game start
      setTimeout(() => {
        manuallyWaiting.current = false
      }, 5000)
    } catch (err: any) {
      console.error('Create room failed:', err)
      addLog(`❌ Error: ${err.message || 'Failed to create room'}`)
    }
  }

  // Verify room exists on contract
  const { refetch: refetchRoomCreator } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'get_room_creator',
    args: pendingRoomCode ? [pendingRoomCode] : undefined,
    query: { enabled: false }, // Manual refetch only
  })



  // Join room with blockchain (with signing)
  const joinRoomByCode = async () => {
    if (!address || !joinRoomCode.trim()) {
      addLog('Please enter a room code')
      return
    }

    const code = joinRoomCode.toUpperCase()
    addLog(`Joining room ${code}...`)

    try {
      const { hash: txHash, wait } = await writeGenLayerContract('join_room', [code], address)
      console.log('Join room transaction sent:', txHash)
      addLog(`📤 Transaction sent: ${txHash.slice(0, 10)}...`)

      await wait()

      setRoomCode(code)
      setGameState('waiting')
      addLog(`✅ Joined room ${code}!`)
      setIsJoinModalOpen(false)
      manuallyWaiting.current = true

      // Immediate refetch to update UI
      setTimeout(() => {
        refreshWaitingRoom()
      }, 1000)

      // Reset manual waiting flag after a delay
      setTimeout(() => {
        manuallyWaiting.current = false
      }, 5000)
    } catch (err: any) {
      console.error('Join room failed:', err)
      addLog(`❌ Error: ${err.message || 'Failed to join room'}`)
    }
  }




  const startGame = async () => {
    if (!roomCode || !address) return

    if (!isRoomCreator) {
      addLog('❌ Only the room creator can start the game!')
      return
    }

    const count = parseInt(playerCount as string) || 0
    if (count < MIN_PLAYERS) {
      addLog(`Need at least ${MIN_PLAYERS} players to start!`)
      return
    }

    addLog('Starting game on blockchain...')

    try {
      const { hash: txHash, wait } = await writeGenLayerContract('start_game', [roomCode], address)
      console.log('Start game transaction sent:', txHash)
      addLog(`📤 Transaction sent: ${txHash.slice(0, 10)}...`)

      await wait()

      setGameState('playing')
      addLog('✅ Game started!')
      manuallyWaiting.current = false
    } catch (err: any) {
      console.error('Start game failed:', err)
      addLog(`❌ Error: ${err.message || 'Failed to start game'}`)
    }
  }



  const checkBattleCollision = (position: number) => {
    const playersOnPosition = allGamePlayers.filter(p => p.position === position)

    if (playersOnPosition.length > 1) {
      const xpPerPlayer = 1
      const totalStolen = xpPerPlayer * (playersOnPosition.length - 1)

      setPlayerXP(prev => prev + totalStolen)
      addLog(`⚔️ Battle! You landed on ${playersOnPosition.length - 1} player(s) and stole ${totalStolen} XP!`)
      showXPPopup(totalStolen, 'gain')
    }
  }

  const handleRollDice = async () => {
    if (!address || !roomCode || isRolling || board.length === 0 || !isMyTurn) return

    setIsRolling(true)
    setDiceValue(null)
    addLog('🎲 Rolling dice...')
    // Capture XP before roll so we can show delta in turn summary
    setXpBeforeRoll(playerXP)

    // Start dice animation — cycle random numbers while we wait
    const animInterval = setInterval(() => {
      setDiceValue(Math.floor(Math.random() * 6) + 1)
    }, 100)

    try {
      // 1. Send the dice roll to the blockchain
      const { hash: txHash, wait } = await writeGenLayerContract('roll_dice', [roomCode], address)
      addLog(`📤 Signing transaction...`)

      // 2. Wait for the transaction to be confirmed
      await wait()
      addLog(`✅ Roll confirmed on-chain!`)

      // 3. Small delay for chain state to settle
      await new Promise(r => setTimeout(r, 1000))

      // 4. Poll for updated game state
      const rawData = await readGenLayerContract('get_all_player_data', [roomCode])

      // Stop animation
      clearInterval(animInterval)

      if (!rawData) {
        addLog('⚠️ Could not fetch game state after roll.')
        setIsRolling(false)
        return
      }

      const mainParts = rawData.split(';')
      if (mainParts.length < 4) {
        addLog('⚠️ Invalid game data received.')
        setIsRolling(false)
        return
      }

      const turnIdx = parseInt(mainParts[0]) || 0
      const phase = mainParts[2] as 'rolling' | 'finishing' | 'stealing_response' | 'auctioning' | 'governing' || 'rolling'
      const pTarget = mainParts[4] || ''
      const pAttacker = mainParts[5] || ''
      setPendingStealTarget(pTarget === 'none' ? '' : pTarget)
      setPendingStealAttacker(pAttacker === 'none' ? '' : pAttacker)

      const abid = parseInt(mainParts[6]) || 0
      const abidder = mainParts[7] || ''
      const aturn = parseInt(mainParts[8]) || 0
      setAuctionCurrentBid(abid)
      setAuctionHighestBidder(abidder === 'none' ? '' : abidder)
      setAuctionTurnIndex(aturn)

      const gvoters = mainParts[14] || ''
      setPendingGovVoters(gvoters ? gvoters.split(',') : [])

      if (phase !== 'stealing_response') {
        setStealTimeleft(40)
        setHasRespondedToSteal(false)
      }
      if (phase !== 'auctioning') {
        setAuctionTimeleft(30)
        setHasRespondedToAuction(false)
      }
      if (phase !== 'governing') {
        setGovTimeleft(30)
        setHasRespondedToGov(false)
      }
      const playerStrings = mainParts[3].split('|')

      setTurnPhase(phase)

      // Parse all player data
      const results: Player[] = playerStrings.map((pStr: string, idx: number) => {
        const parts = pStr.split(':')
        if (parts.length < 8) return null
        const [addr, xp, pos, shields, combo, mult, elim, roll] = parts
        const currentIdx = turnIdx % playerStrings.length
        return {
          address: addr,
          name: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
          xp: parseInt(xp) || 0,
          position: parseInt(pos) || 0,
          shields: parseInt(shields) || 0,
          comboCount: parseInt(combo) || 0,
          hasMultiplier: mult === '1',
          isEliminated: elim === '1',
          lastDiceRoll: parseInt(roll) || 0,
          globalIndex: idx,
          isCurrentTurn: idx === currentIdx
        }
      }).filter((p: Player | null): p is Player => p !== null)

      // Update all players state
      setAllGamePlayers(results)
      allGamePlayersRef.current = results

      if (results.length > 0) {
        const currentIdx = turnIdx % results.length
        const currentTurnAddr = results[currentIdx].address
        setCurrentTurnAddress(currentTurnAddr)
        setIsMyTurn(currentTurnAddr.toLowerCase() === address.toLowerCase())
      }

      // 5. Find our updated data and show the result
      const me = results.find(p => p.address.toLowerCase() === address.toLowerCase())
      if (me) {
        const newRoll = me.lastDiceRoll
        const newPos = me.position

        // Show the real dice result
        setDiceValue(newRoll)
        addLog(`🎲 You rolled a ${newRoll}!`)

        // Update local player state
        setPlayerPosition(newPos)
        setPlayerXP(me.xp)
        setShields(me.shields)
        setComboCount(me.comboCount)
        setHasMultiplier(me.hasMultiplier)
        setIsLocalPlayerEliminated(me.isEliminated)

        // 6. After a brief pause for the result to display, process the block
        await new Promise(r => setTimeout(r, 800))

        const activeBlock = board[newPos]
        if (activeBlock) {
          addLog(`📍 Landed on ${activeBlock.name}`)
          setCurrentBlock(activeBlock)
          checkBattleCollision(newPos)

          // Show the appropriate prompt for interactive blocks, or auto-execute
          if (activeBlock.type === 'auction') {
            setShowAuctionPrompt(true)
          } else if (activeBlock.type === 'steal') {
            setShowStealPrompt(true)
          } else if (['build', 'governance'].includes(activeBlock.type)) {
            setShowActionPrompt(true)
          } else {
            executeBlockAction(activeBlock, true)
          }
        }
      }

      setIsRolling(false)

    } catch (err: any) {
      clearInterval(animInterval)
      console.error('Roll dice failed:', err)
      addLog(`❌ Error: ${err.message || 'Failed to roll dice'}`)
      setIsRolling(false)
    }
  }

  const handleFinishTurn = async () => {
    if (!address || !roomCode) return

    setTurnPhase('rolling')

    try {
      const { wait } = await writeGenLayerContract('end_turn', [roomCode], address)
      await wait()
      addLog('✅ Turn finished.')
    } catch (err: any) {
      console.error('Finish turn failed:', err)
      addLog(`❌ Error finishing turn: ${err.message}`)
      setTurnPhase('finishing')
    }
  }

  const handleStealResponse = async (action: 'shield' | 'forfeit' | 'allow' | 'timeout') => {
    if (!address || !roomCode || hasRespondedToSteal) return
    setHasRespondedToSteal(true)
    try {
      addLog(`🛡️ Processing steal response...`)
      const { wait } = await writeGenLayerContract('respond_to_steal', [roomCode, action], address)
      await wait()
      addLog(`✅ Steal response processed.`)
      // Turn summary / mega-poll will pick up the new "finishing" phase.
    } catch (err: any) {
      console.error('Steal response failed:', err)
      addLog(`❌ Error responding to steal: ${err.message}`)
    }
  }

  const handleQuitGame = async () => {
    if (!address || !roomCode) return
    if (!confirm('Are you sure you want to quit? You will be eliminated from the game.')) return

    try {
      addLog('🚪 Leaving game...')
      const { wait } = await writeGenLayerContract('leave_room', [roomCode], address)
      await wait()
      addLog('✅ Left the game.')
      setGameState('lobby')
      setRoomCode('')
      setBoard([])
      setGameLog([])
      setAllGamePlayers([])
      setPlayerXP(0)
      setPlayerPosition(0)
      setShields(0)
      setComboCount(0)
      setHasMultiplier(false)
      setIsLocalPlayerEliminated(false)
    } catch (err: any) {
      console.error('Quit game failed:', err)
      addLog(`❌ Error leaving: ${err.message}`)
    }
  }

  const handleBuildContract = async () => {
    if (!address || !roomCode) return

    addLog('Building contract on blockchain...')
    setShowActionPrompt(false)

    try {
      const { hash: txHash, wait } = await writeGenLayerContract('handle_build_block', [roomCode], address)
      console.log('Build block transaction sent:', txHash)
      addLog(`✅ Built contract! Waiting for confirmation...`)

      await wait()
      addLog('✅ Build confirmed on blockchain!')
      // XP, combo, multiplier will sync from contract via useReadContract hooks
    } catch (err: any) {
      console.error('Build failed:', err)
      addLog(`❌ Error: ${err.message || 'Failed to build'}`)
    }
  }

  const handleChallenge = async () => {
    if (!address || !canBeChallenged) return

    const challengeMessage = `⚔️ Challenge Contract\n\nI challenge the last built contract!\n\nChallenger: ${address}\nTimestamp: ${Date.now()}`

    try {
      await signMessage({ message: challengeMessage }, {
        onSuccess: () => {
          addLog('🤖 AI Validators analyzing...')

          setTimeout(() => {
            const aiDecision = Math.random() > 0.5

            if (aiDecision) {
              setPlayerXP(prev => prev + 3)
              addLog('✅ AI Consensus: Challenge successful! +3 XP')
              showXPPopup(3, 'gain')

              setComboCount(0)
              setHasMultiplier(false)
            } else {
              setPlayerXP(prev => Math.max(0, prev - 3))
              addLog('❌ AI Consensus: Challenge failed! -3 XP. Builder gets +7 XP!')
              showXPPopup(3, 'loss')
            }

            setCanBeChallenged(false)
            setShowChallengePrompt(false)
          }, 3000)
        },
        onError: () => {
          addLog('Challenge cancelled')
          setShowChallengePrompt(false)
        }
      })
    } catch (err) {
      console.error('Challenge failed:', err)
    }
  }

  const handleStartAuction = async () => {
    if (!address || !roomCode) return
    try {
      addLog(`💰 Getting ready for auction...`)
      const { wait } = await writeGenLayerContract('handle_auction_block', [roomCode], address)
      await wait()
      addLog(`✅ Auction started!`)
    } catch (err: any) {
      console.error('Auction start failed:', err)
      addLog(`❌ Error starting auction: ${err.message}`)
    }
  }

  const handleAuctionResponse = async (action: 'bid' | 'pass' | 'timeout', bidAmount?: number) => {
    if (!address || !roomCode || hasRespondedToAuction) return
    setHasRespondedToAuction(true)
    try {
      addLog(`💰 Processing auction ${action}...`)
      const { wait } = await writeGenLayerContract('respond_to_auction', [roomCode, action, bidAmount ? bidAmount.toString() : "0"], address)
      await wait()
      addLog(`✅ Auction ${action} processed.`)
      setAuctionTimeleft(30)
      setHasRespondedToAuction(false) // Ready for next turn if still auctioning
    } catch (err: any) {
      console.error(`Auction ${action} failed:`, err)
      addLog(`❌ Error in auction: ${err.message}`)
      setHasRespondedToAuction(false)
    }
  }

  const handleSteal = async (targetPlayer: Player) => {
    if (!address || !roomCode) return

    addLog(`Attempting to steal from ${targetPlayer.name} on blockchain...`)
    setShowStealPrompt(false)

    try {
      const { hash: txHash, wait } = await writeGenLayerContract('handle_steal_block', [roomCode, targetPlayer.address], address)
      console.log('Steal block transaction sent:', txHash)
      addLog(`✅ Steal attempt processed! Waiting for confirmation...`)

      await wait()
      addLog('✅ Steal finalized!')
      // XP changes will sync from contract via useReadContract hooks
    } catch (err: any) {
      console.error('Steal failed:', err)
      addLog(`❌ Error: ${err.message || 'Failed to steal'}`)
    }
  }

  const handleProposeGovernance = async (proposalType: string) => {
    if (!address || !roomCode) return
    try {
      addLog(`🗳️ Starting governance proposal...`)
      setShowActionPrompt(false)
      const { wait } = await writeGenLayerContract('handle_governance_block', [roomCode, proposalType], address)
      await wait()
      addLog(`✅ Governance proposal created!`)
    } catch (err: any) {
      console.error('Governance start failed:', err)
      addLog(`❌ Error starting governance: ${err.message}`)
      setShowActionPrompt(true)
    }
  }

  const handleVoteProposal = async (action: 'approve' | 'reject' | 'timeout') => {
    if (!address || !roomCode || hasRespondedToGov) return
    setHasRespondedToGov(true)
    try {
      addLog(`🗳️ Casting governance vote...`)
      const { wait } = await writeGenLayerContract('vote_on_proposal', [roomCode, action], address)
      await wait()
      addLog(`✅ Vote placed!`)
      setGovTimeleft(30)
      setHasRespondedToGov(false) // Ready for next turn
    } catch (err: any) {
      console.error('Voting failed:', err)
      addLog(`❌ Error voting: ${err.message}`)
      setHasRespondedToGov(false)
    }
  }

  const executeBlockAction = (block: any, autoExecute: boolean, action?: string) => {
    if (!roomCode) return

    // Call appropriate contract function based on block type
    const callBlockFunc = async (funcName: string, args: any[] = [roomCode]) => {
      try {
        const { hash, wait } = await writeGenLayerContract(funcName, args, address || '')
        addLog(`📤 Processing ${block.type} action...`)
        await wait()
        addLog(`✅ ${block.type} action confirmed! Reward will sync.`)
      } catch (error: any) {
        addLog(`❌ Error: ${error.message}`)
      }
    }

    switch (block.type) {
      case 'bonus':
        callBlockFunc('handle_bonus_block')
        break
      case 'mystery':
        callBlockFunc('handle_mystery_block')
        break
      case 'lucky':
        callBlockFunc('handle_lucky_block')
        break
      case 'governance':
        if (action) callBlockFunc('handle_governance_block', [roomCode, action])
        break
      case 'start':
        addLog('Welcome to the game! +10 XP (initial)')
        break
      case 'danger':
        callBlockFunc('handle_danger_block')
        break
      case 'hazard':
        callBlockFunc('handle_hazard_block')
        break
      case 'end':
        callBlockFunc('handle_end_block')
        break
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Space+Mono:wght@400;700&display=swap');
        
        body {
          margin: 0;
          padding: 0;
          font-family: 'Space Mono', monospace;
          background: #050614;
          color: white;
          overflow-x: hidden;
        }

        @keyframes gridFloat {
          0%, 100% { background-position: 0 0, 0 0, 0 0; }
          50% { background-position: 0 0, -50px -50px, -50px -50px; }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 0.5; }
        }

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes diceRoll {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes diceShake {
          0% { transform: translateX(-2px) rotate(-5deg); }
          25% { transform: translateX(2px) rotate(5deg); }
          50% { transform: translateX(-2px) rotate(-3deg); }
          75% { transform: translateX(2px) rotate(3deg); }
          100% { transform: translateX(0) rotate(0); }
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes popupSlide {
          0% { transform: translate(-50%, -150%); opacity: 0; }
          10% { transform: translate(-50%, -50%); opacity: 1; }
          90% { transform: translate(-50%, -50%); opacity: 1; }
          100% { transform: translate(-50%, -150%); opacity: 0; }
        }

        @keyframes auctionPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(255, 190, 11, 0.4); }
          50% { box-shadow: 0 0 40px rgba(255, 190, 11, 0.8); }
        }

        @keyframes fadeInScale {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }

        .page-container-playgame {
          min-height: 100vh;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 2rem;
          padding-top: 6rem;
          background: 
            linear-gradient(180deg, #050614 0%, #0a0e27 50%, #050614 100%),
            repeating-linear-gradient(90deg, transparent 0px, transparent 99px, rgba(0, 255, 249, 0.1) 100px),
            repeating-linear-gradient(0deg, transparent 0px, transparent 99px, rgba(0, 255, 249, 0.1) 100px);
          background-size: 100% 100%, 100px 100px, 100px 100px;
          animation: gridFloat 20s ease-in-out infinite;
        }

        .page-container-playgame::before {
          content: '';
          position: absolute;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(0, 255, 249, 0.1) 0%, transparent 70%);
          top: -200px;
          right: -200px;
          border-radius: 50%;
          animation: pulse 8s ease-in-out infinite;
          pointer-events: none;
        }

        .page-container-playgame::after {
          content: '';
          position: absolute;
          width: 400px;
          height: 400px;
          background: radial-gradient(circle, rgba(255, 0, 110, 0.08) 0%, transparent 70%);
          bottom: -150px;
          left: -150px;
          border-radius: 50%;
          animation: pulse 6s ease-in-out infinite 1s;
          pointer-events: none;
        }

        .xp-popup {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, #00fff9 0%, #ff006e 100%);
          padding: 2rem 3rem;
          border-radius: 12px;
          font-family: 'Orbitron', sans-serif;
          font-size: 2rem;
          font-weight: 900;
          color: white;
          text-align: center;
          z-index: 10000;
          box-shadow: 0 0 60px rgba(0, 255, 249, 0.8);
          animation: popupSlide 2s ease-out;
        }

        .xp-popup.loss {
          background: linear-gradient(135deg, #ff006e 0%, #8b0000 100%);
        }

        .xp-popup-amount {
          font-size: 3rem;
          color: #ffbe0b;
          display: block;
          margin-top: 0.5rem;
        }

        .wallet-button-playgame {
          position: fixed;
          top: 2rem;
          right: 2rem;
          z-index: 1000;
          animation: slideInRight 0.6s ease-out;
        }

        .back-button-playgame {
          position: fixed;
          top: 2rem;
          left: 2rem;
          z-index: 1000;
          font-family: 'Orbitron', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          padding: 0.8rem 1.5rem;
          background: rgba(10, 14, 39, 0.8);
          border: 2px solid #00fff9;
          color: #00fff9;
          cursor: pointer;
          text-decoration: none;
          display: inline-block;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          backdrop-filter: blur(10px);
          animation: slideInRight 0.6s ease-out;
        }

        .back-button-playgame:hover {
          border-color: #ff006e;
          color: #ff006e;
          box-shadow: 0 0 20px rgba(255, 0, 110, 0.4);
          transform: translateX(-5px);
        }

        .game-header {
          text-align: center;
          margin-bottom: 2rem;
          z-index: 1;
        }

        .game-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 3rem;
          font-weight: 900;
          background: linear-gradient(135deg, #00fff9 0%, #ff006e 50%, #ffbe0b 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          margin-bottom: 1rem;
        }

        .game-stats {
          display: flex;
          gap: 2rem;
          justify-content: center;
          font-family: 'Space Mono', monospace;
          font-size: 1.1rem;
          color: #00fff9;
          flex-wrap: wrap;
        }

        .stat-item {
          background: rgba(0, 255, 249, 0.1);
          border: 1px solid rgba(0, 255, 249, 0.3);
          padding: 0.5rem 1.5rem;
          border-radius: 8px;
        }

        .stat-item.combo {
          background: rgba(255, 190, 11, 0.2);
          border-color: #ffbe0b;
          color: #ffbe0b;
        }

        .game-container {
          width: 100%;
          max-width: 1200px;
          z-index: 1;
          animation: fadeIn 0.6s ease-out;
        }

        .lobby-container {
          background: rgba(10, 14, 39, 0.8);
          border: 3px solid #00fff9;
          border-radius: 12px;
          padding: 3rem;
          text-align: center;
          backdrop-filter: blur(10px);
          box-shadow: 0 0 40px rgba(0, 255, 249, 0.3);
        }

        .lobby-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 2rem;
          color: #00fff9;
          margin-bottom: 2rem;
        }

        .player-count {
          font-family: 'Space Mono', monospace;
          font-size: 1.2rem;
          color: #ffbe0b;
          margin: 1rem 0;
        }

        .lobby-buttons {
          display: flex;
          gap: 2rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .action-button {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.3rem;
          font-weight: 700;
          padding: 1.2rem 3rem;
          background: rgba(10, 14, 39, 0.8);
          border: 3px solid #00fff9;
          color: #00fff9;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          backdrop-filter: blur(10px);
          border-radius: 8px;
          margin: 0.5rem;
        }

        .action-button:hover {
          background: #00fff9;
          color: #050614;
          box-shadow: 0 0 30px rgba(0, 255, 249, 0.6);
          transform: scale(1.05);
        }

        .action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .action-button.secondary {
          border-color: #ff006e;
          color: #ff006e;
        }

        .action-button.secondary:hover {
          background: #ff006e;
          color: #050614;
          box-shadow: 0 0 30px rgba(255, 0, 110, 0.6);
        }

        .action-button.warning {
          border-color: #ffbe0b;
          color: #ffbe0b;
        }

        .action-button.warning:hover {
          background: #ffbe0b;
          color: #050614;
          box-shadow: 0 0 30px rgba(255, 190, 11, 0.6);
        }

        .join-options {
          margin-top: 2rem;
          padding: 2rem;
          background: rgba(255, 0, 110, 0.1);
          border: 2px solid #ff006e;
          border-radius: 12px;
        }

        .join-options h3 {
          font-family: 'Orbitron', sans-serif;
          color: #ff006e;
          margin-bottom: 1.5rem;
        }

        .input-group {
          display: flex;
          gap: 1rem;
          justify-content: center;
          align-items: center;
          margin-top: 1rem;
        }

        .room-code-input {
          font-family: 'Space Mono', monospace;
          font-size: 1.2rem;
          padding: 0.8rem 1.5rem;
          background: rgba(10, 14, 39, 0.8);
          border: 2px solid #ff006e;
          color: #ff006e;
          border-radius: 8px;
          text-align: center;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          width: 200px;
        }

        .room-code-input:focus {
          outline: none;
          border-color: #ffbe0b;
          box-shadow: 0 0 20px rgba(255, 190, 11, 0.4);
        }

        .board-container {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 0.6rem;
          margin: 1.5rem 0;
          padding: 1rem;
          background: rgba(10, 14, 39, 0.6);
          border: 3px solid #00fff9;
          border-radius: 12px;
          backdrop-filter: blur(10px);
          max-width: 900px;
          margin-left: auto;
          margin-right: auto;
        }

        .board-block {
          background: rgba(0, 255, 249, 0.1);
          border: 2px solid rgba(0, 255, 249, 0.3);
          border-radius: 8px;
          padding: 0.8rem 0.2rem;
          text-align: center;
          transition: all 0.3s ease;
          position: relative;
          min-height: 90px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }

        .board-block.active {
          border-color: #ffbe0b;
          box-shadow: 0 0 20px rgba(255, 190, 11, 0.4);
          transform: translateY(-5px);
        }

        .board-block.end-block {
          background: rgba(255, 0, 0, 0.2);
          border-color: #ff0000;
        }

        .board-block.danger-block {
          background: rgba(255, 100, 0, 0.2);
          border-color: #ff6400;
          box-shadow: 0 0 8px rgba(255, 100, 0, 0.3);
        }

        .board-block.hazard-block {
          background: rgba(180, 0, 180, 0.2);
          border-color: #b400b4;
          box-shadow: 0 0 8px rgba(180, 0, 180, 0.3);
        }

        .board-block.steal-block {
          background: rgba(255, 0, 110, 0.15);
          border-color: #ff006e;
        }

        .board-block.auction-block {
          background: rgba(255, 190, 11, 0.15);
          border-color: #ffbe0b;
        }

        .player-markers-container {
          position: absolute;
          inset: 0;
          z-index: 10;
          pointer-events: none;
          display: flex;
          flex-wrap: wrap;
          padding: 2px;
          gap: 2px;
          justify-content: flex-start;
          align-content: flex-start;
        }

        .player-marker {
          font-family: 'Orbitron', sans-serif;
          font-size: 0.55rem;
          font-weight: 900;
          padding: 2px 4px;
          border-radius: 4px;
          color: #000;
          box-shadow: 0 1px 3px rgba(0,0,0,0.5);
          white-space: nowrap;
          z-index: 11;
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .player-marker.you {
          border: 1px solid #fff;
          transform: scale(1.1);
          z-index: 12;
        }

        .block-emoji {
          font-size: 1.8rem;
          margin-bottom: 0.2rem;
        }

        .block-name {
          font-family: 'Orbitron', sans-serif;
          font-size: 0.75rem;
          color: #00fff9;
          margin-bottom: 0.1rem;
        }

        .block-desc {
          font-family: 'Space Mono', monospace;
          font-size: 0.6rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1;
        }

        .global-notification {
          position: fixed;
          top: 2rem;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 255, 249, 0.95);
          color: #050614;
          padding: 1rem 2rem;
          border-radius: 50px;
          font-family: 'Orbitron', sans-serif;
          font-weight: 700;
          z-index: 1000;
          box-shadow: 0 0 30px rgba(0, 255, 249, 0.5);
          animation: slideDown 0.5s ease-out;
          border: 2px solid #fff;
          pointer-events: none;
        }

        @keyframes slideDown {
          from { transform: translate(-50%, -100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }

        .dice-container {
          text-align: center;
          margin: 2rem 0;
        }

        .dice-display {
          font-size: 5rem;
          margin: 1rem 0;
          animation: diceRoll 0.5s ease-in-out;
        }

        .challenge-banner {
          background: rgba(255, 0, 110, 0.3);
          border: 2px solid #ff006e;
          padding: 1rem;
          border-radius: 8px;
          margin: 1rem 0;
          text-align: center;
          animation: pulse 1s ease-in-out infinite;
        }

        .challenge-banner button {
          margin-top: 0.5rem;
        }

        .action-prompt, .steal-prompt, .auction-prompt {
          background: rgba(255, 190, 11, 0.2);
          border: 3px solid #ffbe0b;
          border-radius: 12px;
          padding: 2rem;
          margin: 2rem 0;
          text-align: center;
        }

        .action-prompt h3, .steal-prompt h3, .auction-prompt h3 {
          font-family: 'Orbitron', sans-serif;
          color: #ffbe0b;
          font-size: 1.8rem;
          margin-bottom: 1.5rem;
        }

        .steal-prompt {
          background: rgba(255, 0, 110, 0.2);
          border-color: #ff006e;
        }

        .steal-prompt h3 {
          color: #ff006e;
        }

        .action-choices {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .player-list {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .player-card {
          background: rgba(10, 14, 39, 0.8);
          border: 2px solid rgba(0, 255, 249, 0.3);
          border-radius: 8px;
          padding: 1rem;
          cursor: pointer;
          transition: all 0.3s ease;
        }

        .player-card:hover {
          border-color: #ff006e;
          transform: scale(1.05);
          box-shadow: 0 0 20px rgba(255, 0, 110, 0.4);
        }

        .player-name {
          font-family: 'Orbitron', sans-serif;
          color: #00fff9;
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }

        .player-stats {
          font-family: 'Space Mono', monospace;
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.9rem;
        }

        .bid-input {
          font-family: 'Space Mono', monospace;
          font-size: 1.5rem;
          padding: 1rem;
          background: rgba(10, 14, 39, 0.8);
          border: 2px solid #ffbe0b;
          color: #ffbe0b;
          border-radius: 8px;
          text-align: center;
          width: 150px;
          margin: 1rem;
        }

        .bid-input:focus {
          outline: none;
          box-shadow: 0 0 20px rgba(255, 190, 11, 0.4);
        }

        .game-log {
          background: rgba(10, 14, 39, 0.8);
          border: 2px solid rgba(0, 255, 249, 0.3);
          border-radius: 8px;
          padding: 1rem;
          max-height: 200px;
          overflow-y: auto;
          margin-top: 2rem;
        }

        .log-entry {
          font-family: 'Space Mono', monospace;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
          margin: 0.3rem 0;
        }

        .status-container {
          text-align: center;
          z-index: 1;
          animation: fadeIn 1s ease-out;
        }

        .status-message {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.5rem;
          color: #00fff9;
          margin-bottom: 2rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .warning-message {
          font-family: 'Space Mono', monospace;
          font-size: 1.2rem;
          color: #ff006e;
          padding: 1.5rem 2rem;
          background: rgba(255, 0, 110, 0.1);
          border: 2px solid #ff006e;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          animation: pulse 2s ease-in-out infinite;
        }

        body::after {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 2px;
          background: linear-gradient(to bottom, transparent, rgba(0, 255, 249, 0.3), transparent);
          animation: scanline 8s linear infinite;
          pointer-events: none;
          z-index: 9999;
        }

        @media (max-width: 768px) {
          .wallet-button-playgame { top: 1rem; right: 1rem; }
          .back-button-playgame { top: 1rem; left: 1rem; font-size: 0.9rem; padding: 0.6rem 1rem; }
          .game-title { font-size: 2rem; }
          .game-stats { flex-direction: column; gap: 0.5rem; font-size: 1rem; }
          .lobby-buttons { flex-direction: column; }
          .board-container { grid-template-columns: repeat(3, 1fr); gap: 0.5rem; padding: 1rem; }
          .block-emoji { font-size: 2rem; }
          .action-button { font-size: 1rem; padding: 1rem 2rem; }
          .input-group { flex-direction: column; }
          .xp-popup { font-size: 1.5rem; padding: 1.5rem 2rem; }
          .player-list { grid-template-columns: 1fr; }
          .board-container { grid-template-columns: repeat(3, 1fr); gap: 0.5rem; padding: 1rem; }
        }

        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }

        .timeout-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(5, 6, 20, 0.9);
          backdrop-filter: blur(15px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 20000;
          animation: fadeIn 0.5s ease-out;
          padding: 2rem;
          text-align: center;
        }

        .timeout-box {
          background: rgba(10, 14, 39, 0.8);
          border: 3px solid #ff006e;
          border-radius: 20px;
          padding: 3rem;
          max-width: 600px;
          box-shadow: 0 0 50px rgba(255, 0, 110, 0.3);
        }

        .timeout-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 2.5rem;
          color: #ff006e;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
        }

        .timeout-desc {
          font-family: 'Space Mono', monospace;
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 2.5rem;
          line-height: 1.6;
        }
      `}}></style>

      <div className="page-container-playgame">
        <Link href="/" className="back-button-playgame">
          ← Back
        </Link>

        <div className="wallet-button-playgame">
          <ConnectButton />
        </div>

        {xpPopup.show && (
          <div className={`xp-popup ${xpPopup.type === 'loss' ? 'loss' : ''}`}>
            {xpPopup.type === 'gain' ? '🎉 Congratulations!' : '💔 Oh No!'}
            <span className="xp-popup-amount">
              {xpPopup.type === 'gain' ? '+' : '-'}{xpPopup.amount} XP
            </span>
          </div>
        )}

        {/* Global Notification Pop-up */}
        {globalNotification && (
          <div className="global-notification" style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 255, 249, 0.95)',
            color: '#000',
            padding: '1rem 2rem',
            borderRadius: '50px',
            boxShadow: '0 0 30px rgba(0, 255, 249, 0.6)',
            zIndex: 10000,
            fontFamily: 'Orbitron',
            fontWeight: '900',
            animation: 'slideDown 0.5s ease-out',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            border: '2px solid #fff'
          }}>
            <span>🎮</span> {globalNotification.message}
          </div>
        )}


        {!canPlay ? (
          <div className="status-container">
            {!isConnected ? (
              <p className="status-message">Connect your wallet to play</p>
            ) : isWrongNetwork ? (
              <p className="warning-message">⚠️ Wrong Network - Please switch to GenLayer Testnet</p>
            ) : (
              <p className="status-message">Verifying wallet...</p>
            )}
          </div>
        ) : (
          <>
            <div className="game-header">
              <h1 className="game-title">Gen Blocks</h1>
              <div className="game-stats">
                <div className="stat-item">XP: {playerXP}</div>
                <div className="stat-item">Position: {playerPosition}</div>
                <div className="stat-item">Shields: {shields} 🛡️</div>
                {comboCount > 0 && <div className="stat-item combo">Combo: {comboCount} 🔥</div>}
                {hasMultiplier && <div className="stat-item combo">2x Multiplier! ⚡</div>}
              </div>
            </div>

            <div className="game-container">
              {isCheckingActiveRoom ? (
                <div className="lobby-container">
                  <h2 className="lobby-title" style={{ color: '#ffbe0b' }}>🔄 Reconnecting...</h2>
                  <p className="status-message">Checking your active game status on chain.</p>
                </div>
              ) : gameState === 'lobby' && (
                <div className="lobby-container">
                  <h2 className="lobby-title">🎮 Game Lobby</h2>
                  <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem' }}>
                    Join a room to start playing!<br />
                    <strong style={{ color: '#ffbe0b' }}>Everyone starts with 10 XP!</strong><br />
                    <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)' }}>
                      Min: {MIN_PLAYERS} players | Max: {MAX_PLAYERS} players
                    </span>
                  </p>
                  <div className="lobby-buttons">
                    <button className="action-button" onClick={createRoom}>
                      🏠 Create Room
                    </button>
                  </div>

                  <div className="join-options" style={{ marginTop: '2rem' }}>
                    <h3>Join Existing Room</h3>
                    <div className="input-group">
                      <input
                        type="text"
                        className="room-code-input"
                        placeholder="ENTER CODE"
                        value={joinRoomCode}
                        onChange={(e) => setJoinRoomCode(e.target.value)}
                        maxLength={8}
                      />
                      <button className="action-button secondary" onClick={joinRoomByCode}>
                        Join Room
                      </button>
                    </div>
                    <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
                      <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.5rem' }}>
                        Disconnect? Try forcing a check:
                      </p>
                      <button
                        className="action-button"
                        style={{ fontSize: '0.9rem', padding: '0.5rem 1rem', border: '1px solid #ffbe0b', color: '#ffbe0b' }}
                        onClick={() => {
                          setIsCheckingActiveRoom(true)
                          // Trigger re-check manually by resetting roomCode if needed, 
                          // but mainly just running the check logic again
                          const check = async () => {
                            try {
                              const activeRoom = await readGenLayerContract('get_active_room', [address])
                              if (activeRoom && activeRoom !== 'none') {
                                setRoomCode(activeRoom)
                                setGameState('playing')
                                addLog(`🔄 Reconnected to room: ${activeRoom}`)
                              } else {
                                addLog('❌ No active game found on chain.')
                              }
                            } catch (e) {
                              console.error(e)
                            } finally {
                              setIsCheckingActiveRoom(false)
                            }
                          }
                          check()
                        }}
                      >
                        🔄 Check for Active Game
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {gameState === 'waiting' && (
                <div className="lobby-container">
                  <h2 className="lobby-title">Room: {roomCode}</h2>

                  {/* Room Code Display - Prominent */}
                  <div style={{
                    background: 'rgba(0, 255, 249, 0.1)',
                    border: '3px solid #00fff9',
                    borderRadius: '12px',
                    padding: '1.5rem',
                    marginBottom: '2rem',
                    textAlign: 'center'
                  }}>
                    <p style={{ color: '#00fff9', fontSize: '0.9rem', marginBottom: '0.5rem', fontFamily: 'Space Mono' }}>
                      Share this room code with other players:
                    </p>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '1rem',
                      flexWrap: 'wrap'
                    }}>
                      <p style={{
                        color: '#ffbe0b',
                        fontSize: '2rem',
                        fontFamily: 'Orbitron',
                        fontWeight: '900',
                        letterSpacing: '0.2em',
                        margin: 0,
                        textTransform: 'uppercase'
                      }}>
                        {roomCode}
                      </p>
                      <button
                        className="action-button"
                        style={{ padding: '0.5rem 1.5rem', fontSize: '0.9rem' }}
                        onClick={() => {
                          navigator.clipboard.writeText(roomCode)
                          addLog('Room code copied to clipboard!')
                        }}
                      >
                        📋 Copy
                      </button>
                    </div>
                  </div>

                  <p className="player-count">
                    Players: {displayPlayerCount}/{MAX_PLAYERS}
                  </p>
                  <button
                    type="button"
                    className="action-button"
                    style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem', marginBottom: '1rem' }}
                    onClick={refreshWaitingRoom}
                  >
                    🔄 Refresh
                  </button>

                  {isRoomCreator && (
                    <p style={{ color: '#00fff9', fontSize: '0.9rem', marginBottom: '1rem' }}>
                      👑 You are the room creator
                    </p>
                  )}

                  {!isRoomCreator && roomCreator && (
                    <p style={{ color: '#ffbe0b', fontSize: '1rem', marginBottom: '1rem', fontFamily: 'Space Mono' }}>
                      ⏳ Waiting for {roomCreator.slice(0, 6)}...{roomCreator.slice(-4)} to start the game
                    </p>
                  )}



                  <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '2rem' }}>
                    {displayPlayerCount < MIN_PLAYERS
                      ? `Waiting for ${MIN_PLAYERS - displayPlayerCount} more player(s) to start...`
                      : displayPlayerCount === 4
                        ? '🎮 Game will start automatically! (4 players)'
                        : isRoomCreator
                          ? 'Ready to start! Click below to begin.'
                          : `Waiting for room creator to start the game...`}
                  </p>

                  {isRoomCreator && displayPlayerCount >= MIN_PLAYERS && (
                    <button
                      className="action-button"
                      onClick={startGame}
                    >
                      {`Start Game (${displayPlayerCount}/${MAX_PLAYERS} players)`}
                    </button>
                  )}

                  <p style={{ fontSize: '0.9rem', color: '#ffbe0b', marginTop: '1rem' }}>
                    💡 Board layout is stored on-chain!
                  </p>
                </div>
              )}

              {gameState === 'playing' && (
                <>

                  {canBeChallenged && (
                    <div className="challenge-banner">
                      <p style={{ color: '#ff006e', fontFamily: 'Orbitron', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
                        ⚔️ A contract can be challenged!
                      </p>
                      <button
                        className="action-button secondary"
                        onClick={() => setShowChallengePrompt(true)}
                      >
                        Challenge Contract
                      </button>
                    </div>
                  )}

                  <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                    <div style={{
                      padding: '1.5rem',
                      background: isMyTurn ? 'rgba(0, 255, 249, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isMyTurn ? '#00fff9' : 'rgba(255,255,255,0.2)'}`,
                      borderRadius: '12px',
                      boxShadow: isMyTurn ? '0 0 20px rgba(0, 255, 249, 0.2)' : 'none'
                    }}>
                      <p style={{
                        fontFamily: 'Orbitron',
                        fontSize: '1.4rem',
                        fontWeight: '900',
                        color: isMyTurn ? '#00fff9' : '#ffffff',
                        margin: 0,
                        letterSpacing: '0.1em'
                      }}>
                        {isMyTurn ? '🌟 IT IS YOUR TURN!' : '⌛ WAITING FOR TURN...'}
                      </p>

                    </div>
                  </div>



                  {board.length > 0 ? (
                    <>
                      <div className="board-container">
                        {board.map((block, index) => (
                          <div
                            key={block.id}
                            className={`board-block 
                              ${playerPosition === index ? 'active' : ''} 
                              ${block.type === 'steal' ? 'steal-block' : ''}
                              ${block.type === 'auction' ? 'auction-block' : ''}
                              ${block.type === 'danger' ? 'danger-block' : ''}
                              ${block.type === 'hazard' ? 'hazard-block' : ''}
                              ${block.type === 'end' ? 'end-block' : ''}`}
                          >
                            <div className="player-markers-container">
                              {/* Player markers grid layout inside the block */}
                              {allGamePlayers.map((p) => (
                                p.position === index && (
                                  <div
                                    key={p.address}
                                    className={`player-marker pos-${p.globalIndex % 4} ${p.address.toLowerCase() === address?.toLowerCase() ? 'you' : ''}`}
                                    style={{
                                      backgroundColor: ['#00fff9', '#ff006e', '#ffbe0b', '#4CAF50'][p.globalIndex % 4],
                                      borderColor: p.address.toLowerCase() === address?.toLowerCase() ? '#fff' : 'transparent'
                                    }}
                                  >
                                    {p.address.toLowerCase() === address?.toLowerCase() ? 'YOU' : `P${p.globalIndex + 1}`}
                                  </div>
                                )
                              ))}
                            </div>
                            <div className="block-emoji">{block.emoji}</div>
                            <div className="block-name">{block.name}</div>
                            <div className="block-desc">{block.description}</div>
                          </div>
                        ))}
                      </div>

                      <div className="dice-container" style={{ marginTop: '1rem', textAlign: 'center' }}>
                        {/* Dice display */}
                        {diceValue !== null && (
                          <div style={{
                            fontSize: isRolling ? '3rem' : '3.5rem',
                            margin: '1rem 0',
                            fontWeight: 'bold',
                            color: isRolling ? '#ffbe0b' : '#00fff9',
                            textShadow: isRolling
                              ? '0 0 20px rgba(255, 190, 11, 0.8)'
                              : '0 0 30px rgba(0, 255, 249, 0.8)',
                            animation: isRolling ? 'diceShake 0.1s infinite' : 'none',
                            transition: 'all 0.3s ease',
                          }}>
                            🎲 {diceValue}
                          </div>
                        )}
                        <button
                          className="action-button"
                          onClick={handleRollDice}
                          disabled={
                            isRolling ||
                            showActionPrompt ||
                            showStealPrompt ||
                            showAuctionPrompt ||
                            isLocalPlayerEliminated ||
                            turnPhase === 'finishing' ||
                            !isMyTurn
                          }
                        >
                          {isLocalPlayerEliminated ? '💀 ELIMINATED' :
                            (turnPhase === 'finishing') ? '⏳ WAITING FOR TURN SUMMARY' :
                              (!isMyTurn) ? `⏳ WAIT (TURN: ${(currentTurnAddress || '').slice(0, 6)})` :
                                (isRolling ? '🎲 Rolling...' : '🎲 Roll Dice')}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="lobby-container">
                      <p style={{ color: '#00fff9', textAlign: 'center' }}>Loading board from blockchain...</p>
                    </div>
                  )}

                  <div style={{ marginTop: '2rem', marginBottom: '2rem' }}>
                    <PlayersDisplay
                      players={allGamePlayers}
                      currentPlayerAddress={address}
                      boardLength={board.length}
                    />
                  </div>

                  {showChallengePrompt && (
                    <div className="steal-prompt">
                      <h3>⚔️ Challenge Contract!</h3>
                      <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1.5rem' }}>
                        Challenge the last built contract!<br />
                        <strong style={{ color: '#00ff00' }}>Win: +3 XP & break their combo</strong><br />
                        <strong style={{ color: '#ff006e' }}>Lose: -3 XP & they get +7 XP</strong>
                      </p>
                      <div className="action-choices">
                        <button className="action-button warning" onClick={handleChallenge}>
                          ⚔️ Challenge (AI will decide)
                        </button>
                        <button
                          className="action-button secondary"
                          onClick={() => setShowChallengePrompt(false)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ====== UNIFIED TURN SUMMARY FULLSCREEN POPUP ====== */}
                  {(turnPhase === 'finishing' || turnPhase === 'stealing_response' || turnPhase === 'auctioning' || turnPhase === 'governing') && (() => {
                    const isStealingResponse = turnPhase === 'stealing_response'
                    const isStealTarget = pendingStealTarget.toLowerCase() === address?.toLowerCase()
                    const isAuctioning = turnPhase === 'auctioning'
                    const auctionCurrentAddr = allGamePlayers.length > 0 ? (allGamePlayers[auctionTurnIndex % allGamePlayers.length]?.address || '') : ''
                    const isMyAuctionTurn = auctionCurrentAddr.toLowerCase() === address?.toLowerCase()

                    const isGoverning = turnPhase === 'governing'
                    const isMyGovTurn = pendingGovVoters.includes(address?.toLowerCase() || '')

                    const currentPlayer = allGamePlayers.find(p => p.address.toLowerCase() === (currentTurnAddress || '').toLowerCase())
                    const landedBlock = currentPlayer ? board[currentPlayer.position] : null
                    const roll = currentPlayer?.lastDiceRoll ?? 0
                    const isActivePlayer = isMyTurn

                    // Determine XP change message based on block type
                    const getBlockXPInfo = () => {
                      if (!landedBlock) return null
                      switch (landedBlock.type) {
                        case 'build': return { icon: '🟩', action: 'Built a contract', xp: `+${currentPlayer?.hasMultiplier ? 12 : 6} XP`, color: '#4CAF50' }
                        case 'bonus': return { icon: '🟨', action: 'Bonus collected', xp: `+${currentPlayer?.hasMultiplier ? 10 : 5} XP or Shield`, color: '#ffbe0b' }
                        case 'mystery': return { icon: '⭐', action: 'Mystery reward', xp: `Random XP/Shield${currentPlayer?.hasMultiplier ? ' (⚡ 2X Active!)' : ''}`, color: '#a855f7' }
                        case 'lucky': return { icon: '🎁', action: 'Lucky bonus', xp: `+${currentPlayer?.hasMultiplier ? 30 : 15} XP, Shield, or 2X`, color: '#00fff9' }
                        case 'steal': return { icon: '🏴\u200d☠️', action: 'Stealing from a player', xp: '+5 XP stolen', color: '#ff006e' }
                        case 'auction': return { icon: '💰', action: 'Auction block', xp: 'Bid for 2x multiplier', color: '#ff9500' }
                        case 'governance': return { icon: '🟥', action: 'Governance vote', xp: 'Community decision', color: '#ef4444' }
                        case 'danger': return { icon: '⚠️', action: 'Danger! XP penalty', xp: `-${currentPlayer?.hasMultiplier ? 4 : 2} XP`, color: '#ff6400' }
                        case 'hazard': return { icon: '💀', action: 'Hazard! XP penalty', xp: `-${currentPlayer?.hasMultiplier ? 10 : 5} XP`, color: '#b400b4' }
                        case 'end': return { icon: '☠️', action: 'END Block hit!', xp: '-10 XP + Eliminated', color: '#ff0000' }
                        case 'start': return { icon: '🏁', action: 'Passed START', xp: '+10 XP', color: '#00fff9' }
                        default: return null
                      }
                    }
                    const xpInfo = getBlockXPInfo()

                    return (
                      <div style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0, 0, 0, 0.75)',
                        backdropFilter: 'blur(8px)',
                        padding: '1rem',
                      }}>
                        <div style={{
                          background: 'linear-gradient(135deg, rgba(10,14,39,0.98) 0%, rgba(20,28,70,0.98) 100%)',
                          border: `2px solid ${landedBlock ? (xpInfo?.color || '#00fff9') : '#00fff9'}`,
                          borderRadius: '20px',
                          padding: '2.5rem',
                          maxWidth: '480px',
                          width: '100%',
                          boxShadow: `0 0 60px ${xpInfo?.color || '#00fff9'}55, 0 20px 40px rgba(0,0,0,0.8)`,
                          fontFamily: 'Orbitron, sans-serif',
                          animation: 'fadeInScale 0.3s ease-out',
                        }}>
                          {/* Header */}
                          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>
                              {landedBlock?.emoji || '📊'}
                            </div>
                            <h2 style={{ color: '#00fff9', fontSize: '1.3rem', margin: 0, letterSpacing: '0.1em' }}>
                              📊 TURN SUMMARY
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', marginTop: '0.3rem' }}>
                              {isActivePlayer ? '🌟 YOUR TURN' : `PLAYER ${(currentPlayer?.globalIndex ?? 0) + 1}'S TURN`}
                            </p>
                          </div>

                          {/* Dice + Block row */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                            <div style={{
                              textAlign: 'center',
                              background: 'rgba(255, 190, 11, 0.1)',
                              border: '1px solid rgba(255,190,11,0.4)',
                              borderRadius: '12px', padding: '1rem'
                            }}>
                              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>ROLLED</div>
                              <div style={{ fontSize: '2rem', color: '#ffbe0b' }}>🎲 {roll}</div>
                            </div>
                            <div style={{
                              textAlign: 'center',
                              background: `${xpInfo?.color || '#00fff9'}18`,
                              border: `1px solid ${xpInfo?.color || '#00fff9'}55`,
                              borderRadius: '12px', padding: '1rem'
                            }}>
                              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.4rem' }}>LANDED ON</div>
                              <div style={{ fontSize: '1rem', color: xpInfo?.color || '#00fff9' }}>
                                {landedBlock?.emoji} {landedBlock?.name || 'Unknown'}
                              </div>
                            </div>
                          </div>

                          {/* XP Result bar */}
                          {xpInfo && (
                            <div style={{
                              background: `${xpInfo.color}18`,
                              border: `1px solid ${xpInfo.color}55`,
                              borderRadius: '12px',
                              padding: '1rem 1.5rem',
                              marginBottom: '1.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '1rem'
                            }}>
                              <div style={{ fontSize: '1.5rem' }}>{xpInfo.icon}</div>
                              <div>
                                <div style={{ color: xpInfo.color, fontWeight: 700, fontSize: '1rem' }}>
                                  {xpInfo.action}
                                </div>
                                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                                  {xpInfo.xp}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Responsive Interaction Section */}
                          {isStealingResponse ? (
                            <div style={{
                              borderTop: '1px solid rgba(255,255,255,0.15)',
                              paddingTop: '1.5rem',
                              marginBottom: '1.5rem',
                              textAlign: 'center'
                            }}>
                              {isStealTarget ? (
                                <>
                                  <p style={{ color: '#ff006e', fontSize: '1.1rem', marginBottom: '1rem', fontWeight: 'bold' }}>
                                    ⚠️ {pendingStealAttacker.slice(0, 6)} is trying to steal 5 XP!
                                  </p>
                                  <div style={{ marginBottom: '1.5rem', color: stealTimeleft <= 10 ? '#ef4444' : '#00fff9', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    ⏱️ {stealTimeleft}s remaining to decide
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
                                    <button
                                      className="action-button"
                                      style={{ width: '100%', background: 'rgba(0,255,249,0.1)', border: '1px solid #00fff9' }}
                                      onClick={() => handleStealResponse('shield')}
                                      disabled={shields <= 0}
                                    >
                                      🛡️ Use Shield ({shields} left)
                                    </button>
                                    <button
                                      className="action-button warning"
                                      style={{ width: '100%' }}
                                      onClick={() => handleStealResponse('forfeit')}
                                    >
                                      📉 Pay 7 XP to block
                                    </button>
                                    <button
                                      className="action-button secondary"
                                      style={{ width: '100%', border: '1px solid #ff006e', color: '#ff006e' }}
                                      onClick={() => handleStealResponse('allow')}
                                    >
                                      💸 Allow Steal (-5 XP)
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div>
                                  <p style={{ color: '#ffbe0b', fontSize: '1rem', marginBottom: '0.5rem' }}>
                                    ⌛ Waiting for {pendingStealTarget.slice(0, 6)} to respond to steal...
                                  </p>
                                  <div className="loader" style={{ margin: '1rem auto' }} />
                                </div>
                              )}
                            </div>
                          ) : isAuctioning ? (
                            <div style={{
                              borderTop: '1px solid rgba(255,255,255,0.15)',
                              paddingTop: '1.5rem',
                              marginBottom: '1.5rem',
                              textAlign: 'center'
                            }}>
                              <h3 style={{ color: '#ffbe0b', marginBottom: '0.5rem' }}>💰 AUCTION FOR 2X MULTIPLIER</h3>
                              <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1rem' }}>
                                Highest Bid: <strong style={{ color: '#00fff9' }}>{auctionCurrentBid} XP</strong>
                                {auctionHighestBidder ? ` (by ${auctionHighestBidder.slice(0, 6)})` : ''}
                              </p>

                              {isMyAuctionTurn ? (
                                <>
                                  <div style={{ marginBottom: '1.5rem', color: auctionTimeleft <= 10 ? '#ef4444' : '#00fff9', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    ⏱️ {auctionTimeleft}s remaining to bid
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', alignItems: 'center' }}>
                                    <button
                                      className="action-button warning"
                                      style={{ width: '100%' }}
                                      onClick={() => handleAuctionResponse('bid', Math.max(2, auctionCurrentBid + 1))}
                                      disabled={playerXP < Math.max(2, auctionCurrentBid + 1)}
                                    >
                                      Bid {Math.max(2, auctionCurrentBid + 1)} XP
                                    </button>
                                    <button
                                      className="action-button warning"
                                      style={{ width: '100%' }}
                                      onClick={() => handleAuctionResponse('bid', Math.max(5, auctionCurrentBid + 5))}
                                      disabled={playerXP < Math.max(5, auctionCurrentBid + 5)}
                                    >
                                      Bid {Math.max(5, auctionCurrentBid + 5)} XP
                                    </button>
                                    <button
                                      className="action-button secondary"
                                      style={{ width: '100%', border: '1px solid #ff006e', color: '#ff006e' }}
                                      onClick={() => handleAuctionResponse('pass')}
                                    >
                                      Pass / Fold
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div>
                                  <p style={{ color: '#ffbe0b', fontSize: '1rem', marginBottom: '0.5rem' }}>
                                    ⌛ Waiting for {(auctionCurrentAddr || '').slice(0, 6)} to bid...
                                  </p>
                                  <div className="loader" style={{ margin: '1rem auto' }} />
                                </div>
                              )}
                            </div>
                          ) : isGoverning ? (
                            <div style={{
                              borderTop: '1px solid rgba(255,255,255,0.15)',
                              paddingTop: '1.5rem',
                              marginBottom: '1.5rem',
                              textAlign: 'center'
                            }}>
                              <h3 style={{ color: '#ef4444', marginBottom: '0.5rem' }}>🟥 GOVERNANCE VOTE</h3>
                              <p style={{ color: 'rgba(255,255,255,0.8)', marginBottom: '1rem', fontStyle: 'italic' }}>
                                "{governanceProposal.split(':')[1] || governanceProposal}"
                              </p>

                              {isMyGovTurn ? (
                                <>
                                  <div style={{ marginBottom: '1rem', color: govTimeleft <= 10 ? '#ef4444' : '#00fff9', fontSize: '1.2rem', fontWeight: 'bold' }}>
                                    ⏱️ {govTimeleft}s remaining to vote
                                  </div>
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <button className="action-button" style={{ background: 'rgba(76, 175, 80, 0.2)', border: '1px solid #4CAF50' }} onClick={() => handleVoteProposal('approve')}>
                                      ✅ VOTE YES
                                    </button>
                                    <button className="action-button secondary" style={{ border: '1px solid #ef4444', color: '#ef4444' }} onClick={() => handleVoteProposal('reject')}>
                                      ❌ VOTE NO
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div>
                                  <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1.5rem' }}>
                                    <div style={{ color: '#4CAF50', fontSize: '1.2rem' }}>✅ YES: {govYesVotes}</div>
                                    <div style={{ color: '#ef4444', fontSize: '1.2rem' }}>❌ NO: {govNoVotes}</div>
                                  </div>
                                  <p style={{ color: '#ffbe0b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                    ⌛ Waiting for others to vote... ({pendingGovVoters.length} remaining)
                                  </p>
                                  <div className="loader" style={{ margin: '1rem auto' }} />
                                </div>
                              )}
                            </div>
                          ) : (
                            // Standard Block Action Section — only for active player on interactive blocks
                            isActivePlayer && currentBlock && (['build', 'steal', 'auction', 'governance'].includes(currentBlock.type)) && (
                              <div style={{
                                borderTop: '1px solid rgba(255,255,255,0.15)',
                                paddingTop: '1.5rem',
                                marginBottom: '1.5rem'
                              }}>
                                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem' }}>
                                  {currentBlock.type === 'build' && `Build an Intelligent Contract! ${hasMultiplier ? '⚡ 2x Multiplier Active!' : ''}`}
                                  {currentBlock.type === 'steal' && 'Choose a player to steal from:'}
                                  {currentBlock.type === 'auction' && `Start an auction to win a 2x multiplier!`}
                                  {currentBlock.type === 'governance' && 'Choose a governance proposal to enforce!'}
                                </p>

                                {currentBlock.type === 'build' && (
                                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                                    <button className="action-button" onClick={handleBuildContract}>
                                      🟩 Build Contract (+{hasMultiplier ? 12 : 6} XP)
                                    </button>
                                  </div>
                                )}

                                {currentBlock.type === 'steal' && (
                                  <div className="player-list">
                                    {otherPlayers.map((player, idx) => (
                                      <div key={idx} className="player-card" onClick={() => handleSteal(player)}
                                        style={{ cursor: 'pointer' }}>
                                        <div className="player-name">{player.name}</div>
                                        <div className="player-stats">XP: {player.xp} | Shields: {player.shields} 🛡️</div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {currentBlock.type === 'auction' && (
                                  <div className="action-choices">
                                    <button className="action-button warning" onClick={() => handleStartAuction()}>
                                      💰 Start Auction!
                                    </button>
                                  </div>
                                )}

                                {currentBlock.type === 'governance' && (
                                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.8rem' }}>
                                    <button className="action-button default" onClick={() => handleProposeGovernance('group_xp')}>🌟 Universal Stimulus (+5 XP Everyone)</button>
                                    <button className="action-button default" onClick={() => handleProposeGovernance('shield_all')}>🛡️ Arm the Treasury (+1 Shield Everyone)</button>
                                    <button className="action-button warning" onClick={() => handleProposeGovernance('grant_multipliers')}>⚡ Power Surge (2x Multipliers Everyone)</button>
                                    <button className="action-button warning" style={{ border: '1px solid #ef4444', color: '#ef4444' }} onClick={() => handleProposeGovernance('burn_shields')}>🔥 Scorched Earth (Destroy All Shields)</button>
                                    <button className="action-button warning" style={{ border: '1px solid #ef4444', color: '#ef4444' }} onClick={() => handleProposeGovernance('strip_multipliers')}>🔻 Power Drain (Remove All 2x Multipliers)</button>
                                    <button className="action-button secondary" style={{ border: '1px solid #ef4444', color: '#ef4444' }} onClick={() => handleProposeGovernance('tax_players')}>💸 Global Tax (-5 XP Everyone)</button>
                                  </div>
                                )}
                              </div>
                            )
                          )}

                          {/* Footer actions */}
                          {isActivePlayer ? (
                            <button
                              className="action-button"
                              style={{ width: '100%', padding: '1rem', fontSize: '1rem', opacity: (isStealingResponse || isAuctioning || isGoverning) ? 0.5 : 1 }}
                              onClick={handleFinishTurn}
                              disabled={isStealingResponse || isAuctioning || isGoverning || (currentBlock ? ['build', 'steal', 'auction', 'governance'].includes(currentBlock.type) && showActionPrompt : false)}
                            >
                              ✅ Finish Turn
                            </button>
                          ) : (!isStealingResponse && !isAuctioning && !isGoverning) && (
                            <div style={{ textAlign: 'center' }}>
                              <p style={{ color: '#ffbe0b', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                ⌛ Waiting for active player to finish turn...
                              </p>
                              <div className="loader" style={{ margin: '0 auto' }} />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })()}


                  {showGovernanceVoting && (
                    <GovernanceVoting
                      roomCode={roomCode}
                      proposal={governanceProposal}
                      onVoteComplete={() => {
                        setGovernanceProposal('none')
                      }}
                      onClose={() => {
                        setShowGovernanceVoting(false)
                        setGovernanceProposal('none')
                      }}
                    />
                  )}
                  <div className="game-log">
                    <h3 style={{ fontFamily: 'Orbitron', color: '#00fff9', marginBottom: '1rem' }}>
                      📜 Game Log
                    </h3>
                    {gameLog.slice().reverse().map((log, index) => (
                      <div key={index} className="log-entry">{log}</div>
                    ))}
                  </div>

                  <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <button
                      className="action-button"
                      style={{
                        background: 'rgba(255, 0, 110, 0.15)',
                        border: '2px solid #ff006e',
                        color: '#ff006e',
                        padding: '0.8rem 2rem',
                        fontSize: '0.9rem'
                      }}
                      onClick={handleQuitGame}
                    >
                      🚪 Quit Game
                    </button>
                  </div>
                </>
              )}

              {gameState === 'finished' && (() => {
                const sortedPlayers = [
                  { address: address || '0x...', name: 'You', xp: playerXP },
                  ...otherPlayers
                ].sort((a, b) => b.xp - a.xp);

                const winnerName = sortedPlayers.length > 0 ? sortedPlayers[0].name : 'Someone';

                return (
                  <div className="lobby-container">
                    <h2 className="lobby-title" style={{ color: '#4CAF50' }}>🏁 Game Finished</h2>
                    <p style={{ fontSize: '1.2rem', margin: '1rem 0' }}>
                      {winnerName === 'You' ? (
                        <span style={{ color: '#ffbe0b', fontWeight: 'bold' }}>🎉 YOU won the match! 🎉</span>
                      ) : (
                        <span><span style={{ color: '#ffbe0b', fontWeight: 'bold' }}>{winnerName}</span> won the match!</span>
                      )}
                    </p>

                    <div className="ranking-list" style={{
                      width: '100%',
                      maxWidth: '500px',
                      margin: '2rem auto',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}>
                      <h3 style={{ marginBottom: '1.5rem', fontFamily: 'Orbitron', color: '#ffbe0b' }}>🏆 Final Rankings</h3>
                      {sortedPlayers.map((p, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '1rem',
                          marginBottom: '0.5rem',
                          background: idx === 0 ? 'rgba(255, 190, 11, 0.2)' : 'rgba(255,255,255,0.05)',
                          border: idx === 0 ? '1px solid #ffbe0b' : '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: idx === 0 ? '#ffbe0b' : '#00fff9' }}>
                              #{idx + 1}
                            </span>
                            <span style={{ fontSize: '1.1rem', fontWeight: idx === 0 ? 'bold' : 'normal', color: p.name === 'You' ? '#00fff9' : '#fff' }}>
                              {p.name} {idx === 0 ? '👑' : ''}
                            </span>
                          </div>
                          <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{p.xp} XP</span>
                        </div>
                      ))}
                    </div>

                    <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2.5rem' }}>
                      Results have been recorded on the global leaderboard.
                    </p>

                    <button className="action-button" onClick={() => {
                      setGameState('lobby')
                      setRoomCode('')
                      setBoard([])
                      setGameLog([])
                    }}>
                      🏠 Back to Lobby
                    </button>
                  </div>
                );
              })()}
            </div>
          </>
        )}
      </div >

    </>
  )
}