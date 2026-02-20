"use client"

interface PlayerInfo {
  address: string
  position: number
  xp: number
  shields: number
  isCurrentTurn: boolean
  isEliminated: boolean
  lastDiceRoll: number
  globalIndex: number
}

interface PlayersDisplayProps {
  players: PlayerInfo[]
  currentPlayerAddress: string | undefined
  boardLength: number
}

export function PlayersDisplay({ players, currentPlayerAddress, boardLength }: PlayersDisplayProps) {
  const formatAddress = (addr: string) => {
    if (!addr) return ''
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getPlayerColor = (index: number) => {
    const colors = ['#00fff9', '#ff006e', '#ffbe0b', '#4CAF50']
    return colors[index % colors.length]
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes playerPulse {
          0%, 100% { transform: scale(1); box-shadow: 0 0 10px currentColor; }
          50% { transform: scale(1.05); box-shadow: 0 0 20px currentColor; }
        }

        .players-container {
          background: rgba(10, 14, 39, 0.6);
          border: 2px solid rgba(0, 255, 249, 0.3);
          border-radius: 12px;
          padding: 1.5rem;
          backdrop-filter: blur(10px);
        }

        .players-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.2rem;
          color: #00fff9;
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          text-align: center;
        }

        .players-list {
          display: flex;
          flex-direction: column;
          gap: 0.8rem;
        }

        .player-card {
          background: rgba(5, 6, 20, 0.8);
          border: 2px solid;
          border-radius: 8px;
          padding: 1rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: all 0.3s ease;
        }

        .player-card.active {
          animation: playerPulse 2s ease-in-out infinite;
        }

        .player-card.you {
          background: rgba(255, 190, 11, 0.1);
        }

        .player-card.eliminated {
          opacity: 0.5;
          filter: grayscale(1);
          background: rgba(255, 0, 0, 0.1);
          border-color: #ff0000 !important;
        }

        .player-info {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .player-address {
          font-family: 'Space Mono', monospace;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .player-stats {
          font-family: 'Space Mono', monospace;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.7);
          display: flex;
          gap: 1rem;
        }

        .player-position-indicator {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          padding: 0.5rem;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid;
        }

        .turn-badge {
          background: #00fff9;
          color: #050614;
          font-family: 'Orbitron', sans-serif;
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.5rem;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        @media (max-width: 768px) {
          .players-container {
            padding: 1rem;
          }
          .player-stats {
            flex-direction: column;
            gap: 0.2rem;
          }
        }
      `}}></style>

      <div className="players-container">
        <div className="players-title">👥 Players</div>
        <div className="players-list">
          {players.map((player, index) => (
            <div
              key={player.address}
              className={`player-card ${player.isCurrentTurn ? 'active' : ''} ${player.address.toLowerCase() === currentPlayerAddress?.toLowerCase() ? 'you' : ''} ${player.isEliminated ? 'eliminated' : ''}`}
              style={{ borderColor: getPlayerColor(player.globalIndex) }}
            >
              <div className="player-info">
                <div className="player-address" style={{ color: getPlayerColor(player.globalIndex) }}>
                  {player.address.toLowerCase() === currentPlayerAddress?.toLowerCase() ? '👤 You' : formatAddress(player.address)}
                  {player.isCurrentTurn && !player.isEliminated && <span className="turn-badge" style={{ marginLeft: '0.5rem' }}>TURN</span>}
                  {player.isEliminated && <span className="turn-badge" style={{ marginLeft: '0.5rem', background: '#ff0000', color: '#fff' }}>ELIMINATED</span>}
                </div>
                <div className="player-stats">
                  <span>⭐ {player.xp} XP</span>
                  <span>🛡️ {player.shields} Shields</span>
                  {player.lastDiceRoll > 0 && <span>🎲 Last: {player.lastDiceRoll}</span>}
                </div>
              </div>
              <div
                className="player-position-indicator"
                style={{ borderColor: getPlayerColor(player.globalIndex), color: getPlayerColor(player.globalIndex) }}
              >
                {player.position}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
