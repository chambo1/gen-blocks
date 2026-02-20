"use client"

import { useEffect, useState } from 'react'
import { readGenLayerContract } from '@/lib/genlayer-client'

interface TurnTimerProps {
    roomCode: string
    isMyTurn: boolean
    onTimeExpired: () => void
}

export function TurnTimer({ roomCode, isMyTurn, onTimeExpired }: TurnTimerProps) {
    const [timeRemaining, setTimeRemaining] = useState(30)
    const [isExpired, setIsExpired] = useState(false)

    useEffect(() => {
        if (!roomCode) return

        const fetchTimeRemaining = async () => {
            try {
                const remaining = await readGenLayerContract('get_turn_time_remaining', [roomCode])
                const remainingNum = parseInt(remaining || '30')
                setTimeRemaining(remainingNum)

                if (remainingNum <= 0 && !isExpired) {
                    setIsExpired(true)
                    onTimeExpired()
                }
            } catch (error) {
                console.error('Failed to fetch time remaining:', error)
            }
        }

        // Poll every second
        fetchTimeRemaining()
        const interval = setInterval(fetchTimeRemaining, 1000)

        return () => clearInterval(interval)
    }, [roomCode, isExpired, onTimeExpired])

    const getTimerColor = () => {
        if (timeRemaining <= 5) return '#F44336' // Red
        if (timeRemaining <= 10) return '#FF9800' // Orange
        return '#00fff9' // Cyan
    }

    const getProgressPercentage = () => {
        return (timeRemaining / 30) * 100
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <>
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes timerPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        @keyframes timerWarning {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        .turn-timer-container {
          position: relative;
          width: 100%;
          max-width: 300px;
          margin: 0 auto;
        }

        .timer-label {
          font-family: 'Orbitron', sans-serif;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
          text-align: center;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .timer-display {
          font-family: 'Orbitron', sans-serif;
          font-size: 2.5rem;
          font-weight: 900;
          text-align: center;
          margin-bottom: 0.8rem;
          transition: color 0.3s ease;
        }

        .timer-display.warning {
          animation: timerWarning 1s ease-in-out infinite;
        }

        .timer-display.critical {
          animation: timerPulse 0.5s ease-in-out infinite;
        }

        .timer-progress-bar {
          width: 100%;
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
          position: relative;
        }

        .timer-progress-fill {
          height: 100%;
          transition: width 1s linear, background-color 0.3s ease;
          border-radius: 4px;
        }

        .timer-status {
          font-family: 'Space Mono', monospace;
          font-size: 0.85rem;
          text-align: center;
          margin-top: 0.5rem;
          color: rgba(255, 255, 255, 0.6);
        }
      `}}></style>

            <div className="turn-timer-container">
                <div className="timer-label">
                    {isMyTurn ? '⏱️ Your Turn' : '⌛ Waiting...'}
                </div>
                <div
                    className={`timer-display ${timeRemaining <= 10 ? 'warning' : ''} ${timeRemaining <= 5 ? 'critical' : ''}`}
                    style={{ color: getTimerColor() }}
                >
                    {formatTime(timeRemaining)}
                </div>
                <div className="timer-progress-bar">
                    <div
                        className="timer-progress-fill"
                        style={{
                            width: `${getProgressPercentage()}%`,
                            backgroundColor: getTimerColor()
                        }}
                    />
                </div>
                {timeRemaining <= 10 && isMyTurn && (
                    <div className="timer-status" style={{ color: getTimerColor() }}>
                        {timeRemaining <= 5 ? '⚠️ Time almost up!' : '⏰ Hurry up!'}
                    </div>
                )}
            </div>
        </>
    )
}
