"use client"

import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAccount, useChainId, useSwitchChain, useSignMessage, useDisconnect } from "wagmi"
import { useEffect, useRef, useState } from "react"
import Link from "next/link"

export default function Home() {
  const { isConnected, address } = useAccount()
  const chainId = useChainId()
  const { switchChain } = useSwitchChain()
  const { signMessage } = useSignMessage()
  const { disconnect } = useDisconnect()

  const [isWrongNetwork, setIsWrongNetwork] = useState(false)
  const [isSigned, setIsSigned] = useState(false)
  const [showSignPrompt, setShowSignPrompt] = useState(false)
  const hasSwitched = useRef(false)

  const GENLAYER_ID = 61999

  // Handle network switching
  useEffect(() => {
    if (!isConnected) {
      hasSwitched.current = false
      setIsWrongNetwork(false)
      setShowSignPrompt(false)
      setIsSigned(false)
      return
    }

    if (chainId && chainId !== GENLAYER_ID && switchChain && !hasSwitched.current) {
      hasSwitched.current = true

      setTimeout(() => {
        try {
          switchChain(
            { chainId: GENLAYER_ID },
            {
              onError: () => {
                setIsWrongNetwork(true)
                setShowSignPrompt(false)
              },
              onSuccess: () => {
                setIsWrongNetwork(false)
                // Check if already signed
                const signedAddress = localStorage.getItem('genblocks_signed_address')
                if (signedAddress === address) {
                  setIsSigned(true)
                } else {
                  setShowSignPrompt(true)
                }
              }
            }
          )
        } catch (err) {
          console.error("Failed to switch chain:", err)
          setIsWrongNetwork(true)
          setShowSignPrompt(false)
        }
      }, 800)
    } else if (chainId && chainId !== GENLAYER_ID) {
      setIsWrongNetwork(true)
      setShowSignPrompt(false)
    } else if (chainId === GENLAYER_ID) {
      setIsWrongNetwork(false)
      // Check if already signed
      const signedAddress = localStorage.getItem('genblocks_signed_address')
      if (signedAddress === address) {
        setIsSigned(true)
      } else {
        setShowSignPrompt(true)
      }
    }
  }, [isConnected, chainId, switchChain, address])

  const handleSign = () => {
    if (!address) return

    const message = `Welcome to Gen Blocks!\n\nSign this message to verify your wallet ownership and start playing.\n\nWallet: ${address}\nTimestamp: ${Date.now()}`

    signMessage(
      { message },
      {
        onSuccess: () => {
          setIsSigned(true)
          setShowSignPrompt(false)
          localStorage.setItem('genblocks_signed_address', address)
        },
        onError: () => {
          console.log("User declined signing")
          setShowSignPrompt(true)
        }
      }
    )
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

        @keyframes titleGlow {
          0%, 100% { filter: brightness(1) drop-shadow(0 0 20px rgba(0, 255, 249, 0.4)); }
          50% { filter: brightness(1.2) drop-shadow(0 0 40px rgba(255, 0, 110, 0.6)); }
        }

        @keyframes titleFloat {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes menuFadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes statusBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        @keyframes scanline {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }

        @keyframes popupFadeIn {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }

        .page-container-genblocks {
          min-height: 100vh;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          background: 
            linear-gradient(180deg, #050614 0%, #0a0e27 50%, #050614 100%),
            repeating-linear-gradient(90deg, transparent 0px, transparent 99px, rgba(0, 255, 249, 0.1) 100px),
            repeating-linear-gradient(0deg, transparent 0px, transparent 99px, rgba(0, 255, 249, 0.1) 100px);
          background-size: 100% 100%, 100px 100px, 100px 100px;
          animation: gridFloat 20s ease-in-out infinite;
        }

        .page-container-genblocks::before {
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

        .page-container-genblocks::after {
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

        .wallet-button-genblocks {
          position: fixed;
          top: 2rem;
          right: 2rem;
          z-index: 1000;
          animation: slideInRight 0.6s ease-out;
        }

        .wrong-network-indicator {
          position: fixed;
          top: 6rem;
          right: 2rem;
          z-index: 999;
          font-family: 'Space Mono', monospace;
          font-size: 0.9rem;
          color: #ff006e;
          background: rgba(255, 0, 110, 0.2);
          border: 2px solid #ff006e;
          padding: 0.8rem 1.2rem;
          border-radius: 8px;
          animation: pulse 2s ease-in-out infinite;
        }

        .sign-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          z-index: 2000;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sign-popup {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(10, 14, 39, 0.95);
          border: 3px solid #00fff9;
          border-radius: 12px;
          padding: 3rem 2.5rem;
          z-index: 2001;
          min-width: 400px;
          max-width: 90%;
          text-align: center;
          backdrop-filter: blur(20px);
          box-shadow: 0 0 60px rgba(0, 255, 249, 0.4);
          animation: popupFadeIn 0.4s ease-out;
        }

        .sign-popup h2 {
          font-family: 'Orbitron', sans-serif;
          font-size: 2rem;
          font-weight: 900;
          color: #00fff9;
          margin-bottom: 1.5rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .sign-popup p {
          font-family: 'Space Mono', monospace;
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 2rem;
          line-height: 1.6;
        }

        .sign-button {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.2rem;
          font-weight: 700;
          padding: 1rem 3rem;
          background: rgba(10, 14, 39, 0.8);
          border: 3px solid #00fff9;
          color: #00fff9;
          cursor: pointer;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          backdrop-filter: blur(10px);
          border-radius: 8px;
        }

        .sign-button:hover {
          background: #00fff9;
          color: #050614;
          box-shadow: 0 0 30px rgba(0, 255, 249, 0.6);
          transform: scale(1.05);
        }

        .sign-button:active {
          transform: scale(0.98);
        }

        .title-genblocks {
          font-family: 'Orbitron', sans-serif;
          font-size: clamp(4rem, 12vw, 8rem);
          font-weight: 900;
          text-align: center;
          margin-bottom: 3rem;
          position: relative;
          z-index: 1;
          background: linear-gradient(135deg, #00fff9 0%, #ff006e 50%, #ffbe0b 100%);
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: titleGlow 3s ease-in-out infinite, titleFloat 0.8s ease-out;
          letter-spacing: 0.1em;
        }

        .game-menu-genblocks {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
          margin-bottom: 3rem;
          z-index: 1;
          animation: menuFadeIn 1s ease-out 0.3s both;
        }

        .menu-button-genblocks {
          font-family: 'Orbitron', sans-serif;
          font-size: 1.5rem;
          font-weight: 700;
          padding: 1.5rem 4rem;
          background: rgba(10, 14, 39, 0.8);
          border: 3px solid #00fff9;
          color: #00fff9;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
          text-transform: uppercase;
          letter-spacing: 0.15em;
          backdrop-filter: blur(10px);
          text-decoration: none;
          display: inline-block;
          text-align: center;
        }

        .menu-button-genblocks.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }

        .menu-button-genblocks::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(0, 255, 249, 0.3), transparent);
          transition: left 0.5s ease;
        }

        .menu-button-genblocks:hover::before {
          left: 100%;
        }

        .menu-button-genblocks:hover {
          transform: translateX(10px) scale(1.05);
          border-color: #ff006e;
          color: #ff006e;
          box-shadow: 0 0 30px rgba(255, 0, 110, 0.4), inset 0 0 20px rgba(255, 0, 110, 0.1);
        }

        .menu-button-genblocks:active {
          transform: translateX(10px) scale(0.98);
        }

        .play-game-genblocks {
          border-color: #00fff9;
          box-shadow: 0 0 20px rgba(0, 255, 249, 0.3);
        }

        .leaderboard-genblocks {
          border-color: #ffbe0b;
          color: #ffbe0b;
        }

        .leaderboard-genblocks:hover {
          border-color: #00fff9;
          color: #00fff9;
        }

        .how-to-play-genblocks {
          border-color: #ff006e;
          color: #ff006e;
        }

        .how-to-play-genblocks:hover {
          border-color: #ffbe0b;
          color: #ffbe0b;
        }

        .network-status-genblocks {
          font-family: 'Space Mono', monospace;
          font-size: 0.9rem;
          color: #00fff9;
          text-align: center;
          padding: 1rem 2rem;
          background: rgba(0, 255, 249, 0.05);
          border: 1px solid rgba(0, 255, 249, 0.3);
          border-radius: 8px;
          z-index: 1;
          animation: statusBlink 2s ease-in-out infinite, menuFadeIn 1s ease-out 0.5s both;
          letter-spacing: 0.1em;
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
          .wallet-button-genblocks { top: 1rem; right: 1rem; }
          .wrong-network-indicator { top: 5rem; right: 1rem; font-size: 0.8rem; padding: 0.6rem 1rem; }
          .sign-popup { min-width: 90%; padding: 2rem 1.5rem; }
          .sign-popup h2 { font-size: 1.5rem; }
          .sign-popup p { font-size: 0.9rem; }
          .sign-button { font-size: 1rem; padding: 0.8rem 2rem; }
          .title-genblocks { font-size: 3rem; margin-bottom: 2rem; }
          .menu-button-genblocks { font-size: 1.2rem; padding: 1.2rem 2.5rem; }
          .page-container-genblocks { padding: 1rem; }
        }
      `}}></style>

      <div className="page-container-genblocks">
        <div className="wallet-button-genblocks">
          <ConnectButton />
        </div>

        {isConnected && isWrongNetwork && (
          <div className="wrong-network-indicator">
            ⚠️ Wrong Network
          </div>
        )}

        {showSignPrompt && !isSigned && (
          <>
            <div className="sign-popup-overlay" onClick={() => { }} />
            <div className="sign-popup">
              <h2>🎮 Sign In</h2>
              <p>Please sign in to play Gen Blocks and verify your wallet ownership.</p>
              <button className="sign-button" onClick={handleSign}>
                Sign In
              </button>
            </div>
          </>
        )}

        <h1 className="title-genblocks">Gen Blocks</h1>

        <div className="game-menu-genblocks">
          <Link
            href="/playgame"
            className={`menu-button-genblocks play-game-genblocks ${(!isConnected || isWrongNetwork || !isSigned) ? 'disabled' : ''}`}
          >
            🎮 Play Game
          </Link>
          <Link href="/leaderboard" className="menu-button-genblocks leaderboard-genblocks">
            🏆 Leaderboard
          </Link>
          <Link href="/how-to-play" className="menu-button-genblocks how-to-play-genblocks">
            ❓ How To Play
          </Link>
        </div>

        <p className="network-status-genblocks">Connected Network ID: {chainId ?? "Not connected"}</p>
      </div>
    </>
  )
}