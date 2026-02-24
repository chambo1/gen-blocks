"use client"

import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount } from "wagmi"
import { useEffect, useState } from "react"
import Link from "next/link"
import { readGenLayerContract } from '@/lib/genlayer-client'

interface PlayerStats {
  address: string
  totalXP: number
  gamesPlayed: number
  gamesWon: number
  winRate: number
}

type LeaderboardPeriod = 'daily' | 'weekly' | 'alltime'

export default function Leaderboard() {
  const { address } = useAccount()
  const [period, setPeriod] = useState<LeaderboardPeriod>('alltime')
  const [leaderboard, setLeaderboard] = useState<PlayerStats[]>([])
  const [loading, setLoading] = useState(true)
  const [myStats, setMyStats] = useState<PlayerStats | null>(null)

  // Fetch leaderboard data from contract
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true)
      try {
        const periodParam = period === 'daily' ? 'daily' :
          period === 'weekly' ? 'weekly' : 'alltime'

        const data = await readGenLayerContract('get_leaderboard', [periodParam])

        if (data && typeof data === 'string' && data.trim() !== '') {
          // Format: addr:xp:games:wins|addr:xp:games:wins|...
          const entries = data.split('|').filter((e: string) => e.trim() !== '')
          const players: PlayerStats[] = entries.map((entry: string) => {
            const [addr, xp, games, wins] = entry.split(':')
            const gamesNum = parseInt(games) || 0
            const winsNum = parseInt(wins) || 0
            return {
              address: addr,
              totalXP: parseInt(xp) || 0,
              gamesPlayed: gamesNum,
              gamesWon: winsNum,
              winRate: gamesNum > 0 ? (winsNum / gamesNum) * 100 : 0
            }
          })

          // Sort by total XP descending
          players.sort((a, b) => b.totalXP - a.totalXP)
          setLeaderboard(players)

          // Find current user's stats
          if (address) {
            const me = players.find(p => p.address.toLowerCase() === address.toLowerCase())
            setMyStats(me || null)
          }
        } else {
          setLeaderboard([])
          setMyStats(null)
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error)
        setLeaderboard([])
      }
      setLoading(false)
    }

    fetchLeaderboard()
  }, [period, address])

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
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

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes shimmer {
          0% { background-position: -1000px 0; }
          100% { background-position: 1000px 0; }
        }

        .page-container-leaderboard {
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

        .page-container-leaderboard::before {
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

        .page-container-leaderboard::after {
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

        .wallet-button-leaderboard {
          position: fixed;
          top: 2rem;
          right: 2rem;
          z-index: 1000;
          animation: slideInRight 0.6s ease-out;
        }

        .back-button-leaderboard {
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

        .back-button-leaderboard:hover {
          border-color: #ff006e;
          color: #ff006e;
          box-shadow: 0 0 20px rgba(255, 0, 110, 0.4);
          transform: translateX(-5px);
        }

        .leaderboard-header {
          text-align: center;
          margin-bottom: 2rem;
          z-index: 1;
          animation: fadeIn 0.6s ease-out;
        }

        .leaderboard-title {
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

        .period-tabs {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-bottom: 2rem;
          z-index: 1;
        }

        .period-tab {
          font-family: 'Orbitron', sans-serif;
          font-size: 1rem;
          font-weight: 700;
          padding: 0.8rem 2rem;
          background: rgba(10, 14, 39, 0.6);
          border: 2px solid rgba(0, 255, 249, 0.3);
          color: rgba(0, 255, 249, 0.6);
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          backdrop-filter: blur(10px);
        }

        .period-tab.active {
          border-color: #00fff9;
          color: #00fff9;
          background: rgba(0, 255, 249, 0.1);
          box-shadow: 0 0 20px rgba(0, 255, 249, 0.3);
        }

        .period-tab:hover:not(.active) {
          border-color: #ff006e;
          color: #ff006e;
        }

        .leaderboard-container {
          width: 100%;
          max-width: 1000px;
          z-index: 1;
          animation: fadeIn 0.8s ease-out 0.2s both;
        }

        .my-stats-card {
          background: rgba(255, 190, 11, 0.1);
          border: 3px solid #ffbe0b;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          backdrop-filter: blur(10px);
        }

        .my-stats-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.2rem;
          color: #ffbe0b;
          margin-bottom: 1rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .stat-box {
          text-align: center;
        }

        .stat-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 0.3rem;
        }

        .stat-value {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.5rem;
          color: #ffbe0b;
          font-weight: 700;
        }

        .leaderboard-table {
          background: rgba(10, 14, 39, 0.6);
          border: 3px solid #00fff9;
          border-radius: 12px;
          overflow: hidden;
          backdrop-filter: blur(10px);
        }

        .table-header {
          display: grid;
          grid-template-columns: 80px 1fr 120px 120px 120px;
          padding: 1rem;
          background: rgba(0, 255, 249, 0.1);
          border-bottom: 2px solid rgba(0, 255, 249, 0.3);
          font-family: 'Orbitron', sans-serif;
          font-size: 0.9rem;
          color: #00fff9;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .table-row {
          display: grid;
          grid-template-columns: 80px 1fr 120px 120px 120px;
          padding: 1rem;
          border-bottom: 1px solid rgba(0, 255, 249, 0.1);
          transition: all 0.3s ease;
          align-items: center;
        }

        .table-row:hover {
          background: rgba(0, 255, 249, 0.05);
        }

        .table-row.highlight {
          background: rgba(255, 190, 11, 0.1);
          border: 2px solid #ffbe0b;
          border-left: none;
          border-right: none;
        }

        .rank {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.5rem;
          font-weight: 900;
          text-align: center;
        }

        .rank.top3 {
          font-size: 2rem;
        }

        .player-address {
          font-family: 'Space Mono', monospace;
          color: #00fff9;
        }

        .stat-cell {
          text-align: center;
          font-family: 'Space Mono', monospace;
          color: rgba(255, 255, 255, 0.8);
        }

        .win-rate {
          color: #ffbe0b;
          font-weight: 700;
        }

        .loading-spinner {
          text-align: center;
          padding: 3rem;
          font-family: 'Orbitron', sans-serif;
          font-size: 1.2rem;
          color: #00fff9;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .empty-state-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .empty-state-text {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.2rem;
          color: #00fff9;
          margin-bottom: 0.5rem;
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
          .wallet-button-leaderboard { top: 1rem; right: 1rem; }
          .back-button-leaderboard { top: 1rem; left: 1rem; font-size: 0.9rem; padding: 0.6rem 1rem; }
          .leaderboard-title { font-size: 2rem; }
          .period-tabs { flex-direction: column; }
          .table-header, .table-row {
            grid-template-columns: 60px 1fr 80px;
          }
          .table-header :nth-child(4), .table-header :nth-child(5),
          .table-row :nth-child(4), .table-row :nth-child(5) {
            display: none;
          }
          .stats-grid { grid-template-columns: 1fr 1fr; }
        }
      `}}></style>

      <div className="page-container-leaderboard">
        <Link href="/" className="back-button-leaderboard">
          ← Back
        </Link>

        <div className="wallet-button-leaderboard">
          <ConnectButton />
        </div>

        <div className="leaderboard-header">
          <h1 className="leaderboard-title">🏆 Leaderboard</h1>
        </div>

        <div className="period-tabs">
          <button
            className={`period-tab ${period === 'daily' ? 'active' : ''}`}
            onClick={() => setPeriod('daily')}
          >
            📅 Daily
          </button>
          <button
            className={`period-tab ${period === 'weekly' ? 'active' : ''}`}
            onClick={() => setPeriod('weekly')}
          >
            📊 Weekly
          </button>
          <button
            className={`period-tab ${period === 'alltime' ? 'active' : ''}`}
            onClick={() => setPeriod('alltime')}
          >
            ⭐ All Time
          </button>
        </div>

        <div className="leaderboard-container">
          {myStats && (
            <div className="my-stats-card">
              <div className="my-stats-title">Your Stats</div>
              <div className="stats-grid">
                <div className="stat-box">
                  <div className="stat-label">Total XP</div>
                  <div className="stat-value">{myStats.totalXP}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Games Played</div>
                  <div className="stat-value">{myStats.gamesPlayed}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Games Won</div>
                  <div className="stat-value">{myStats.gamesWon}</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Win Rate</div>
                  <div className="stat-value">{myStats.winRate.toFixed(1)}%</div>
                </div>
              </div>
            </div>
          )}

          <div className="leaderboard-table">
            <div className="table-header">
              <div>Rank</div>
              <div>Player</div>
              <div>Total XP</div>
              <div>Games</div>
              <div>Win Rate</div>
            </div>

            {loading ? (
              <div className="loading-spinner">
                Loading leaderboard...
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🎮</div>
                <div className="empty-state-text">No data yet</div>
                <p>Play some games to appear on the leaderboard!</p>
              </div>
            ) : (
              leaderboard.map((player, index) => (
                <div
                  key={player.address}
                  className={`table-row ${player.address === address ? 'highlight' : ''}`}
                >
                  <div className={`rank ${index < 3 ? 'top3' : ''}`}>
                    {getRankEmoji(index + 1)}
                  </div>
                  <div className="player-address">
                    {player.address === address ? 'You' : formatAddress(player.address)}
                  </div>
                  <div className="stat-cell">{player.totalXP}</div>
                  <div className="stat-cell">{player.gamesPlayed}</div>
                  <div className="stat-cell win-rate">{player.winRate.toFixed(1)}%</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </>
  )
}
