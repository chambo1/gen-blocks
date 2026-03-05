# 🎲 Gen Blocks: The Board Game

**Gen Blocks** is a high-stakes, multiplayer blockchain board game built exclusively for the **GenLayer Testnet Builders Program**. It transforms the traditional "Roll and Move" genre into a living demonstration of **Intelligent Contracts** and **Optimistic Democracy**.

![Gen Blocks Header](https://raw.githubusercontent.com/chambo1/gen-blocks/main/frontend/public/banner.png)

## 🌟 The "Intelligent" Core
Unlike traditional games where logic is hard-coded (e.g., "If land on block, gain 10 gold"), Gen Blocks introduces **On-Chain Subjectivity** via the **AI Governance Council**.

### ⚖️ Optimistic Democracy in Action
When a player lands on a **Governance Block**, the contract doesn't follow a fixed script. Instead, it invokes three specialized AI Agents to deliberate on the game state:
- **Auditor Alpha**: Prefers balance and punishing over-extending leaders.
- **Chaos Bot**: Aims to disrupt the status quo and keep the game unpredictable.
- **Unity**: Focuses on group rewards and helping trailing players catch up.

These agents debate through `gl.ai_call`, reaching a **subjective consensus** on which "Global Directive" to enforce (e.g., *Double XP for all*, *Shield Wipe*, or a *Leader Tax*). This showcases GenLayer's ability to coordinate AI consensus for non-deterministic outcomes.

---

## 🎮 Gameplay Features
- **Multiplayer Hub**: Create or join encrypted rooms (2-4 players).
- **Fast-Paced Sessions**: Designed for community gatherings, matches last 5-15 minutes.
- **Dynamic Board**: Every room generates a unique, randomized 24-block layout on-chain.
- **11 Unique Block Types**: 
    - 🏗️ **Build**: Accumulate combos for 2x multipliers.
    - 🏴‍☠️ **Steal**: Direct PvP interaction with shield protection.
    - 🗳️ **Governance**: Trigger the AI Council deliberation.
    - 💀 **End**: Instant elimination (The ultimate risk!).
- **Permanent Progression**: Daily, Weekly, and All-Time leaderboards track player legacy.

---

## 🛠️ Technical Prowess
- **Optimized State Engine**: The frontend uses a consolidated "Mega-Poll" system, reducing RPC overhead by fetching the entire game state in a single call.
- **Deterministic Randomness**: Board generation and dice rolls utilize deterministic pseudo-random seeds unique to each room code.
- **Inactivity Guard**: Automated 10-minute cleanup logic ensures orphaned rooms don't clutter the network state.

---

## 🚀 Quick Start

### 1. Contract Deployment
1. Open [GenLayer Studio](https://studio.genlayer.com).
2. Create a new file from `/contracts/genblocks.py`.
3. Deploy and copy the **Contract Address**.

### 2. Frontend Setup
1. Navigate to the `frontend` directory.
2. Initialize environment:
   ```bash
   cp .env.example .env.local
   ```
3. Set your contract address in `.env.local`:
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourDeployedAddress
   ```
4. Install and Run:
   ```bash
   npm install
   npm run dev
   ```

---

## 🏆 Submission Note: Testnet Builders Program
Gen Blocks was built specifically for the "Mini-games for Genlayer's community" requirements:
- ✅ **Showcase Intelligent Contracts**: Centralized logic replaced by decentralized AI deliberation.
- ✅ **Consensus-Driven**: Uses Optimistic Democracy between AI voters to steer game direction.
- ✅ **Community Focused**: Perfect for Discord hangouts with 5-15min replayable sessions.
- ✅ **XP Distribution**: Ready-to-use on-chain leaderboards for rewarding participants.

**Built with ❤️ for the GenLayer Community.**
