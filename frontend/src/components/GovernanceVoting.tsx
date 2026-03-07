"use client"

import { useState } from 'react'
import { useAccount } from 'wagmi'
import { writeGenLayerContract } from '@/lib/genlayer-client'
import { sounds } from '@/lib/sounds'

interface GovernanceVotingProps {
  roomCode: string
  proposal: string // Format: "proposal_type:description|yes_votes|no_votes"
  onVoteComplete: () => void
  onClose: () => void
}

export function GovernanceVoting({ roomCode, proposal, onVoteComplete, onClose }: GovernanceVotingProps) {
  const { address } = useAccount()
  const [voting, setVoting] = useState(false)
  const [voted, setVoted] = useState(false)

  if (!proposal || proposal === 'none') {
    return null
  }

  const parts = proposal.split('|')
  const [typeAndDesc, yesVotes, noVotes] = parts
  const [proposalType, description] = typeAndDesc.split(':')

  const handleVote = async (voteYes: boolean) => {
    setVoting(true)
    sounds.playClick()
    try {
      if (!address) throw new Error('Wallet not connected')
      await writeGenLayerContract('vote_on_proposal', [roomCode, voteYes], address)
      setVoted(true)
      setTimeout(() => {
        onVoteComplete()
        onClose()
      }, 2000)
    } catch (error: any) {
      console.error('Vote failed:', error)
      alert(`Vote failed: ${error.message || 'Unknown error'}`)
    } finally {
      setVoting(false)
    }
  }

  const getProposalIcon = () => {
    switch (proposalType) {
      case 'double_xp': return '⚡'
      case 'extra_turn': return '🔄'
      case 'shield_all': return '🛡️'
      default: return '📜'
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
        .governance-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          backdrop-filter: blur(5px);
        }

        .governance-modal {
          background: linear-gradient(135deg, rgba(10, 14, 39, 0.95) 0%, rgba(5, 6, 20, 0.95) 100%);
          border: 3px solid #FF9800;
          border-radius: 16px;
          padding: 2rem;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 0 50px rgba(255, 152, 0, 0.3);
        }

        .governance-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .governance-icon {
          font-size: 4rem;
          margin-bottom: 0.5rem;
        }

        .governance-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.5rem;
          color: #FF9800;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .governance-description {
          font-size: 1.1rem;
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
        }

        .vote-stats {
          display: flex;
          justify-content: space-around;
          margin: 1.5rem 0;
          padding: 1rem;
          background: rgba(255, 152, 0, 0.1);
          border-radius: 8px;
        }

        .vote-stat {
          text-align: center;
        }

        .vote-label {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.6);
          margin-bottom: 0.3rem;
        }

        .vote-count {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
        }

        .vote-count.yes { color: #4CAF50; }
        .vote-count.no { color: #F44336; }

        .vote-buttons {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
        }

        .vote-button {
          flex: 1;
          font-family: 'Orbitron', sans-serif;
          font-size: 1.1rem;
          font-weight: 700;
          padding: 1rem;
          border: 2px solid;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .vote-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .vote-button.yes {
          background: rgba(76, 175, 80, 0.2);
          border-color: #4CAF50;
          color: #4CAF50;
        }

        .vote-button.yes:hover:not(:disabled) {
          background: rgba(76, 175, 80, 0.3);
          box-shadow: 0 0 20px rgba(76, 175, 80, 0.4);
        }

        .vote-button.no {
          background: rgba(244, 67, 54, 0.2);
          border-color: #F44336;
          color: #F44336;
        }

        .vote-button.no:hover:not(:disabled) {
          background: rgba(244, 67, 54, 0.3);
          box-shadow: 0 0 20px rgba(244, 67, 54, 0.4);
        }

        .vote-success {
          text-align: center;
          padding: 2rem;
        }

        .vote-success-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .vote-success-text {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.3rem;
          color: #4CAF50;
        }

        .vote-reward {
          font-size: 1rem;
          color: #ffbe0b;
          margin-top: 0.5rem;
        }
      `}}></style>

      <div className="governance-overlay" onClick={onClose}>
        <div className="governance-modal" onClick={(e) => e.stopPropagation()}>
          {voted ? (
            <div className="vote-success">
              <div className="vote-success-icon">✅</div>
              <div className="vote-success-text">Vote Recorded!</div>
              <div className="vote-reward">+2 XP Earned</div>
            </div>
          ) : (
            <>
              <div className="governance-header">
                <div className="governance-icon">{getProposalIcon()}</div>
                <div className="governance-title">Governance Proposal</div>
                <div className="governance-description">{description}</div>
              </div>

              <div className="vote-stats">
                <div className="vote-stat">
                  <div className="vote-label">Yes Votes</div>
                  <div className="vote-count yes">👍 {yesVotes || 0}</div>
                </div>
                <div className="vote-stat">
                  <div className="vote-label">No Votes</div>
                  <div className="vote-count no">👎 {noVotes || 0}</div>
                </div>
              </div>

              <div className="vote-buttons">
                <button
                  className="vote-button yes"
                  onClick={() => handleVote(true)}
                  disabled={voting}
                >
                  {voting ? 'Voting...' : '✅ Vote Yes'}
                </button>
                <button
                  className="vote-button no"
                  onClick={() => handleVote(false)}
                  disabled={voting}
                >
                  {voting ? 'Voting...' : '❌ Vote No'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
