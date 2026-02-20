# gen-blocks
community game

## Contract address (room not found in GenLayer Studio?)

If GenLayer Studio shows "room not found" when you query the contract:

1. Deploy the contract from `contracts/BlockDashGame.py` in GenLayer Studio.
2. Copy the **exact** contract address from GenLayer Studio.
3. In the frontend, create `frontend/.env.local` and set:
   ```bash
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourAddressFromGenLayerStudio
   ```
4. Restart the frontend (`npm run dev`). The app and Studio must use the same contract address and network (e.g. studionet).
