"use client"

import { ConnectButton } from "@rainbow-me/rainbowkit"
import Link from "next/link"

export default function HowToPlay() {
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

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(50px); }
          to { opacity: 1; transform: translateX(0); }
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        .page-container-howto {
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

        .page-container-howto::before {
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

        .page-container-howto::after {
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

        .wallet-button-howto {
          position: fixed;
          top: 2rem;
          right: 2rem;
          z-index: 1000;
          animation: slideInRight 0.6s ease-out;
        }

        .back-button-howto {
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
        }

        .back-button-howto:hover {
          border-color: #ff006e;
          color: #ff006e;
          box-shadow: 0 0 20px rgba(255, 0, 110, 0.4);
          transform: translateX(-5px);
        }

        .content-container {
          width: 100%;
          max-width: 1200px;
          z-index: 1;
        }

        .howto-header {
          text-align: center;
          margin-bottom: 3rem;
          animation: fadeIn 0.6s ease-out;
        }

        .howto-title {
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

        .howto-subtitle {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.7);
          max-width: 600px;
          margin: 0 auto;
        }

        .section {
          background: rgba(10, 14, 39, 0.6);
          border: 3px solid #00fff9;
          border-radius: 12px;
          padding: 2rem;
          margin-bottom: 2rem;
          backdrop-filter: blur(10px);
          animation: fadeIn 0.8s ease-out;
        }

        .section-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.8rem;
          color: #00fff9;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .section-content {
          font-size: 1.1rem;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.9);
        }

        .section-content p {
          margin-bottom: 1rem;
        }

        .section-content ul, .section-content ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }

        .section-content li {
          margin-bottom: 0.8rem;
        }

        .blocks-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
          margin-top: 1.5rem;
        }

        .block-card {
          background: rgba(5, 6, 20, 0.8);
          border: 2px solid;
          border-radius: 8px;
          padding: 1.5rem;
          transition: all 0.3s ease;
        }

        .block-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .block-card.start { border-color: #00fff9; }
        .block-card.build { border-color: #4CAF50; }
        .block-card.bonus { border-color: #2196F3; }
        .block-card.mystery { border-color: #9C27B0; }
        .block-card.steal { border-color: #F44336; }
        .block-card.governance { border-color: #FF9800; }
        .block-card.lucky { border-color: #ffbe0b; }
        .block-card.auction { border-color: #ff006e; }
        .block-card.danger { border-color: #ff6b35; }
        .block-card.hazard { border-color: #e63946; }
        .block-card.end { border-color: #8b0000; }

        .block-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .block-name {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.3rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
        }

        .block-card.start .block-name { color: #00fff9; }
        .block-card.build .block-name { color: #4CAF50; }
        .block-card.bonus .block-name { color: #2196F3; }
        .block-card.mystery .block-name { color: #9C27B0; }
        .block-card.steal .block-name { color: #F44336; }
        .block-card.governance .block-name { color: #FF9800; }
        .block-card.lucky .block-name { color: #ffbe0b; }
        .block-card.auction .block-name { color: #ff006e; }
        .block-card.danger .block-name { color: #ff6b35; }
        .block-card.hazard .block-name { color: #e63946; }
        .block-card.end .block-name { color: #8b0000; }

        .block-description {
          font-size: 0.95rem;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.6;
        }

        .highlight {
          color: #ffbe0b;
          font-weight: 700;
        }

        .highlight-green {
          color: #4CAF50;
          font-weight: 700;
        }

        .highlight-red {
          color: #ff006e;
          font-weight: 700;
        }

        .tip-box {
          background: rgba(255, 190, 11, 0.1);
          border: 2px solid #ffbe0b;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 1.5rem;
        }

        .warning-box {
          background: rgba(255, 0, 110, 0.1);
          border: 2px solid #ff006e;
          border-radius: 8px;
          padding: 1.5rem;
          margin-top: 1.5rem;
        }

        .tip-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.2rem;
          color: #ffbe0b;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .warning-title {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.2rem;
          color: #ff006e;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .tip-content {
          color: rgba(255, 255, 255, 0.9);
          line-height: 1.6;
        }

        .penalty-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 1rem;
        }

        .penalty-table th, .penalty-table td {
          padding: 0.8rem 1rem;
          text-align: left;
          border-bottom: 1px solid rgba(0, 255, 249, 0.2);
        }

        .penalty-table th {
          font-family: 'Orbitron', sans-serif;
          color: #00fff9;
          font-size: 0.9rem;
          text-transform: uppercase;
        }

        .penalty-table td {
          color: rgba(255, 255, 255, 0.85);
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
          .wallet-button-howto { top: 1rem; right: 1rem; }
          .back-button-howto { top: 1rem; left: 1rem; font-size: 0.9rem; padding: 0.6rem 1rem; }
          .howto-title { font-size: 2rem; }
          .section { padding: 1.5rem; }
          .blocks-grid { grid-template-columns: 1fr; }
        }
      `}}></style>

      <div className="page-container-howto">
        <Link href="/" className="back-button-howto">
          ← Back
        </Link>

        <div className="wallet-button-howto">
          <ConnectButton />
        </div>

        <div className="content-container">
          <div className="howto-header">
            <h1 className="howto-title">📚 How to Play</h1>
            <p className="howto-subtitle">
              Master the blockchain board game and dominate the leaderboard!
            </p>
          </div>

          {/* Game Overview */}
          <div className="section">
            <h2 className="section-title">🎮 Game Overview</h2>
            <div className="section-content">
              <p>
                <strong>Gen Blocks</strong> is a multiplayer blockchain board game where 2-4 players compete to be the first to reach <span className="highlight">100 XP</span>. Every action is recorded on the GenLayer blockchain — no cheating possible!
              </p>
              <p>
                Players take turns rolling a dice, moving around the board, and landing on different block types. Each block triggers a unique effect — some reward you with XP, some let you steal from others, and some can knock you out of the game entirely.
              </p>
            </div>
          </div>

          {/* Getting Started */}
          <div className="section">
            <h2 className="section-title">🚀 Getting Started</h2>
            <div className="section-content">
              <ol>
                <li><strong>Connect Your Wallet:</strong> Click the Connect button to link your wallet to the GenLayer network</li>
                <li><strong>Sign In:</strong> Sign a message to verify your identity</li>
                <li><strong>Create or Join a Room:</strong>
                  <ul>
                    <li><strong>Create</strong> — Enter a 4-8 character room code and share it with friends</li>
                    <li><strong>Join</strong> — Enter the code someone shared with you</li>
                  </ul>
                </li>
                <li><strong>Wait for Players:</strong> Games need 2-4 players. The room creator can start the game once 2+ players have joined (it auto-starts at 4)</li>
                <li><strong>Play!</strong> Take turns rolling the dice and interacting with blocks. First to <span className="highlight">100 XP</span> wins!</li>
              </ol>
            </div>
          </div>

          {/* Turn Flow */}
          <div className="section">
            <h2 className="section-title">🔄 Turn Flow</h2>
            <div className="section-content">
              <p>Each turn follows these steps:</p>
              <ol>
                <li><strong>Roll the Dice:</strong> Click the 🎲 Roll Dice button (only the active player can roll). The dice rolls a number between <span className="highlight">1 and 6</span></li>
                <li><strong>Move:</strong> Your piece moves forward by the dice result, wrapping around the board</li>
                <li><strong>Block Action:</strong> The block you land on triggers automatically. Some blocks (Steal, Build, Governance, Auction) need your input first</li>
                <li><strong>Finish Turn:</strong> After the block action resolves, a Turn Summary popup appears. Click <span className="highlight-green">Finish Turn</span> to pass to the next player</li>
              </ol>
              <div className="warning-box">
                <div className="warning-title">
                  <span>⚠️</span>
                  <span>Important</span>
                </div>
                <div className="tip-content">
                  Only the active player can roll the dice or click Finish Turn. Other players must wait — the button shows whose turn it is.
                </div>
              </div>
            </div>
          </div>

          {/* XP System */}
          <div className="section">
            <h2 className="section-title">⭐ XP System</h2>
            <div className="section-content">
              <ul>
                <li>Every player starts with <span className="highlight">10 XP</span></li>
                <li>Goal: Be the first player to reach <span className="highlight">100 XP</span></li>
                <li>Earn XP from Build, Bonus, Mystery, and Lucky blocks</li>
                <li>Lose XP from Danger, Hazard, End, and failed Steal attempts</li>
                <li>XP can go to <span className="highlight">0</span> but never negative</li>
              </ul>
            </div>
          </div>

          {/* Block Types - Reward */}
          <div className="section">
            <h2 className="section-title">🟢 Reward Blocks</h2>
            <div className="blocks-grid">
              <div className="block-card start">
                <div className="block-icon">🏁</div>
                <div className="block-name">Start Block</div>
                <div className="block-description">
                  The starting position for all players. Nothing happens when you land here — it's just home base.
                </div>
              </div>

              <div className="block-card build">
                <div className="block-icon">🏗️</div>
                <div className="block-name">Build Block</div>
                <div className="block-description">
                  <strong>Reward:</strong> <span className="highlight-green">+6 XP</span> (or <span className="highlight-green">+12 XP</span> with a 2x multiplier)<br />
                  <strong>Combo:</strong> Landing on Build blocks consecutively increases your combo counter. Reach a <span className="highlight">3-combo</span> to earn a 2x multiplier!
                </div>
              </div>

              <div className="block-card bonus">
                <div className="block-icon">🎁</div>
                <div className="block-name">Bonus Block</div>
                <div className="block-description">
                  <strong>Reward:</strong> Random — either <span className="highlight-green">+5 XP</span> or <span className="highlight-green">+1 Shield</span><br />
                  <strong>Note:</strong> Always positive! Great for steady progress.
                </div>
              </div>

              <div className="block-card mystery">
                <div className="block-icon">❓</div>
                <div className="block-name">Mystery Block</div>
                <div className="block-description">
                  <strong>Reward:</strong> 70% chance for <span className="highlight-green">+5 to +20 XP</span>, 30% chance for <span className="highlight-green">+1 Shield</span><br />
                  <strong>High Variance:</strong> Could be a huge XP boost!
                </div>
              </div>

              <div className="block-card lucky">
                <div className="block-icon">🍀</div>
                <div className="block-name">Lucky Block</div>
                <div className="block-description">
                  <strong>Possible outcomes:</strong><br />
                  • 25% — Nothing happens<br />
                  • 25% — <span className="highlight-green">+15 XP</span><br />
                  • 25% — <span className="highlight-green">+1 Shield</span><br />
                  • 25% — <span className="highlight-green">2x Multiplier</span> activated!
                </div>
              </div>
            </div>
          </div>

          {/* Block Types - Interactive */}
          <div className="section">
            <h2 className="section-title">🟡 Interactive Blocks</h2>
            <div className="blocks-grid">
              <div className="block-card steal">
                <div className="block-icon">🏴‍☠️</div>
                <div className="block-name">Steal Block</div>
                <div className="block-description">
                  <strong>Action:</strong> Pick another player to steal from.<br />
                  <strong>Target Decision:</strong> The target is notified and must choose to 🛡️ Use a Shield, 💰 Forfeit (pay a higher penalty but block the steal), or 🏳️ Allow the steal.<br />
                  <strong>Outcome:</strong> Success steals <span className="highlight-green">5 XP</span>.
                </div>
              </div>

              <div className="block-card governance">
                <div className="block-icon">🤖</div>
                <div className="block-name">AI Governance</div>
                <div className="block-description">
                  <strong>Action:</strong> Trigger an AI-driven global event.<br />
                  <strong>AI Deliberation:</strong> The GenLayer AI Agent proposes and immediately decides on a game-wide rule change (e.g., giving everyone shields, tax players, or awarding group XP).<br />
                  <strong>Note:</strong> No voting required — the AI's word is law!
                </div>
              </div>

              <div className="block-card auction">
                <div className="block-icon">🔨</div>
                <div className="block-name">Auction Block</div>
                <div className="block-description">
                  <strong>Action:</strong> Bid your XP to win a <span className="highlight">2x Multiplier</span>.<br />
                  <strong>Turn-Based Bidding:</strong> Players bid in sequence. If you pass once, you are out of that specific auction. Last bidder standing wins!
                </div>
              </div>
            </div>

            <div className="tip-box" style={{ marginTop: '1.5rem', borderLeft: '6px solid #00fff9' }}>
               <div className="tip-title">⚔️ Challenge Mechanic</div>
               <div className="tip-content">
                  When a player lands on a <strong>Build Block</strong>, they "propose" a contract. Other players see a <strong>Challenge Banner</strong>. If you challenge:
                  <ul>
                    <li><strong>AI Validation:</strong> The GenLayer AI Agent reviews the "code" build.</li>
                    <li><strong>Win:</strong> You get <span className="highlight-green">+3 XP</span> and break their build combo.</li>
                    <li><strong>Lose:</strong> You lose <span className="highlight-red">3 XP</span> and the builder gets <span className="highlight-green">+7 XP</span> bonus!</li>
                  </ul>
               </div>
            </div>
          </div>

          {/* Block Types - Penalties */}
          <div className="section">
            <h2 className="section-title">🔴 Penalty Blocks</h2>
            <div className="blocks-grid">
              <div className="block-card danger">
                <div className="block-icon">⚠️</div>
                <div className="block-name">Danger Block</div>
                <div className="block-description">
                  <strong>Penalty:</strong> <span className="highlight-red">-2 XP</span><br />
                  Small setback. Watch your step!
                </div>
              </div>

              <div className="block-card hazard">
                <div className="block-icon">☠️</div>
                <div className="block-name">Hazard Block</div>
                <div className="block-description">
                  <strong>Penalty:</strong> <span className="highlight-red">-5 XP</span><br />
                  A serious hit. Can set you back significantly.
                </div>
              </div>

              <div className="block-card end">
                <div className="block-icon">💀</div>
                <div className="block-name">End Block</div>
                <div className="block-description">
                  <strong>Penalty:</strong> <span className="highlight-red">-5 XP AND elimination!</span><br />
                  The worst block. You lose 5 XP and are eliminated from the game entirely.
                </div>
              </div>
            </div>

            <div className="warning-box">
              <div className="warning-title">
                <span>💀</span>
                <span>Elimination Warning</span>
              </div>
              <div className="tip-content">
                Players are eliminated if they land on an <strong>End Block</strong> OR if their XP drops to <strong>0</strong>. Eliminated players are removed from the board and cannot win.
              </div>
            </div>
          </div>

          {/* Battle Collision */}
          <div className="section">
            <h2 className="section-title">⚔️ Battle Collisions</h2>
            <div className="section-content">
              <p>
                When you land on the <strong>same block as another player</strong>, a Battle Collision triggers automatically!
              </p>
              <ul>
                <li>You steal <span className="highlight-green">1 XP</span> from each player already on that block.</li>
                <li>Shields do <strong>not</strong> protect against battle collisions.</li>
                <li>Strategic Tip: Landing on a "crowded" block is a great way to boost XP.</li>
              </ul>
            </div>
          </div>

          {/* Winning */}
          <div className="section">
            <h2 className="section-title">🏆 Winning & Leaderboards</h2>
            <div className="section-content">
              <p>
                The game ends when any player reaches <span className="highlight">100 XP</span>. That player wins and their victory is recorded on-chain!
              </p>
              <p>
                The game also ends if <strong>only one player remains</strong> (all others eliminated). This "Last Player Standing" wins immediately regardless of their current XP!
              </p>
            </div>
          </div>

          {/* Quitting */}
          <div className="section">
            <h2 className="section-title">🚪 Leaving a Room</h2>
            <div className="section-content">
              <p>
                You can leave a room using the <strong>Quit Room</strong> button in the lobby or <strong>Quit Game</strong> during play.
              </p>
              <ul>
                <li>If you leave while a game is active, you are automatically <strong>eliminated</strong>.</li>
                <li>The game will automatically adjust the turn order to skip eliminated players.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}