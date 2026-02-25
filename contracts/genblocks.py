# { "Depends": "py-genlayer:test" }
from genlayer import *
import time

class GenBlocks(gl.Contract):
    owner: Address
    rooms: TreeMap[str, Address]
    player_in_room: TreeMap[str, bool]
    room_count: TreeMap[str, str]
    game_started: TreeMap[str, bool]
    
    player_xp: TreeMap[str, str]
    player_position: TreeMap[str, str]
    player_shields: TreeMap[str, str]
    player_combo: TreeMap[str, str]
    player_multiplier: TreeMap[str, str]
    
    current_turn: TreeMap[str, str]
    last_dice_roll: TreeMap[str, str]
    turn_phase: TreeMap[str, str]  # "rolling" or "finishing"
    turn_active_mult: TreeMap[str, str]  # room_code -> "1" or "2" based on multiplier active status
    turn_start_time: TreeMap[str, str]  # room_code -> timestamp when turn started
    
    # Board layout - store as comma-separated block types
    board_layout: TreeMap[str, str]
    
    # Player tracking - store comma-separated player addresses
    players_list: TreeMap[str, str]
    
    # Game completion tracking
    max_rounds: TreeMap[str, str]
    current_round: TreeMap[str, str]
    game_finished: TreeMap[str, bool]
    
    # Auction state
    auction_highest_bid: TreeMap[str, str]
    auction_highest_bidder: TreeMap[str, str]
    auction_turn_index: TreeMap[str, str]  # int index into players list
    auction_passed: TreeMap[str, str]  # comma-separated list of addresses who have passed
    
    # NEW: Governance system
    governance_proposal: TreeMap[str, str]  # room_code -> "proposal_type:description"
    governance_votes_yes: TreeMap[str, str]  # room_code -> count
    governance_votes_no: TreeMap[str, str]  # room_code -> count
    governance_player_voted: TreeMap[str, bool]  # room:player -> has_voted
    governance_active: TreeMap[str, bool]  # room_code -> is_proposal_active
    pending_governance_voters: TreeMap[str, str]  # comma-separated list of addresses who haven't voted yet
    
    # NEW: Global leaderboard (all-time)
    global_total_xp: TreeMap[str, str]  # player_address -> total XP earned
    global_games_played: TreeMap[str, str]  # player_address -> games played
    global_games_won: TreeMap[str, str]  # player_address -> games won
    
    # NEW: Weekly leaderboard
    weekly_total_xp: TreeMap[str, str]  # player:week_id -> XP this week
    weekly_games_played: TreeMap[str, str]  # player:week_id -> games this week
    weekly_games_won: TreeMap[str, str]  # player:week_id -> wins this week
    
    # NEW: Daily leaderboard
    daily_total_xp: TreeMap[str, str]  # player:day_id -> XP today
    daily_games_played: TreeMap[str, str]  # player:day_id -> games today
    daily_games_won: TreeMap[str, str]  # player:day_id -> wins today
    
    # NEW: Game history
    game_history: TreeMap[str, str]  # game_id -> "winner,players,scores,timestamp"
    game_counter: str  # Counter for unique game IDs

    # NEW: On-chain room logs
    room_log: TreeMap[str, str]  # room_code -> "entry1|entry2|..." (last 10 entries)
    
    # NEW: Player registry (only players who completed a game)
    known_players: TreeMap[str, str]  # "registry" -> "addr1,addr2,addr3,..."
    known_players_set: TreeMap[str, str]  # player_address -> "1" (for O(1) dedup check)
    
    # NEW: Player Status
    player_eliminated: TreeMap[str, str]  # room:player -> "true" or "false"
    
    # NEW: Reconnection support
    player_active_room: TreeMap[str, str]  # player_address -> current room_code (if in progress)
    
    # NEW: Steal interaction
    pending_steal_target: TreeMap[str, str]
    pending_steal_attacker: TreeMap[str, str]
    pending_steal_time: TreeMap[str, str]
    
    # NEW: Randomness entropy
    player_nonce: TreeMap[str, str]  # room:player -> count for randomness seeding
    
    def __init__(self):
        self.owner = gl.message.sender_address
        self.game_counter = "0"
    
    def _get_current_week_id(self) -> str:
        """Get current week ID (weeks since epoch)"""
        return str(int(time.time()) // (7 * 24 * 60 * 60))
    
    def _get_current_day_id(self) -> str:
        """Get current day ID (days since epoch)"""
        return str(int(time.time()) // (24 * 60 * 60))
    
    def _validate_room_code(self, room_code: str) -> None:
        """Validate room code format"""
        if not room_code or len(room_code) < 4 or len(room_code) > 8:
            raise Exception("Room code must be 4-8 characters")
        if not room_code.replace("_", "").replace("-", "").isalnum():
            raise Exception("Room code must be alphanumeric")
    
    @gl.public.write
    def create_room(self, room_code: str) -> None:
        """Create a new game room"""
        self._validate_room_code(room_code)
        creator = gl.message.sender_address
        
        existing = self.rooms.get(room_code)
        if existing is not None:
            raise Exception("Room already exists")
        
        self.rooms[room_code] = creator
        key = f"{room_code}:{creator.as_hex.lower()}"
        self.player_in_room[key] = True
        self.room_count[room_code] = "1"
        self.game_started[room_code] = False
        self.current_turn[room_code] = "0"
        
        # Initialize players list with creator (always lowercase for consistency)
        self.players_list[room_code] = creator.as_hex.lower()
        self.player_active_room[creator.as_hex.lower()] = room_code
        
        # Initialize game completion tracking
        self.max_rounds[room_code] = "10"
        self.current_round[room_code] = "0"
        self.game_finished[room_code] = False
        
        # Initialize auction state
        self.auction_highest_bid[room_code] = "0"
        self.auction_highest_bidder[room_code] = ""
        
        # Initialize governance
        self.governance_proposal[room_code] = ""
        self.governance_votes_yes[room_code] = "0"
        self.governance_votes_no[room_code] = "0"
        self.governance_active[room_code] = False
        
        # Generate randomized board layout (24 blocks total: 1 Start + 22 Random + 1 End)
        # 0:Start, 1:Build, 2:Bonus, 3:Mystery, 4:Lucky, 5:Steal, 6:Auction, 7:Governance, 8:Danger, 9:Hazard, 10:End
        blocks = [1]*5 + [2]*3 + [3]*2 + [4]*2 + [5]*2 + [6]*2 + [7]*2 + [8]*2 + [9]*2
        
        import random
        self._seed_random(room_code, "board_gen")
        random.shuffle(blocks)
        shuffled_blocks = [0] + blocks + [10]
        
        board = ",".join(str(b) for b in shuffled_blocks)
        self.board_layout[room_code] = board
        self.room_log[room_code] = "Game Lobby Created"
        
        self.player_xp[key] = "10"
        self.player_position[key] = "0"
        self.player_shields[key] = "0"
        self.player_combo[key] = "0"
        self.player_multiplier[key] = "0"
        self.player_eliminated[key] = "false"
    
    def _add_to_log(self, room_code: str, entry: str) -> None:
        """Internal: Add entry to on-chain room log (keep last 10)"""
        current_log = self.room_log.get(room_code) or ""
        entries = current_log.split('|') if current_log else []
        entries.append(entry)
        if len(entries) > 10:
            entries = entries[-10:]
        self.room_log[room_code] = "|".join(entries)

    def _seed_random(self, room_code: str, extra: str = "") -> None:
        """Internal: Seed the random module with entropy from the blockchain state"""
        import random
        # Combine multiple sources of entropy to ensure non-deterministic results
        sender = gl.message.sender_address.as_hex
        
        # Use a nonce to ensure uniqueness even if timestamp is identical
        key = f"{room_code}:{sender.lower()}"
        nonce = int(self.player_nonce.get(key) or "0")
        self.player_nonce[key] = str(nonce + 1)
        
        # Use time, sender, room code, nonce, and any extra state to create a unique seed
        seed_str = f"{time.time()}:{sender}:{room_code}:{nonce}:{extra}"
        
        # Generate a seed number from the string
        seed_num = 0
        for char in seed_str:
            seed_num = (seed_num * 31 + ord(char)) % (2**32)
            
        random.seed(seed_num)
    
    @gl.public.write
    def join_room(self, room_code: str) -> None:
        """Join a room"""
        player = gl.message.sender_address
        
        room_creator = self.rooms.get(room_code)
        if room_creator is None:
            raise Exception("Room not found")
        
        started = self.game_started.get(room_code)
        if started:
            raise Exception("Game already started")
        
        count_str = self.room_count.get(room_code)
        count_num = int(count_str)
        if count_num >= 4:
            raise Exception("Room is full")
        
        key = f"{room_code}:{player.as_hex.lower()}"
        already_in = self.player_in_room.get(key)
        if already_in:
            raise Exception("Already in room")
        
        self.player_in_room[key] = True
        self.room_count[room_code] = str(count_num + 1)
        
        # Add player to players list
        current_players = self.players_list.get(room_code)
        if current_players:
            self.players_list[room_code] = f"{current_players},{player.as_hex.lower()}"
        else:
            self.players_list[room_code] = player.as_hex.lower()
        self.player_active_room[player.as_hex.lower()] = room_code
        
        self.player_xp[key] = "10"
        self.player_position[key] = "0"
        self.player_shields[key] = "0"
        self.player_combo[key] = "0"
        self.player_multiplier[key] = "0"
        self.player_eliminated[key] = "false"
        
        if count_num + 1 == 4:
            self._start_logic(room_code)

    @gl.public.write
    def leave_room(self, room_code: str) -> None:
        """Leave a room / quit the game"""
        player = gl.message.sender_address
        key = f"{room_code}:{player.as_hex.lower()}"

        in_room = self.player_in_room.get(key)
        if not in_room:
            raise Exception("Not in this room")

        # Remove from players list
        players_str = self.players_list.get(room_code)
        if players_str:
            players = players_str.split(',')
            player_addr = player.as_hex.lower()

            if player_addr in players:
                # If game is in progress, mark as eliminated instead of removing
                game_started = self.game_started.get(room_code)
                if game_started:
                    self.player_eliminated[key] = "true"
                    self._add_to_log(room_code, f"💨 {player.as_hex[:6]} left the game!")

                    # If it was this player's turn, advance to next
                    turn_index = int(self.current_turn.get(room_code) or "0")
                    current_player = players[turn_index % len(players)]
                    if current_player.lower() == player_addr:
                        self.current_turn[room_code] = str(turn_index + 1)
                        self.turn_phase[room_code] = "rolling"

                    self._check_winners(room_code)
                else:
                    # Game hasn't started — fully remove
                    players.remove(player_addr)
                    self.players_list[room_code] = ','.join(players)

                    count_num = int(self.room_count.get(room_code) or "1")
                    self.room_count[room_code] = str(max(0, count_num - 1))

                    self.player_in_room[key] = False

        # Clear active room
        self.player_active_room[player.as_hex.lower()] = ""

    @gl.public.write
    def start_game(self, room_code: str) -> None:
        """Start game"""
        player = gl.message.sender_address
        
        room_creator = self.rooms.get(room_code)
        if room_creator is None:
            raise Exception("Room not found")
        
        if room_creator.as_hex != player.as_hex:
            raise Exception("Only creator can start")
        
        count_str = self.room_count.get(room_code)
        count_num = int(count_str)
        if count_num < 2:
            raise Exception("Need 2 players")
        
        self._start_logic(room_code)

    def _start_logic(self, room_code: str) -> None:
        """Internal: Shared logic to start a game with randomized first player"""
        self.game_started[room_code] = True
        self._add_to_log(room_code, "Game Started!")
        
        # Randomize starting player and turn order
        players_str = self.players_list.get(room_code)
        if players_str:
            import random
            self._seed_random(room_code, "start_shuffle")
            players = players_str.split(',')
            random.shuffle(players)
            self.players_list[room_code] = ",".join(players)
            self.current_turn[room_code] = "0"
            print(f"[Contract] Game started. Order: {self.players_list[room_code]}")
    
    @gl.public.write
    def roll_dice(self, room_code: str) -> None:
        """Roll dice and move"""
        try:
            player = gl.message.sender_address
            # print(f"DEBUG: Rolling dice for {player.as_hex} in {room_code}")
            
            started = self.game_started.get(room_code)
            if not started:
                raise Exception("Game not started")
            
            finished = self.game_finished.get(room_code)
            if finished:
                raise Exception("Game already finished")
            
            key = f"{room_code}:{player.as_hex.lower()}"
            in_room = self.player_in_room.get(key)
            if not in_room:
                raise Exception("Not in room")
            
            # Validate it's this player's turn
            players_str = self.players_list.get(room_code)
            if not players_str:
                raise Exception("No players in room")
            
            players = players_str.split(',')
            turn_index = int(self.current_turn.get(room_code) or "0")
            current_player = players[turn_index % len(players)]
            if current_player.lower() != player.as_hex.lower():
                raise Exception(f"Not your turn. Current: {current_player}")
            
            key = f"{room_code}:{player.as_hex.lower()}"
            current_pos = self.player_position.get(key)
            pos_num = int(current_pos)
            
            # Randomize dice roll from 1 to 6
            import random
            self._seed_random(room_code, f"roll:{current_pos}")
            dice_roll = random.randint(1, 6)
            
            board_layout_str = self.board_layout.get(room_code)
            if board_layout_str:
                board_length = len(board_layout_str.split(','))
            else:
                board_length = 19
            
            new_pos = (pos_num + dice_roll) % board_length
            
            # Award XP for passing START
            if new_pos < pos_num:
                current_xp = int(self.player_xp.get(key) or "0")
                self.player_xp[key] = str(current_xp + 10)
                
            self.player_position[key] = str(new_pos)
            self.last_dice_roll[key] = str(dice_roll)
            self._add_to_log(room_code, f"{player.as_hex[:6]} rolled {dice_roll} to {new_pos}")
            
            # Consume multiplier charge for the turn
            current_mult = int(self.player_multiplier.get(key) or "0")
            if current_mult > 0:
                self.player_multiplier[key] = str(current_mult - 1)
                self.turn_active_mult[room_code] = "2"
            else:
                self.turn_active_mult[room_code] = "1"
            
            # Set to finishing phase instead of advancing turn
            # This allows the player to see their results before finishing turn
            self.turn_phase[room_code] = "finishing"
            
            self._check_winners(room_code)
            
        except Exception as e:
            # print(f"ERROR in roll_dice: {str(e)}")
            raise e
    
    def _check_winners(self, room_code: str) -> None:
        """Internal: Check if any player has reached 100 XP"""
        players_str = self.players_list.get(room_code)
        if players_str:
            for player_addr in players_str.split(','):
                p_key = f"{room_code}:{player_addr.lower()}"
                xp = int(self.player_xp.get(p_key) or "0")
                if xp >= 100:
                    print(f"[Contract] Win condition met by {player_addr} with {xp} XP")
                    self._add_to_log(room_code, f"🏆 {player_addr[:6]} WINS!")
                    self._conclude_game_session(room_code)
                    break

    @gl.public.write
    def end_turn(self, room_code: str) -> None:
        """Finish turn and pass to next player"""
        player = gl.message.sender_address
        
        # Validate phase
        phase = self.turn_phase.get(room_code)
        if phase != "finishing":
            raise Exception("Cannot end turn now")
            
        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        if not players_str:
            raise Exception("No players")
            
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player.as_hex.lower():
            raise Exception("Not your turn")
            
        # Advance turn (skipping eliminated players)
        next_turn = (turn_index + 1) % len(players)
        for _ in range(len(players)):
            next_player = players[next_turn]
            next_key = f"{room_code}:{next_player}"
            if self.player_eliminated.get(next_key) != "true":
                break
            next_turn = (next_turn + 1) % len(players)
            
        self.current_turn[room_code] = str(next_turn)
        self.turn_phase[room_code] = "rolling"
        self.turn_active_mult[room_code] = "1"

    def _conclude_game_session(self, room_code: str) -> None:
        """Internal: Finish game and update leaderboards"""
        self.game_finished[room_code] = True
        self.game_started[room_code] = False # Mark as not started anymore
        
        # Clear active room for all players to allow them to join new games
        players_str = self.players_list.get(room_code)
        if players_str:
            for addr in players_str.split(','):
                self.player_active_room[addr.lower()] = "none"
        
        # Determine winner
        players_str = self.players_list.get(room_code)
        if not players_str:
            return
        
        players = players_str.split(',')
        max_xp = 0
        winner = ""
        scores = []
        
        for player_addr in players:
            key = f"{room_code}:{player_addr}"
            xp_str = self.player_xp.get(key)
            xp = int(xp_str) if xp_str else 0
            scores.append(f"{player_addr}:{xp}")
            
            if xp > max_xp:
                max_xp = xp
                winner = player_addr
            elif xp == max_xp and winner == "":
                winner = player_addr
        
        # Tie-breaker: if multiple players have max_xp, earlier in list wins (simplification)
        # but usually 100 XP is reached by one person first.
        
        # Store game history
        game_id = self.game_counter
        self.game_counter = str(int(game_id) + 1)
        timestamp = str(int(time.time()))
        history = f"{winner}|{players_str}|{','.join(scores)}|{timestamp}"
        self.game_history[game_id] = history
        
        # Update leaderboards for all players
        week_id = self._get_current_week_id()
        day_id = self._get_current_day_id()
        
        for player_addr in players:
            key = f"{room_code}:{player_addr.lower()}"
            xp_str = self.player_xp.get(key)
            xp = int(xp_str) if xp_str else 0
            is_winner = (player_addr.lower() == winner.lower())
            
            # Update all-time stats
            self._update_player_stats(player_addr.lower(), xp, is_winner)
            
            # Update weekly stats
            self._update_weekly_stats(player_addr.lower(), week_id, xp, is_winner)
            
            # Update daily stats
            self._update_daily_stats(player_addr.lower(), day_id, xp, is_winner)
            
            # Clear active room
            self.player_active_room[player_addr.lower()] = ""
            
            # Register player in known_players (only on game completion)
            if not self.known_players_set.get(player_addr.lower()):
                self.known_players_set[player_addr.lower()] = "1"
                current_list = self.known_players.get("registry") or ""
                if current_list:
                    self.known_players["registry"] = f"{current_list},{player_addr.lower()}"
                else:
                    self.known_players["registry"] = player_addr.lower()
    
    def _update_player_stats(self, player: str, xp: int, won: bool) -> None:
        """Update global player stats"""
        player = player.lower()
        # Total XP
        current_xp = int(self.global_total_xp.get(player) or "0")
        self.global_total_xp[player] = str(current_xp + xp)
        
        # Games played
        games = int(self.global_games_played.get(player) or "0")
        self.global_games_played[player] = str(games + 1)
        
        # Games won
        if won:
            wins = int(self.global_games_won.get(player) or "0")
            self.global_games_won[player] = str(wins + 1)
    
    def _update_weekly_stats(self, player: str, week_id: str, xp: int, won: bool) -> None:
        """Update weekly stats"""
        key = f"{player.lower()}:{week_id}"
        
        # XP
        current_xp = int(self.weekly_total_xp.get(key) or "0")
        self.weekly_total_xp[key] = str(current_xp + xp)
        
        # Games
        games = int(self.weekly_games_played.get(key) or "0")
        self.weekly_games_played[key] = str(games + 1)
        
        # Wins
        if won:
            wins = int(self.weekly_games_won.get(key) or "0")
            self.weekly_games_won[key] = str(wins + 1)

    # Removed duplicate _check_winners here to avoid confusion
    
    def _update_daily_stats(self, player: str, day_id: str, xp: int, won: bool) -> None:
        """Update daily player stats"""
        key = f"{player.lower()}:{day_id}"
        
        current_xp = int(self.daily_total_xp.get(key) or "0")
        self.daily_total_xp[key] = str(current_xp + xp)
        
        games = int(self.daily_games_played.get(key) or "0")
        self.daily_games_played[key] = str(games + 1)
        
        if won:
            wins = int(self.daily_games_won.get(key) or "0")
            self.daily_games_won[key] = str(wins + 1)
    
    # Governance functions
    @gl.public.write
    def create_governance_proposal(self, room_code: str, proposal_type: str) -> None:
        """Create a governance proposal (called when landing on governance block)"""
        player = gl.message.sender_address
        key = f"{room_code}:{player.as_hex.lower()}"
        
        in_room = self.player_in_room.get(key)
        if not in_room: raise Exception("Not in room")

        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        if current_player.lower() != player.as_hex.lower(): raise Exception("Not your turn")
        
        if proposal_type not in ["group_xp", "shield_all", "burn_shields", "strip_multipliers", "grant_multipliers", "tax_players"]:
            raise Exception("Invalid proposal type")
            
        descriptions = {
            "group_xp": "+5 XP for ALL players",
            "shield_all": "Give ALL players 1 Shield",
            "burn_shields": "Destroy ALL shields in game",
            "strip_multipliers": "Remove ALL 2x multipliers in game",
            "grant_multipliers": "Give EVERYONE a 2x multiplier",
            "tax_players": "-5 XP for ALL players"
        }
        
        self.turn_phase[room_code] = "governing"
        self.governance_proposal[room_code] = f"{proposal_type}:{descriptions[proposal_type]}"
        self.governance_votes_yes[room_code] = "0"
        self.governance_votes_no[room_code] = "0"
        self.governance_active[room_code] = True
        
        # Everyone except proposer needs to vote
        voters = [p.lower() for p in players if p.lower() != player.as_hex.lower()]
        self.pending_governance_voters[room_code] = ",".join(voters)
        
        # Proposer automatically votes YES
        self.governance_votes_yes[room_code] = "1"
        self._add_to_log(room_code, f"{player.as_hex[:6]} proposed: {descriptions[proposal_type]}")
        
        # If no voters (i.e. single player game), execute instantly
        if len(voters) == 0:
            self.execute_governance(room_code)

    @gl.public.write
    def vote_on_proposal(self, room_code: str, action: str) -> None:
        """Vote on active governance proposal"""
        player = gl.message.sender_address.as_hex.lower()
        
        phase = self.turn_phase.get(room_code)
        if phase != "governing": raise Exception("No active governance phase")
            
        active = self.governance_active.get(room_code)
        if not active: raise Exception("No active proposal")

        pending_str = self.pending_governance_voters.get(room_code) or ""
        pending_voters = pending_str.split(',') if pending_str else []
        
        if player not in pending_voters:
            raise Exception("Already voted or not eligible")
            
        pending_voters.remove(player)
        self.pending_governance_voters[room_code] = ",".join(pending_voters)
        
        if action == "approve":
            yes_count = int(self.governance_votes_yes.get(room_code) or "0")
            self.governance_votes_yes[room_code] = str(yes_count + 1)
            self._add_to_log(room_code, f"{player[:6]} voted YES")
        elif action == "reject":
            no_count = int(self.governance_votes_no.get(room_code) or "0")
            self.governance_votes_no[room_code] = str(no_count + 1)
            self._add_to_log(room_code, f"{player[:6]} voted NO")
        elif action == "timeout":
            # Count timeout as a reject
            no_count = int(self.governance_votes_no.get(room_code) or "0")
            self.governance_votes_no[room_code] = str(no_count + 1)
            self._add_to_log(room_code, f"{player[:6]} timed out (abstained)")
        else:
            raise Exception("Invalid action")
        
        if len(pending_voters) == 0:
            self.execute_governance(room_code)

    def execute_governance(self, room_code: str) -> None:
        """Execute governance proposal if it passed"""
        self.governance_active[room_code] = False
        self.turn_phase[room_code] = "finishing"
        
        yes_votes = int(self.governance_votes_yes.get(room_code) or "0")
        no_votes = int(self.governance_votes_no.get(room_code) or "0")
        
        if yes_votes <= no_votes:
            self._add_to_log(room_code, f"Proposal FAILED ({yes_votes} Yes / {no_votes} No).")
            self._check_winners(room_code)
            return
            
        # Passed
        self._add_to_log(room_code, f"Proposal PASSED! ({yes_votes} Yes / {no_votes} No).")
        proposal = self.governance_proposal.get(room_code) or ""
        if not proposal: return
        
        proposal_type = proposal.split(':')[0]
        players_str = self.players_list.get(room_code)
        if not players_str: return
        
        for player_addr in players_str.split(','):
            key = f"{room_code}:{player_addr.lower()}"
            if proposal_type == "shield_all":
                shields = int(self.player_shields.get(key) or "0")
                self.player_shields[key] = str(shields + 1)
            elif proposal_type == "group_xp":
                xp = int(self.player_xp.get(key) or "0")
                self.player_xp[key] = str(xp + 5)
            elif proposal_type == "tax_players":
                xp = int(self.player_xp.get(key) or "0")
                self.player_xp[key] = str(max(0, xp - 5))
            elif proposal_type == "burn_shields":
                self.player_shields[key] = "0"
            elif proposal_type == "strip_multipliers":
                self.player_multiplier[key] = "0"
                self.turn_active_mult[room_code] = "1"
            elif proposal_type == "grant_multipliers":
                mults = int(self.player_multiplier.get(key) or "0")
                self.player_multiplier[key] = str(mults + 1)

        self._check_winners(room_code)
    
    # View functions for leaderboards
    @gl.public.view
    def get_all_known_players(self) -> str:
        """Get all player addresses who have completed at least one game"""
        return self.known_players.get("registry") or ""
    
    @gl.public.view
    def get_leaderboard(self, period: str) -> str:
        """Get full leaderboard data for all known players.
        period: 'alltime', 'weekly', or 'daily'
        Returns: addr:xp:games:wins|addr:xp:games:wins|...
        """
        players_str = self.known_players.get("registry") or ""
        if not players_str:
            return ""
        
        results = []
        for addr in players_str.split(','):
            addr = addr.strip().lower()
            if not addr:
                continue
            
            if period == 'weekly':
                week_id = self._get_current_week_id()
                key = f"{addr}:{week_id}"
                xp = self.weekly_total_xp.get(key) or "0"
                games = self.weekly_games_played.get(key) or "0"
                wins = self.weekly_games_won.get(key) or "0"
            elif period == 'daily':
                day_id = self._get_current_day_id()
                key = f"{addr}:{day_id}"
                xp = self.daily_total_xp.get(key) or "0"
                games = self.daily_games_played.get(key) or "0"
                wins = self.daily_games_won.get(key) or "0"
            else:  # alltime
                xp = self.global_total_xp.get(addr) or "0"
                games = self.global_games_played.get(addr) or "0"
                wins = self.global_games_won.get(addr) or "0"
            
            results.append(f"{addr}:{xp}:{games}:{wins}")
        
        return "|".join(results)
    
    @gl.public.view
    def get_player_global_stats(self, player: str) -> str:
        """Get player's all-time stats: total_xp,games_played,games_won"""
        player = player.lower()
        xp = self.global_total_xp.get(player) or "0"
        games = self.global_games_played.get(player) or "0"
        wins = self.global_games_won.get(player) or "0"
        return f"{xp},{games},{wins}"
    
    @gl.public.view
    def get_player_weekly_stats(self, player: str) -> str:
        """Get player's weekly stats for current week"""
        week_id = self._get_current_week_id()
        key = f"{player.lower()}:{week_id}"
        xp = self.weekly_total_xp.get(key) or "0"
        games = self.weekly_games_played.get(key) or "0"
        wins = self.weekly_games_won.get(key) or "0"
        return f"{xp},{games},{wins}"
    
    @gl.public.view
    def get_player_daily_stats(self, player: str) -> str:
        """Get player's daily stats for today"""
        day_id = self._get_current_day_id()
        key = f"{player.lower()}:{day_id}"
        xp = self.daily_total_xp.get(key) or "0"
        games = self.daily_games_played.get(key) or "0"
        wins = self.daily_games_won.get(key) or "0"
        return f"{xp},{games},{wins}"
    
    @gl.public.view
    def is_player_eliminated(self, room_code: str, player: str) -> bool:
        """Check if player is eliminated"""
        key = f"{room_code}:{player.lower()}"
        return self.player_eliminated.get(key) == "true"

    @gl.public.view
    def get_room_log(self, room_code: str) -> str:
        """Get the last 10 log entries for this room"""
        return self.room_log.get(room_code) or ""
    
    # Existing view functions (keeping all original ones)
    @gl.public.view
    def get_board_layout(self, room_code: str) -> str:
        layout = self.board_layout.get(room_code)
        return layout if layout is not None else ""
    
    @gl.public.view
    def get_last_dice_roll(self, room_code: str, player: str) -> str:
        key = f"{room_code}:{player.lower()}"
        roll = self.last_dice_roll.get(key)
        return roll if roll is not None else "0"
    
    @gl.public.view
    def get_room_creator(self, room_code: str) -> str:
        creator = self.rooms.get(room_code)
        if creator is None:
            return "Not found"
        return creator.as_hex
    
    @gl.public.view
    def get_player_count(self, room_code: str) -> str:
        count = self.room_count.get(room_code)
        return count if count is not None else "0"
    
    @gl.public.view
    def is_game_started(self, room_code: str) -> bool:
        started = self.game_started.get(room_code)
        return started if started is not None else False
    
    @gl.public.view
    def is_player_in_room(self, room_code: str, player: str) -> bool:
        key = f"{room_code}:{player.lower()}"
        in_room = self.player_in_room.get(key)
        return in_room if in_room is not None else False
    
    @gl.public.view
    def get_player_xp(self, room_code: str, player: str) -> str:
        key = f"{room_code}:{player.lower()}"
        xp = self.player_xp.get(key)
        return xp if xp is not None else "0"
    
    @gl.public.view
    def get_player_position(self, room_code: str, player: str) -> str:
        key = f"{room_code}:{player.lower()}"
        pos = self.player_position.get(key)
        return pos if pos is not None else "0"
    
    @gl.public.view
    def get_player_shields(self, room_code: str, player: str) -> str:
        key = f"{room_code}:{player.lower()}"
        shields = self.player_shields.get(key)
        return shields if shields is not None else "0"
    
    @gl.public.view
    def get_player_combo(self, room_code: str, player: str) -> str:
        key = f"{room_code}:{player.lower()}"
        combo = self.player_combo.get(key)
        return combo if combo is not None else "0"
    
    @gl.public.view
    def get_player_multiplier(self, room_code: str, player: str) -> bool:
        key = f"{room_code}:{player.lower()}"
        mult = int(self.player_multiplier.get(key) or "0")
        
        # Check if it's currently their turn and active
        players_str = self.players_list.get(room_code)
        if players_str:
            players = players_str.split(',')
            turn_index = int(self.current_turn.get(room_code) or "0")
            current_player = players[turn_index % len(players)]
            if current_player.lower() == player.lower():
                active_mult = self.turn_active_mult.get(room_code)
                if active_mult == "2":
                    return True
                    
        return mult > 0
    
    @gl.public.view
    def get_all_players(self, room_code: str) -> str:
        players = self.players_list.get(room_code)
        return players if players is not None else ""
    
    @gl.public.view
    def get_current_turn_index(self, room_code: str) -> str:
        turn = self.current_turn.get(room_code)
        return turn if turn is not None else "0"

    @gl.public.view
    def get_all_player_data(self, room_code: str) -> str:
        """Get all player stats in a single string for optimized polling
        Format: addr:xp:pos:shields:combo:mult:elim|addr:xp:pos:shields:combo:mult:elim|...
        """
        players_str = self.players_list.get(room_code)
        if not players_str:
            return ""
        
        turn_idx = self.current_turn.get(room_code) or "0"
        start_time = self.turn_start_time.get(room_code) or "0"
        phase = self.turn_phase.get(room_code) or "rolling"
        pending_target = self.pending_steal_target.get(room_code) or "none"
        pending_attacker = self.pending_steal_attacker.get(room_code) or "none"
        auction_bid = self.auction_highest_bid.get(room_code) or "0"
        auction_bidder = self.auction_highest_bidder.get(room_code) or "none"
        auction_turn = self.auction_turn_index.get(room_code) or "0"
        auction_passed = self.auction_passed.get(room_code) or ""
        gov_active = "1" if self.governance_active.get(room_code) else "0"
        gov_prop = self.governance_proposal.get(room_code) or ""
        gov_yes = self.governance_votes_yes.get(room_code) or "0"
        gov_no = self.governance_votes_no.get(room_code) or "0"
        gov_voters = self.pending_governance_voters.get(room_code) or ""
        
        results = []
        for addr in players_str.split(','):
            key = f"{room_code}:{addr.lower()}"
            xp = self.player_xp.get(key) or "0"
            pos = self.player_position.get(key) or "0"
            shields = self.player_shields.get(key) or "0"
            combo = self.player_combo.get(key) or "0"
            
            # Determine visual multiplier flag
            mult_val = int(self.player_multiplier.get(key) or "0")
            is_mult = "1" if mult_val > 0 else "0"
            
            turn_index = int(self.current_turn.get(room_code) or "0")
            current_player = players_str.split(',')[turn_index % len(players_str.split(','))]
            if current_player.lower() == addr.lower() and self.turn_active_mult.get(room_code) == "2":
                is_mult = "1"
            
            elim = "1" if self.player_eliminated.get(key) == "true" else "0"
            roll = self.last_dice_roll.get(key) or "0"
            results.append(f"{addr.lower()}:{xp}:{pos}:{shields}:{combo}:{is_mult}:{elim}:{roll}")
        
        players_data = "|".join(results)
        return f"{turn_idx};{start_time};{phase};{players_data};{pending_target};{pending_attacker};{auction_bid};{auction_bidder};{auction_turn};{auction_passed};{gov_active};{gov_prop};{gov_yes};{gov_no};{gov_voters}"

    @gl.public.view
    def get_active_room(self, player_addr: str) -> str:
        """Return the room_code if the player is in an unfinished game"""
        room = self.player_active_room.get(player_addr.lower())
        return room if room else "none"
    
    @gl.public.view
    def is_player_turn(self, room_code: str, player: str) -> bool:
        players_str = self.players_list.get(room_code)
        if not players_str:
            return False
        
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        return current_player.lower() == player.lower()
    
    @gl.public.view
    def is_room_game_over(self, room_code: str) -> str:
        """Return 'FINISHED' or 'ACTIVE' to avoid boolean ambiguity"""
        finished = self.game_finished.get(room_code)
        if finished:
            return "FINISHED"
        return "ACTIVE"

    @gl.public.view
    def get_room_diagnostics(self, room_code: str) -> str:
        """Diagnostic view to debug premature finishes"""
        started = self.game_started.get(room_code)
        finished = self.game_finished.get(room_code)
        players = self.players_list.get(room_code) or ""
        
        xp_list = []
        if players:
            for p in players.split(','):
                xp = self.player_xp.get(f"{room_code}:{p}") or "0"
                xp_list.append(f"{p}:{xp}")
        
        return f"STARTED:{started}|FINISHED:{finished}|PLAYERS:[{players}]|XP:[{','.join(xp_list)}]"
    
    @gl.public.view
    def get_winner(self, room_code: str) -> str:
        players_str = self.players_list.get(room_code)
        if not players_str:
            return "No players"
        
        players = players_str.split(',')
        max_xp = 0
        winner = ""
        
        for player_addr in players:
            key = f"{room_code}:{player_addr}"
            xp_str = self.player_xp.get(key)
            xp = int(xp_str) if xp_str else 0
            
            if xp > max_xp:
                max_xp = xp
                winner = player_addr
        
        return winner if winner else "No winner"
    
    @gl.public.view
    def get_governance_proposal(self, room_code: str) -> str:
        """Get current governance proposal"""
        proposal = self.governance_proposal.get(room_code)
        active = self.governance_active.get(room_code)
        yes_votes = self.governance_votes_yes.get(room_code) or "0"
        no_votes = self.governance_votes_no.get(room_code) or "0"
        
        if not active or not proposal:
            return "none"
        
        return f"{proposal}|{yes_votes}|{no_votes}"

    @gl.public.view
    def get_full_game_state(self, room_code: str) -> str:
        """Consolidated polling for frontend reduction in RPC calls.
        Returns format: player_data_string#governance_proposal#room_log#game_over_status
        """
        player_data = self.get_all_player_data(room_code)
        gov_proposal = self.get_governance_proposal(room_code)
        room_log = self.room_log.get(room_code) or ""
        game_over = self.is_room_game_over(room_code)
        
        return f"{player_data}#{gov_proposal}#{room_log}#{game_over}"
    
    # Block interaction functions (keeping existing ones)
    @gl.public.write
    def handle_build_block(self, room_code: str) -> None:
        player = gl.message.sender_address
        key = f"{room_code}:{player.as_hex.lower()}"
        
        in_room = self.player_in_room.get(key)
        if not in_room:
            raise Exception("Not in room")
        
        current_xp = int(self.player_xp.get(key) or "0")
        current_combo = int(self.player_combo.get(key) or "0")
        
        base_xp = 6
        active_mult = int(self.turn_active_mult.get(room_code) or "1")
        xp_gain = base_xp * active_mult
        
        self.player_xp[key] = str(current_xp + xp_gain)
        self.player_combo[key] = str(current_combo + 1)
        self._add_to_log(room_code, f"{player.as_hex[:6]} built (+{xp_gain} XP)")
        
        if current_combo + 1 >= 3:
            mults = int(self.player_multiplier.get(key) or "0")
            self.player_multiplier[key] = str(mults + 1)
            self._add_to_log(room_code, f"🔥 {player.as_hex[:6]} 2X EARNED!")
            
        self._check_winners(room_code)
    
    @gl.public.write
    def handle_bonus_block(self, room_code: str) -> None:
        player = gl.message.sender_address
        key = f"{room_code}:{player.as_hex.lower()}"
        
        in_room = self.player_in_room.get(key)
        if not in_room:
            raise Exception("Not in room")
            
        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player.as_hex.lower():
            raise Exception("Not your turn")
        
        import random
        self._seed_random(room_code, "bonus")
        reward_type = random.choice([0, 1])
        
        if reward_type == 0:
            current_xp = int(self.player_xp.get(key) or "0")
            base_xp = 5
            active_mult = int(self.turn_active_mult.get(room_code) or "1")
            xp_gain = base_xp * active_mult
            self.player_xp[key] = str(current_xp + xp_gain)
            self._add_to_log(room_code, f"Bonus: +{xp_gain} XP")
        else:
            current_shields = int(self.player_shields.get(key) or "0")
            self.player_shields[key] = str(current_shields + 1)
            self._add_to_log(room_code, "Bonus: +1 Shield")
            
        self._check_winners(room_code)
    
    @gl.public.write
    def handle_mystery_block(self, room_code: str) -> None:
        player = gl.message.sender_address
        key = f"{room_code}:{player.as_hex.lower()}"
        
        in_room = self.player_in_room.get(key)
        if not in_room:
            raise Exception("Not in room")

        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player.as_hex.lower():
            raise Exception("Not your turn")
        
        import random
        self._seed_random(room_code, "mystery")
        reward_type = random.random()
        
        if reward_type < 0.7:
            base_xp = random.randint(5, 20)
            active_mult = int(self.turn_active_mult.get(room_code) or "1")
            xp_gain = base_xp * active_mult
            current_xp = int(self.player_xp.get(key) or "0")
            self.player_xp[key] = str(current_xp + xp_gain)
            self._add_to_log(room_code, f"Mystery: +{xp_gain} XP")
        else:
            current_shields = int(self.player_shields.get(key) or "0")
            self.player_shields[key] = str(current_shields + 1)
            self._add_to_log(room_code, "Mystery: Shield Found")
            
        self._check_winners(room_code)
    
    @gl.public.write
    def handle_lucky_block(self, room_code: str) -> None:
        player = gl.message.sender_address
        key = f"{room_code}:{player.as_hex.lower()}"
        
        in_room = self.player_in_room.get(key)
        if not in_room:
            raise Exception("Not in room")

        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player.as_hex.lower():
            raise Exception("Not your turn")
        
        import random
        self._seed_random(room_code, "lucky")
        rewards = [0, 1, 2, 3]
        reward = random.choice(rewards)
        
        if reward == 1:
            current_xp = int(self.player_xp.get(key) or "0")
            base_xp = 15
            active_mult = int(self.turn_active_mult.get(room_code) or "1")
            xp_gain = base_xp * active_mult
            self.player_xp[key] = str(current_xp + xp_gain)
            self._add_to_log(room_code, f"Lucky: +{xp_gain} XP!")
        elif reward == 2:
            current_shields = int(self.player_shields.get(key) or "0")
            self.player_shields[key] = str(current_shields + 1)
            self._add_to_log(room_code, "Lucky: Shield Found!")
        elif reward == 3:
            mults = int(self.player_multiplier.get(key) or "0")
            self.player_multiplier[key] = str(mults + 1)
            self._add_to_log(room_code, f"Lucky: 2X Multiplier Earned!")
        else:
            self._add_to_log(room_code, "Lucky: No Reward")
            
        self._check_winners(room_code)
    
    @gl.public.write
    def handle_steal_block(self, room_code: str, target_player: str) -> None:
        player = gl.message.sender_address
        key = f"{room_code}:{player.as_hex.lower()}"
        target_key = f"{room_code}:{target_player.lower()}"
        
        in_room = self.player_in_room.get(key)
        if not in_room:
            raise Exception("Not in room")
            
        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player.as_hex.lower():
            raise Exception("Not your turn")
        
        target_in_room = self.player_in_room.get(target_key)
        if not target_in_room:
            raise Exception("Target not in room")
            
        # Transition to steal response phase
        self.turn_phase[room_code] = "stealing_response"
        self.pending_steal_target[room_code] = target_player.lower()
        self.pending_steal_attacker[room_code] = player.as_hex.lower()
        
        # We cannot use time.time() directly due to determinism, we have to rely on frontend enforcing the 40s wait
        # Alternatively, we just let frontend submit "timeout" as an action.

        self._add_to_log(room_code, f"{player.as_hex[:6]} initiated steal on {target_player[:6]}")

    @gl.public.write
    def respond_to_steal(self, room_code: str, action: str) -> None:
        player = gl.message.sender_address
        target_lower = player.as_hex.lower()
        
        phase = self.turn_phase.get(room_code)
        if phase != "stealing_response":
            raise Exception("No active steal response phase")
            
        pending_target = self.pending_steal_target.get(room_code)
        if pending_target != target_lower:
            raise Exception("You are not the steal target")
            
        pending_attacker = self.pending_steal_attacker.get(room_code)
        if not pending_attacker:
            raise Exception("No attacker found")
            
        target_key = f"{room_code}:{target_lower}"
        attacker_key = f"{room_code}:{pending_attacker}"
        
        if action == "timeout":
            # Auto-allow the steal if the user doesn't respond
            target_xp = int(self.player_xp.get(target_key) or "0")
            attacker_xp = int(self.player_xp.get(attacker_key) or "0")
            steal_amount = min(5, target_xp)
            self.player_xp[target_key] = str(target_xp - steal_amount)
            self.player_xp[attacker_key] = str(attacker_xp + steal_amount)
            self._add_to_log(room_code, f"{target_lower[:6]} timed out. {pending_attacker[:6]} stole {steal_amount} XP!")
            
        elif action == "shield":
            shields = int(self.player_shields.get(target_key) or "0")
            if shields <= 0:
                raise Exception("No shields available")
            self.player_shields[target_key] = str(shields - 1)
            self._add_to_log(room_code, f"{target_lower[:6]} blocked steal with shield!")
            
        elif action == "forfeit":
            target_xp = int(self.player_xp.get(target_key) or "0")
            
            base_penalty = 7
            active_mult = int(self.turn_active_mult.get(room_code) or "1")
            penalty = base_penalty * active_mult
            
            self.player_xp[target_key] = str(max(0, target_xp - penalty))
            self._add_to_log(room_code, f"{target_lower[:6]} forfeited {penalty} XP to block steal!")
            
        elif action == "allow":
            target_xp = int(self.player_xp.get(target_key) or "0")
            attacker_xp = int(self.player_xp.get(attacker_key) or "0")
            steal_amount = min(5, target_xp)
            self.player_xp[target_key] = str(target_xp - steal_amount)
            self.player_xp[attacker_key] = str(attacker_xp + steal_amount)
            self._add_to_log(room_code, f"{pending_attacker[:6]} stole {steal_amount} XP!")
            
        else:
            raise Exception("Invalid action")
            
        # Finish steal phase
        self.turn_phase[room_code] = "finishing"
        self.pending_steal_target[room_code] = ""
        self.pending_steal_attacker[room_code] = ""
        
        self._check_winners(room_code)

    @gl.public.write
    def handle_governance_block(self, room_code: str, proposal_type: str) -> None:
        """Landing on governance block - create proposal or vote"""
        self.create_governance_proposal(room_code, proposal_type)
    
    def _finish_auction(self, room_code: str) -> None:
        winner = self.auction_highest_bidder.get(room_code) or ""
        if winner and winner != "none":
            bid = int(self.auction_highest_bid.get(room_code) or "0")
            key = f"{room_code}:{winner}"
            
            player_xp = int(self.player_xp.get(key) or "0")
            self.player_xp[key] = str(max(0, player_xp - bid))
            
            mults = int(self.player_multiplier.get(key) or "0")
            self.player_multiplier[key] = str(mults + 1)
            
            self._add_to_log(room_code, f"Auction won by {winner[:6]} for {bid} XP!")
        else:
            self._add_to_log(room_code, f"Auction ended with no bids.")
            
        self.turn_phase[room_code] = "finishing"
        self.auction_passed[room_code] = ""
        self._check_winners(room_code)
        
    def _next_auction_bidder(self, room_code: str) -> None:
        players_str = self.players_list.get(room_code)
        if not players_str: return
        players = players_str.split(',')
        
        passed_str = self.auction_passed.get(room_code) or ""
        passed_list = passed_str.split(',') if passed_str else []
        
        current_idx = int(self.auction_turn_index.get(room_code) or "0")
        start_idx = current_idx
        
        highest_bidder = self.auction_highest_bidder.get(room_code) or ""
        
        while True:
            current_idx = (current_idx + 1) % len(players)
            p = players[current_idx].lower()
            key = f"{room_code}:{p}"
            
            eliminated = self.player_eliminated.get(key) == "true"
            has_passed = p in passed_list
            has_xp = int(self.player_xp.get(key) or "0") >= 2
            
            if p == highest_bidder:
                self._finish_auction(room_code)
                return

            if not eliminated and not has_passed and has_xp:
                self.auction_turn_index[room_code] = str(current_idx)
                return

            if not has_xp and p not in passed_list and not eliminated:
                passed_list.append(p)
                self.auction_passed[room_code] = ",".join(passed_list)
            
            if current_idx == start_idx:
                self._finish_auction(room_code)
                return

    @gl.public.write
    def handle_auction_block(self, room_code: str) -> None:
        player = gl.message.sender_address
        key = f"{room_code}:{player.as_hex.lower()}"
        
        in_room = self.player_in_room.get(key)
        if not in_room: raise Exception("Not in room")

        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player.as_hex.lower():
            raise Exception("Not your turn")
        
        self.turn_phase[room_code] = "auctioning"
        self.auction_passed[room_code] = ""
        self.auction_highest_bid[room_code] = "0"
        self.auction_highest_bidder[room_code] = ""
        self.auction_turn_index[room_code] = str(turn_index)
        
        p = players[turn_index].lower()
        p_key = f"{room_code}:{p}"
        elim = self.player_eliminated.get(p_key) == "true"
        has_xp = int(self.player_xp.get(p_key) or "0") >= 2
        if elim or not has_xp:
            self._next_auction_bidder(room_code)
            
        self._add_to_log(room_code, f"Auction sequence started.")

    @gl.public.write
    def respond_to_auction(self, room_code: str, action: str, bid_amount: str = "0") -> None:
        player = gl.message.sender_address.as_hex.lower()
        
        phase = self.turn_phase.get(room_code)
        if phase != "auctioning":
            raise Exception("No active auction")
            
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        auc_turn_index = int(self.auction_turn_index.get(room_code) or "0")
        current_bidder = players[auc_turn_index].lower()
        
        if player != current_bidder:
            raise Exception("Not your turn to bid")
            
        if action == "pass" or action == "timeout":
            passed_str = self.auction_passed.get(room_code) or ""
            passed_list = passed_str.split(',') if passed_str else []
            if player not in passed_list:
                passed_list.append(player)
                self.auction_passed[room_code] = ",".join(passed_list)
                if action == "timeout":
                    self._add_to_log(room_code, f"{player[:6]} timed out.")
                else:    
                    self._add_to_log(room_code, f"{player[:6]} passed.")
            self._next_auction_bidder(room_code)
            return
            
        if action == "bid":
            bid = int(bid_amount)
            current_highest = int(self.auction_highest_bid.get(room_code) or "0")
            
            min_bid = max(2, current_highest + 1)
            if bid < min_bid:
                raise Exception(f"Bid too low. Minimum is {min_bid}")
                
            key = f"{room_code}:{player}"
            player_xp = int(self.player_xp.get(key) or "0")
            if bid > player_xp:
                raise Exception("Not enough XP")
                
            self.auction_highest_bid[room_code] = str(bid)
            self.auction_highest_bidder[room_code] = player
            self._add_to_log(room_code, f"{player[:6]} bids {bid} XP.")
            
            self._next_auction_bidder(room_code)
            return
            
        raise Exception("Invalid action")

    @gl.public.write
    def handle_end_block(self, room_code: str) -> None:
        player = gl.message.sender_address
        key = f"{room_code}:{player.as_hex.lower()}"

        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player.as_hex.lower():
            raise Exception("Not your turn")
        current_xp = int(self.player_xp.get(key) or "0")
        
        # Deduct 10 XP and eliminate
        self.player_xp[key] = str(max(0, current_xp - 10))
        self.player_eliminated[key] = "true"
        self._add_to_log(room_code, f"💀 {player.as_hex[:6]} REACHED THE END - ELIMINATED!")
        
        # Check if everyone is eliminated (optional: conclude game if only 1 or 0 left)
        self._check_winners(room_code)

    @gl.public.write
    def handle_danger_block(self, room_code: str) -> None:
        player = gl.message.sender_address
        key = f"{room_code}:{player.as_hex.lower()}"
        
        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player.as_hex.lower():
            raise Exception("Not your turn")
        current_xp = int(self.player_xp.get(key) or "0")
        
        base_penalty = 2
        active_mult = int(self.turn_active_mult.get(room_code) or "1")
        penalty = base_penalty * active_mult
        
        self.player_xp[key] = str(max(0, current_xp - penalty))
        self._add_to_log(room_code, f"Danger: {player.as_hex[:6]} lost {penalty} XP")
        self._check_winners(room_code)

    @gl.public.write
    def handle_hazard_block(self, room_code: str) -> None:
        player = gl.message.sender_address
        key = f"{room_code}:{player.as_hex.lower()}"
        
        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player.as_hex.lower():
            raise Exception("Not your turn")
        current_xp = int(self.player_xp.get(key) or "0")
        
        base_penalty = 5
        active_mult = int(self.turn_active_mult.get(room_code) or "1")
        penalty = base_penalty * active_mult
        
        self.player_xp[key] = str(max(0, current_xp - penalty))
        self._add_to_log(room_code, f"HAZARD: {player.as_hex[:6]} lost {penalty} XP")
        self._check_winners(room_code)