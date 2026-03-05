# v 0.1.0
# { "Depends": "py-genlayer:test" }
import re
from genlayer import *

class GenBlocks(gl.Contract):
    owner: str
    rooms: TreeMap[str, str]
    player_in_room: TreeMap[str, str]
    room_count: TreeMap[str, str]
    game_started: TreeMap[str, str]
    time_counter: str # Deterministic replacement for time.time()
    
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
    game_finished: TreeMap[str, str]
    
    # Auction state
    auction_highest_bid: TreeMap[str, str]
    auction_highest_bidder: TreeMap[str, str]
    auction_turn_index: TreeMap[str, str]  # int index into players list
    auction_passed: TreeMap[str, str]  # comma-separated list of addresses who have passed
    
    # AI Governance system
    governance_proposal: TreeMap[str, str]  # room_code -> "proposal_type:description"
    governance_reasoning: TreeMap[str, str] # room_code -> "Agent 1: ... Agent 2: ... Final: ..."
    governance_active: TreeMap[str, str]  # room_code -> is_proposal_active
    governance_votes: TreeMap[str, str]    # room_code -> "yes:no" or winner data

    
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
    
    # NEW: Inactivity tracking
    last_activity: TreeMap[str, str] # room_code -> timestamp of last activity
    
    # NEW: Steal interaction
    pending_steal_target: TreeMap[str, str]
    pending_steal_attacker: TreeMap[str, str]
    pending_steal_time: TreeMap[str, str]
    
    # NEW: Randomness entropy
    player_nonce: TreeMap[str, str]  # room:player -> count for randomness seeding
    
    def __init__(self):
        self.owner = ""
        self.game_counter = "0"
        self.time_counter = "1000000"

    def _clean_addr(self, addr) -> str:
        if addr is None: return ""
        s = str(addr).lower()
        start = s.find("0x")
        if start != -1:
            hex_part = s[start+2:start+42]
            res = ""
            for c in hex_part:
                if c in "0123456789abcdef":
                    res += c
            return res
        return s.strip()

    def _get_sender(self) -> str:
        try:
            addr = gl.message.sender_address
            # Try to get hex reliably
            if hasattr(addr, 'as_hex'):
                h = addr.as_hex
                if callable(h): return self._clean_addr(h())
                return self._clean_addr(h)
            return self._clean_addr(addr)
        except:
            return ""
    
    def _get_now(self) -> int:
        """Returns deterministic timestamp using gl.get_time() or fallback to counter"""
        try:
            # Try to get real block time if available in this GenLayer version
            return int(gl.get_time())
        except:
            # Fallback to logical clock if gl.get_time() fails
            current = int(self.time_counter or "1000000")
            self.time_counter = str(current + 1)
            return current

    def _get_now_view(self) -> int:
        """Read-only version of now for view functions"""
        try:
            return int(gl.get_time())
        except:
            return int(self.time_counter or "1000000")

    def _update_activity(self, room_code: str) -> None:
        """Update last activity timestamp for the room"""
        self.last_activity[room_code] = str(self._get_now())

    def _is_room_expired(self, room_code: str) -> bool:
        """Check if room has been inactive for > 10 minutes (600 seconds)"""
        last_active = self.last_activity.get(room_code)
        if not last_active:
            return False
        
        now = self._get_now_view()
        # 600 seconds = 10 minutes
        if now - int(last_active) > 600:
            return True
        return False

    def _check_room(self, room_code: str) -> None:
        """Helper to validate room existence, status and update activity"""
        if not self.rooms.get(room_code):
            raise Exception("Room does not exist")
        if self.game_finished.get(room_code) == "true":
            raise Exception("Game already finished")
        if self._is_room_expired(room_code):
            raise Exception("Room expired due to inactivity")
        self._update_activity(room_code)

    def _get_current_week_id(self, timestamp: int = -1) -> str:
        """Get current week ID"""
        t = timestamp if timestamp != -1 else self._get_now_view()
        return str(t // (7 * 24 * 60 * 60))
    
    def _get_current_day_id(self, timestamp: int = -1) -> str:
        """Get current day ID"""
        t = timestamp if timestamp != -1 else self._get_now_view()
        return str(t // (24 * 60 * 60))
    
    def _validate_room_code(self, room_code: str) -> None:
        """Validate room code format"""
        if not room_code or len(room_code) < 4 or len(room_code) > 8:
            raise Exception("Room code must be 4-8 characters")
        if not room_code.replace("_", "").replace("-", "").isalnum():
            raise Exception("Room code must be alphanumeric")
    
    @gl.public.write
    def create_room(self, room_code: str) -> str:
        """Create a new game room"""
        self._validate_room_code(room_code)
        creator_addr = self._get_sender()
        if not self.owner: self.owner = creator_addr
        
        existing = self.rooms.get(room_code)
        if existing is not None:
            raise Exception("Room already exists")
        
        self.rooms[room_code] = creator_addr
        key = f"{room_code}:{creator_addr}"
        self.player_in_room[key] = "true"
        self.room_count[room_code] = "1"
        self.game_started[room_code] = "false"
        self.current_turn[room_code] = "0"
        
        # Initialize players list with creator (always lowercase for consistency)
        self.players_list[room_code] = creator_addr
        self.player_active_room[creator_addr] = room_code
        
        # Initialize game completion tracking
        self.max_rounds[room_code] = "10"
        self.current_round[room_code] = "0"
        self.game_finished[room_code] = "false"
        self._update_activity(room_code)
        
        # Initialize auction state
        self.auction_highest_bid[room_code] = "0"
        self.auction_highest_bidder[room_code] = ""
        
        self.governance_active[room_code] = "false"
        self.turn_phase[room_code] = "rolling"
        
        # Generate randomized board layout (24 blocks total: 1 Start + 22 Random + 1 End)
        # 0:Start, 1:Build, 2:Bonus, 3:Mystery, 4:Lucky, 5:Steal, 6:Auction, 7:Governance, 8:Danger, 9:Hazard, 10:End
        blocks = [1]*5 + [2]*3 + [3]*2 + [4]*2 + [5]*2 + [6]*2 + [7]*2 + [8]*2 + [9]*2
        
        shuffled_blocks_list = self._shuffle_blocks(room_code, blocks)
        shuffled_blocks = [0] + shuffled_blocks_list + [10]
        
        board = ",".join(str(b) for b in shuffled_blocks)
        self.board_layout[room_code] = board
        self.room_log[room_code] = "Game Lobby Created"
        
        self.player_xp[key] = "10"
        self.player_position[key] = "0"
        self.player_shields[key] = "0"
        self.player_combo[key] = "0"
        self.player_multiplier[key] = "0"
        self.player_eliminated[key] = "false"
        return "Room created"
    
    
    def _get_player_label(self, room_code: str, addr: str) -> str:
        """Helper to get a short player label like P1, P2 instead of 0x..."""
        if not addr: return "UNK"
        ps = self.players_list.get(room_code)
        if not ps: return addr[:6]
        
        plist = ps.split(',')
        low_addr = addr.lower()
        for i in range(len(plist)):
            if plist[i].lower() == low_addr:
                idx = i + 1
                return "P" + str(idx)
        return addr[:6]
    
    def _add_to_log(self, room_code: str, entry: str, player_addr: str = "") -> None:
        """Internal: Add entry to on-chain room log (keep last 10)"""
        turn_idx = self.current_turn.get(room_code) or "0"
        
        final_msg = entry
        if player_addr:
            label = self._get_player_label(room_code, player_addr)
            if entry:
                final_msg = f"{label} {entry}"
            else:
                final_msg = label
                
        entry_with_turn = f"[{turn_idx}] {final_msg}"
        current_log = self.room_log.get(room_code) or ""
        entries = current_log.split('|') if current_log else []
        entries.append(entry_with_turn)
        if len(entries) > 10:
            entries = entries[-10:]
        self.room_log[room_code] = "|".join(entries)

    def _deduct_xp(self, room_code: str, player_addr: str, amount: int) -> None:
        """Internal: Deduct XP and check for elimination"""
        key = f"{room_code}:{player_addr.lower()}"
        current_xp = int(self.player_xp.get(key) or "0")
        new_xp = max(0, current_xp - amount)
        self.player_xp[key] = str(new_xp)
        
        if new_xp == 0:
            self.player_eliminated[key] = "true"
            self._add_to_log(room_code, "ELIMINATED (Ran out of XP)", player_addr)

    def _deterministic_rand(self, room_code: str, max_val: int, extra: str = "") -> int:
        """Internal: Deterministic pseudo-random number generation"""
        sender = self._get_sender()
        key = f"{room_code}:{sender}"
        nonce = int(self.player_nonce.get(key) or "0")
        self.player_nonce[key] = str(nonce + 1)
        
        seed_str = f"{self._get_now()}:{sender}:{room_code}:{nonce}:{extra}"
        seed_num = 0
        for char in seed_str:
            seed_num = (seed_num * 31 + ord(char)) % (2**31 - 1)
            
        if max_val <= 0: return 0
        return seed_num % max_val

    def _shuffle_blocks(self, room_code: str, blocks: list) -> list:
        """Fisher-Yates shuffle using deterministic rand"""
        n = len(blocks)
        for i in range(n - 1, 0, -1):
            j = self._deterministic_rand(room_code, i + 1, "shuffle_" + str(i))
            blocks[i], blocks[j] = blocks[j], blocks[i]
        return blocks
    
    @gl.public.write
    def join_room(self, room_code: str) -> str:
        """Join a room"""
        player_addr = self._get_sender()
        
        room_creator = self.rooms.get(room_code)
        if room_creator is None:
            raise Exception("Room not found")
        
        started = self.game_started.get(room_code)
        if started == "true":
            raise Exception("Game already started")
        
        count_str = self.room_count.get(room_code)
        count_num = int(count_str)
        if count_num >= 4:
            raise Exception("Room is full")
        
        key = f"{room_code}:{player_addr}"
        already_in = self.player_in_room.get(key)
        if already_in == "true":
            raise Exception("Already in room")
        
        self.player_in_room[key] = "true"
        self.room_count[room_code] = str(count_num + 1)
        
        # Add player to players list
        current_players = self.players_list.get(room_code)
        if current_players:
            self.players_list[room_code] = f"{current_players},{player_addr}"
        else:
            self.players_list[room_code] = player_addr
        self.player_active_room[player_addr] = room_code
        self._update_activity(room_code)
        
        self.player_xp[key] = "10"
        self.player_position[key] = "0"
        self.player_shields[key] = "0"
        self.player_combo[key] = "0"
        self.player_multiplier[key] = "0"
        self.player_eliminated[key] = "false"
        
        if count_num + 1 == 4:
            self._start_logic(room_code)
        return "Joined room " + room_code

    @gl.public.write
    def leave_room(self, room_code: str) -> str:
        """Leave a room / quit the game"""
        player_addr = self._get_sender()
        key = f"{room_code}:{player_addr}"

        in_room = self.player_in_room.get(key)
        if in_room != "true":
            raise Exception("Not in this room")

        # Remove from players list
        players_str = self.players_list.get(room_code)
        if players_str:
            players = players_str.split(',')

            if player_addr in players:
                # If game is in progress, mark as eliminated instead of removing
                game_started = self.game_started.get(room_code)
                if game_started == "true":
                    self.player_eliminated[key] = "true"
                    self._add_to_log(room_code, "left the game!", player_addr)

                    # If it was this player's turn, advance to next
                    turn_index = int(self.current_turn.get(room_code) or "0")
                    current_player = players[turn_index % len(players)].lower()
                    if current_player == player_addr:
                        self.current_turn[room_code] = str(turn_index + 1)
                        self.turn_phase[room_code] = "rolling"

                    self._check_winners(room_code)
                else:
                    # Game hasn't started — fully remove
                    players.remove(player_addr)
                    remaining = [p for p in players if p]

                    self.player_in_room[key] = "false"
                    count_num = int(self.room_count.get(room_code) or "1")
                    
                    if remaining:
                        # Still players left — update list and count
                        self.players_list[room_code] = ','.join(remaining)
                        self.room_count[room_code] = str(max(0, count_num - 1))
                    else:
                        # Room is empty — dissolve it
                        self.players_list[room_code] = ""
                        self.room_count[room_code] = "0"
                        self.rooms[room_code] = ""
                        self._add_to_log(room_code, "Room dissolved (all players left)")

        # Clear active room
        self.player_active_room[player_addr] = ""
        return "Left room"

    @gl.public.write
    def start_game(self, room_code: str) -> str:
        """Start game"""
        player_addr = self._get_sender()
        
        room_creator = self.rooms.get(room_code)
        if room_creator is None:
            raise Exception("Room not found")
        
        if room_creator != player_addr:
            raise Exception("Only creator can start")
        
        count_str = self.room_count.get(room_code)
        count_num = int(count_str)
        if count_num < 2:
            raise Exception("Need 2 players")
        
        self._start_logic(room_code)
        return "Game started"

    def _start_logic(self, room_code: str) -> None:
        """Internal: Shared logic to start a game with randomized first player"""
        self.game_started[room_code] = "true"
        self._add_to_log(room_code, "🎮 Game Started!")
        self._update_activity(room_code)
        
        # Randomize starting player turn index without changing player order
        players_str = self.players_list.get(room_code)
        if players_str:
            players_list = players_str.split(',')
            start_idx = self._deterministic_rand(room_code, len(players_list), "start_turn")
            self.current_turn[room_code] = str(start_idx)
    
    @gl.public.write
    def roll_dice(self, room_code: str) -> str:
        """Roll dice and move"""
        try:
            self._check_room(room_code)
            
            phase = self.turn_phase.get(room_code) or "rolling"
            if phase != "rolling": raise Exception(f"Phase must be 'rolling' (Current: {phase})")
            player_addr = self._get_sender()
            
            started = self.game_started.get(room_code)
            if started != "true":
                raise Exception("Game not started")
            
            key = f"{room_code}:{player_addr}"
            in_room = self.player_in_room.get(key)
            if in_room != "true":
                raise Exception("Not in room")
            
            # Validate it's this player's turn
            players_str = self.players_list.get(room_code)
            if not players_str:
                raise Exception("No players in room")
            
            players = players_str.split(',')
            turn_index = int(self.current_turn.get(room_code) or "0")
            current_player = players[turn_index % len(players)].lower()
            if current_player != player_addr:
                raise Exception(f"Not your turn. Current: {current_player}")
            
            current_pos = self.player_position.get(key)
            pos_num = int(current_pos)
            
            # Randomize dice roll from 1 to 6
            dice_roll = self._deterministic_rand(room_code, 6, "roll_dice") + 1
            
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
            self._add_to_log(room_code, f"rolled {dice_roll} to {new_pos}", player_addr)
            
            # Consume multiplier charge for the turn
            current_mult = int(self.player_multiplier.get(key) or "0")
            if current_mult > 0:
                self.player_multiplier[key] = str(current_mult - 1)
                self.turn_active_mult[room_code] = "2"
            else:
                self.turn_active_mult[room_code] = "1"
            
            # Determine if this block is passive or interactive
            blocks_arr = board_layout_str.split(',')
            landed_block_id = int(blocks_arr[new_pos])
            
            if landed_block_id == 0: # START
                self.turn_phase[room_code] = "finishing"
            else:
                self.turn_phase[room_code] = "acting"
            
            self._check_winners(room_code)
            return "Dice rolled"
            
        except Exception as e:
            raise e
    
    def _check_winners(self, room_code: str) -> None:
        """Internal: Check if any player has reached 100 XP or if only one remains"""
        players_str = self.players_list.get(room_code)
        if not players_str: return
        
        players = players_str.split(',')
        active_players = []
        
        for player_addr in players:
            p_key = f"{room_code}:{player_addr.lower()}"
            elim = self.player_eliminated.get(p_key) == "true"
            xp = int(self.player_xp.get(p_key) or "0")
            
            if xp >= 100:
                self._add_to_log(room_code, "WINS (XP Limit Reached)!", player_addr)
                self._conclude_game_session(room_code)
                return
            
            if not elim:
                active_players.append(player_addr)
        
        if len(active_players) == 1 and len(players) > 1:
            winner = active_players[0]
            self._add_to_log(room_code, "WINS (Last Player Standing)!", winner)
            self._conclude_game_session(room_code)
        elif len(active_players) == 0:
            self._add_to_log(room_code, "💀 Everyone was eliminated! No winner.")
            self._conclude_game_session(room_code)

    @gl.public.write
    def end_turn(self, room_code: str) -> None:
        self._check_room(room_code)
        """Finish turn and pass to next player"""
        player_addr = self._get_sender()
        
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
        
        if current_player.lower() != player_addr.lower():
            raise Exception("Not your turn")
            
        # Advance turn (skipping eliminated players)
        next_turn = (turn_index + 1) % len(players)
        found_active = False
        for _ in range(len(players)):
            next_player = players[next_turn].lower()
            next_key = f"{room_code}:{next_player}"
            if self.player_eliminated.get(next_key) != "true":
                found_active = True
                break
            next_turn = (next_turn + 1) % len(players)
            
        if not found_active:
            # If everyone is eliminated somehow, just use next_turn anyway
            # but usually _check_winners would end the game
            next_turn = (turn_index + 1) % len(players)

        self.current_turn[room_code] = str(next_turn)
        self.turn_phase[room_code] = "rolling"
        self.turn_active_mult[room_code] = "1"
        self._add_to_log(room_code, f"Passed turn to {self._get_player_label(room_code, players[next_turn])}")

    @gl.public.write
    def force_end_turn(self, room_code: str) -> None:
        """Any player in room can call this to skip the current player's turn on timeout"""
        self._check_room(room_code)
        caller = self._get_sender()
        if self.player_in_room.get(f"{room_code}:{caller}") != "true":
            raise Exception("Not in room")
        
        started = self.game_started.get(room_code)
        if started != "true":
            raise Exception("Game not started")

        players_str = self.players_list.get(room_code)
        if not players_str:
            raise Exception("No players")
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]

        self._add_to_log(room_code, "timed out. Turn skipped!", current_player)

        # Clear any pending phases
        phase = self.turn_phase.get(room_code) or "rolling"
        if phase == "stealing_response":
            self.pending_steal_target[room_code] = ""
            self.pending_steal_attacker[room_code] = ""
        if phase == "auctioning":
            self.auction_passed[room_code] = ""
            self.auction_highest_bid[room_code] = "0"
            self.auction_highest_bidder[room_code] = ""

        # Advance turn (skipping eliminated players)
        next_turn = (turn_index + 1) % len(players)
        for _ in range(len(players)):
            next_p = players[next_turn].lower()
            next_key = f"{room_code}:{next_p}"
            if self.player_eliminated.get(next_key) != "true":
                break
            next_turn = (next_turn + 1) % len(players)

        self.current_turn[room_code] = str(next_turn)
        self.turn_phase[room_code] = "rolling"
        self.turn_active_mult[room_code] = "1"
        self._add_to_log(room_code, f"Passed turn to {self._get_player_label(room_code, players[next_turn])}")

    @gl.public.write
    def close_inactive_room(self, room_code: str) -> str:
        """Explicitly close a room that has been inactive for > 10 minutes"""
        if self._is_room_expired(room_code):
            self.game_finished[room_code] = "true"
            self._add_to_log(room_code, "💀 Room closed due to inactivity.")
            return "Room closed"
        return "Room still active"

    def _conclude_game_session(self, room_code: str) -> None:
        """Internal: Finish game and update leaderboards"""
        self.game_finished[room_code] = "true"
        self.game_started[room_code] = "false" # Mark as not started anymore
        
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
            player_addr = player_addr.lower()
            key = f"{room_code}:{player_addr}"
            xp_str = self.player_xp.get(key)
            xp = int(xp_str) if xp_str else 0
            scores.append(f"{player_addr}:{xp}")
            
            # Simplified winner logic: must not be eliminated to win
            elim_key = f"{room_code}:{player_addr}"
            is_elim = self.player_eliminated.get(elim_key) == "true"
            
            if not is_elim and xp > max_xp:
                max_xp = xp
                winner = player_addr
            elif not is_elim and xp == max_xp and winner == "":
                winner = player_addr
        
        # Fallback if everyone was eliminated
        if winner == "" and players:
            winner = players[0].lower()
        
        # Tie-breaker: if multiple players have max_xp, earlier in list wins (simplification)
        # but usually 100 XP is reached by one person first.
        
        # Update leaderboards for all players
        now_ts = self._get_now()
        week_id = self._get_current_week_id(now_ts)
        day_id = self._get_current_day_id(now_ts)
        timestamp = str(now_ts)
        
        # Store game history
        game_id = self.game_counter or "0"
        self.game_counter = str(int(game_id) + 1)
        history = f"{winner}|{players_str}|{','.join(scores)}|{timestamp}"
        self.game_history[game_id] = history
        self.room_leaderboard[room_code] = "|".join(scores)
        
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
    
    def _get_game_state_summary(self, room_code: str) -> str:
        """Internal: Get a summary of the game state for the AI Council"""
        players_str = self.players_list.get(room_code)
        if not players_str: return "No players"
        players = players_str.split(',')
        
        summary = []
        for p in players:
            p = p.lower()
            key = f"{room_code}:{p}"
            xp = self.player_xp.get(key) or "0"
            pos = self.player_position.get(key) or "0"
            shields = self.player_shields.get(key) or "0"
            mult = "2x active" if self.player_multiplier.get(key) == "1" else "no mult"
            elim = "ELIMINATED" if self.player_eliminated.get(key) == "true" else "active"
            summary.append(f"Player {p[:6]}: {xp} XP, Position {pos}, {shields} Shields, {mult}, {elim}")
            
        return "\n".join(summary)

    @gl.public.write
    def handle_governance_block(self, room_code: str) -> None:
        self._check_room(room_code)
        """Land on governance block - AI Council immediately deliberates"""
        player_addr = self._get_sender()
        key = f"{room_code}:{player_addr.lower()}"
        
        in_room = self.player_in_room.get(key)
        if not in_room: raise Exception("Not in room")

        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        if current_player.lower() != player_addr.lower(): raise Exception("Not your turn")
        
        # Reset previous reasoning/proposal
        self.governance_reasoning[room_code] = ""
        self.governance_proposal[room_code] = "none"
        
        phase = self.turn_phase.get(room_code)
        if phase != "acting": raise Exception(f"Not in acting phase (Current: {phase})")
        
        self.turn_phase[room_code] = "governing"
        self.governance_active[room_code] = "true"
        self._add_to_log(room_code, "⚖️ AI Council is deliberating...", player_addr)

        game_sum = self._get_game_state_summary(room_code)

        prompt = f"""
        You are the GenLayer AI Governance Council. The game is Gen Blocks.
        Current Game State:
        {game_sum}

        The Council must vote on which of these 6 Global Directives to enforce:
        1. group_xp: +5 XP for ALL players
        2. shield_all: Give ALL players 1 Shield
        3. burn_shields: Destroy ALL shields in game
        4. strip_multipliers: Remove ALL 2x multipliers in game
        5. grant_multipliers: Give EVERYONE a 2x multiplier
        6. tax_players: -5 XP for ALL players
        
        Simulate a council of 3 Agents:
        - Auditor Alpha (Conservative, prefers balance)
        - Chaos Bot (Wants to mess with leaders)
        - Unity (Wants to help everyone or catch up the weak)

        Each agent must pick one directive and provide a one-sentence reason.
        Then, determine the majority winner. If there's no majority, the chair chooses the best one for the active player ({player_addr[:6]}).

        Return EXACTLY in this format:
        WINNER: [directive_id]
        REASONING: [Brief summary of the deliberation]
        """

        # AI deliberation call
        result = gl.ai_call(
            model="gpt-4o",
            prompt=prompt,
            max_tokens=300
        )
        
        result_text = result.strip()
        winner_id = "group_xp" # default
        reasoning = "The council has spoken."
        
        winner_match = re.search(r"WINNER:\s*(\w+)", result_text)
        reason_match = re.search(r"REASONING:\s*(.*)", result_text, re.DOTALL)
        
        if winner_match:
            winner_id = winner_match.group(1).lower().replace(" ", "").strip()
        if reason_match:
            reasoning = reason_match.group(1).strip()
            
        valid_options = ["group_xp", "shield_all", "burn_shields", "strip_multipliers", "grant_multipliers", "tax_players"]
        if winner_id not in valid_options:
            winner_id = "group_xp"
            
        descriptions = {
            "group_xp": "+5 XP for ALL players",
            "shield_all": "Give ALL players 1 Shield",
            "burn_shields": "Destroy ALL shields in game",
            "strip_multipliers": "Remove ALL 2x multipliers in game",
            "grant_multipliers": "Give EVERYONE a 2x multiplier",
            "tax_players": "-5 XP for ALL players"
        }
        
        self.governance_proposal[room_code] = f"{winner_id}:{descriptions[winner_id]}"
        self.governance_reasoning[room_code] = reasoning
        
        # Apply effects
        for addr in players:
            p_key = f"{room_code}:{addr.lower()}"
            if winner_id == "shield_all":
                s = int(self.player_shields.get(p_key) or "0")
                self.player_shields[p_key] = str(s + 1)
            elif winner_id == "group_xp":
                x = int(self.player_xp.get(p_key) or "0")
                self.player_xp[p_key] = str(x + 5)
            elif winner_id == "tax_players":
                self._deduct_xp(room_code, addr, 5)
            elif winner_id == "burn_shields":
                self.player_shields[p_key] = "0"
            elif winner_id == "strip_multipliers":
                self.player_multiplier[p_key] = "0"
            elif winner_id == "grant_multipliers":
                m = int(self.player_multiplier.get(p_key) or "0")
                self.player_multiplier[p_key] = str(m + 1)
        
        self.governance_active[room_code] = "true" # Keep active to show result
        self.turn_phase[room_code] = "finishing"
        self._add_to_log(room_code, f"AI Decision: {descriptions[winner_id]}")
        self._check_winners(room_code)
    
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
    # Removed create_governance_proposal, vote_on_proposal, timeout_governance_vote, _next_governance_voter, execute_governance
    
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
                week_id = self._get_current_week_id() # Uses _get_now_view internally
                key = f"{addr}:{week_id}"
                xp = self.weekly_total_xp.get(key) or "0"
                games = self.weekly_games_played.get(key) or "0"
                wins = self.weekly_games_won.get(key) or "0"
            elif period == 'daily':
                day_id = self._get_current_day_id() # Uses _get_now_view internally
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
        return creator
    
    @gl.public.view
    def get_player_count(self, room_code: str) -> str:
        count = self.room_count.get(room_code)
        return count if count is not None else "0"
    
    @gl.public.view
    def is_game_started(self, room_code: str) -> str:
        started = self.game_started.get(room_code)
        return "true" if started == "true" else "false"
    
    @gl.public.view
    def is_player_in_room(self, room_code: str, player: str) -> str:
        key = f"{room_code}:{player.lower()}"
        in_room = self.player_in_room.get(key)
        return "true" if in_room == "true" else "false"
    
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
    def get_player_multiplier(self, room_code: str, player: str) -> str:
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
                    return "true"
                    
        return "true" if mult > 0 else "false"
    
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
        gov_active = self.governance_active.get(room_code) or "false"
        gov_prop = self.governance_proposal.get(room_code) or "none"
        gov_reason = self.governance_reasoning.get(room_code) or "none"
        
        results = []
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = ""
        p_list = players_str.split(',')
        if len(p_list) > 0:
            current_player = p_list[turn_index % len(p_list)].lower()
            
        for addr in p_list:
            key = f"{room_code}:{addr.lower()}"
            xp = self.player_xp.get(key) or "0"
            pos = self.player_position.get(key) or "0"
            shields = self.player_shields.get(key) or "0"
            combo = self.player_combo.get(key) or "0"
            
            # Determine visual multiplier flag
            m_val = self.player_multiplier.get(key) or "0"
            mult_val = int(m_val)
            is_mult = "1" if mult_val > 0 else "0"
            
            if current_player == addr.lower() and self.turn_active_mult.get(room_code) == "2":
                is_mult = "1"
            
            elim = "1" if self.player_eliminated.get(key) == "true" else "0"
            roll = self.last_dice_roll.get(key) or "0"
            results.append(f"{addr.lower()}:{xp}:{pos}:{shields}:{combo}:{is_mult}:{elim}:{roll}")
        
        players_data = "|".join(results)
        # Sanitize reasoning and proposal to avoid corrupting the semicolon-separated string
        clean_prop = gov_prop.replace(';', ':')
        clean_reason = gov_reason.replace(';', '.')
        
        # Returns consolidated state: turn;start;phase;players;steal_target;steal_attacker;auction_bid;auction_bidder;auction_turn;auction_passed;gov_active;gov_prop;gov_reasoning
        return f"{turn_idx};0;{phase};{players_data};{pending_target};{pending_attacker};{auction_bid};{auction_bidder};{auction_turn};{auction_passed};{gov_active};{clean_prop};{clean_reason}"

    @gl.public.view
    def get_active_room(self, player_addr: str) -> str:
        """Return the room_code if the player is in an unfinished game"""
        clean_addr = self._clean_addr(player_addr)
        room = self.player_active_room.get(clean_addr)
        return room if room else "none"
    
    @gl.public.view
    def is_player_turn(self, room_code: str, player: str) -> str:
        players_str = self.players_list.get(room_code)
        if not players_str:
            return "false"
        
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        return "true" if current_player.lower() == player.lower() else "false"
    
    @gl.public.view
    def is_room_game_over(self, room_code: str) -> str:
        """Return 'FINISHED', 'EXPIRED' or 'ACTIVE' to avoid boolean ambiguity"""
        finished = self.game_finished.get(room_code)
        if finished == "true":
            return "FINISHED"
        if self._is_room_expired(room_code):
            return "EXPIRED"
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
        """Get current governance proposal and reasoning"""
        proposal = self.governance_proposal.get(room_code)
        active = self.governance_active.get(room_code) == "true"
        reasoning = self.governance_reasoning.get(room_code) or "none"
        
        if not active or not proposal:
            return "none"
        return f"{proposal}|{reasoning}"

    @gl.public.view
    def get_full_game_state(self, room_code: str) -> str:
        """Consolidated polling for frontend reduction in RPC calls."""
        try:
            player_data = self.get_all_player_data(room_code)
            gov_proposal = self.get_governance_proposal(room_code)
            room_log = self.room_log.get(room_code) or "none"
            game_over = self.is_room_game_over(room_code)
            
            # Use ~ as a unique separator between main modules
            return f"{player_data}~{gov_proposal}~{room_log}~{game_over}"
        except Exception as e:
            return f"ERROR: {str(e)}"
    
    # Block interaction functions (keeping existing ones)
    @gl.public.write
    def handle_build_block(self, room_code: str) -> None:
        self._check_room(room_code)
        
        phase = self.turn_phase.get(room_code)
        if phase != "acting": raise Exception(f"Not in acting phase (Current: {phase})")
        player_addr = self._get_sender()
        key = f"{room_code}:{player_addr.lower()}"
        
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
        self.turn_phase[room_code] = "finishing"
        self._add_to_log(room_code, f"built (+{xp_gain} XP)", player_addr)
        
        if current_combo + 1 >= 3:
            mults = int(self.player_multiplier.get(key) or "0")
            self.player_multiplier[key] = str(mults + 1)
            self._add_to_log(room_code, "2X EARNED!", player_addr)
            
        self._check_winners(room_code)
    
    @gl.public.write
    def handle_bonus_block(self, room_code: str) -> None:
        self._check_room(room_code)
        player_addr = self._get_sender()
        key = f"{room_code}:{player_addr.lower()}"
        
        phase = self.turn_phase.get(room_code)
        if phase != "acting": raise Exception(f"Not in acting phase (Current: {phase})")
        
        in_room = self.player_in_room.get(key)
        if not in_room:
            raise Exception("Not in room")
            
        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player_addr.lower():
            raise Exception("Not your turn")
        
        # Deterministic Choice
        reward_type = self._deterministic_rand(room_code, 2, "bonus")
        
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
            
        self.turn_phase[room_code] = "finishing"
        self._check_winners(room_code)
    
    @gl.public.write
    def handle_mystery_block(self, room_code: str) -> None:
        self._check_room(room_code)
        player_addr = self._get_sender()
        key = f"{room_code}:{player_addr.lower()}"
        
        phase = self.turn_phase.get(room_code)
        if phase != "acting": raise Exception(f"Not in acting phase (Current: {phase})")
        
        in_room = self.player_in_room.get(key)
        if not in_room:
            raise Exception("Not in room")

        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player_addr.lower():
            raise Exception("Not your turn")
        
        reward_val = self._deterministic_rand(room_code, 10, "mystery")
        
        if reward_val < 7:
            base_xp = self._deterministic_rand(room_code, 15, "mystery_xp") + 5
            active_mult = int(self.turn_active_mult.get(room_code) or "1")
            xp_gain = base_xp * active_mult
            current_xp = int(self.player_xp.get(key) or "0")
            self.player_xp[key] = str(current_xp + xp_gain)
            self._add_to_log(room_code, f"Mystery: +{xp_gain} XP")
        else:
            current_shields = int(self.player_shields.get(key) or "0")
            self.player_shields[key] = str(current_shields + 1)
            self._add_to_log(room_code, "Mystery: Shield Found")
            
        self.turn_phase[room_code] = "finishing"
        self._check_winners(room_code)
    
    @gl.public.write
    def handle_lucky_block(self, room_code: str) -> None:
        self._check_room(room_code)
        player_addr = self._get_sender()
        key = f"{room_code}:{player_addr.lower()}"
        
        phase = self.turn_phase.get(room_code)
        if phase != "acting": raise Exception(f"Not in acting phase (Current: {phase})")
        
        in_room = self.player_in_room.get(key)
        if not in_room:
            raise Exception("Not in room")

        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player_addr.lower():
            raise Exception("Not your turn")
        
        reward = self._deterministic_rand(room_code, 4, "lucky")
        
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
            self._add_to_log(room_code, "Lucky: No Reward", player_addr)
            
        self.turn_phase[room_code] = "finishing"
        self._check_winners(room_code)
    
    @gl.public.write
    def handle_steal_block(self, room_code: str, target_player: str) -> None:
        self._check_room(room_code)
        player_addr = self._get_sender()
        key = f"{room_code}:{player_addr.lower()}"
        target_key = f"{room_code}:{target_player.lower()}"
        
        in_room = self.player_in_room.get(key)
        if not in_room:
            raise Exception("Not in room")
            
        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player_addr.lower():
            raise Exception("Not your turn")
        
        target_in_room = self.player_in_room.get(target_key)
        if not target_in_room:
            raise Exception("Target not in room")
            
        phase = self.turn_phase.get(room_code)
        if phase != "acting": raise Exception(f"Not in acting phase (Current: {phase})")

        # Transition to steal response phase
        self.turn_phase[room_code] = "stealing_response"
        self.pending_steal_target[room_code] = target_player.lower()
        self.pending_steal_attacker[room_code] = player_addr.lower()
        
        # We cannot use time.time() directly due to determinism, we have to rely on frontend enforcing the 40s wait
        # Alternatively, we just let frontend submit "timeout" as an action.

        self._add_to_log(room_code, f"initiated steal on {self._get_player_label(room_code, target_player)}", player_addr)

    @gl.public.write
    def respond_to_steal(self, room_code: str, action: str) -> None:
        self._check_room(room_code)
        player_addr = self._get_sender()
        
        phase = self.turn_phase.get(room_code)
        if phase != "stealing_response":
            raise Exception("No active steal response phase")

        pending_target = self.pending_steal_target.get(room_code)
        if action != "timeout" and pending_target.lower() != player_addr.lower():
            raise Exception("You are not the steal target")
        
        target_lower = pending_target.lower()
            
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
            self._add_to_log(room_code, f"timed out. {self._get_player_label(room_code, pending_attacker)} stole {steal_amount} XP!", target_lower)
            
        elif action == "shield":
            shields = int(self.player_shields.get(target_key) or "0")
            if shields <= 0:
                raise Exception("No shields available")
            self.player_shields[target_key] = str(shields - 1)
            self._add_to_log(room_code, "blocked steal with shield!", target_lower)
            
        elif action == "forfeit":
            target_xp = int(self.player_xp.get(target_key) or "0")
            
            base_penalty = 7
            active_mult = int(self.turn_active_mult.get(room_code) or "1")
            penalty = base_penalty * active_mult
            
            if target_xp < penalty:
                raise Exception(f"Not enough XP to forfeit (Needs {penalty}, has {target_xp})")
                
            self._deduct_xp(room_code, target_lower, penalty)
            self._add_to_log(room_code, f"forfeited {penalty} XP to block steal!", target_lower)
            
        elif action == "allow":
            target_xp = int(self.player_xp.get(target_key) or "0")
            attacker_xp = int(self.player_xp.get(attacker_key) or "0")
            steal_amount = min(5, target_xp)
            
            self._deduct_xp(room_code, target_lower, steal_amount)
            self.player_xp[attacker_key] = str(attacker_xp + steal_amount)
            self._add_to_log(room_code, f"stole {steal_amount} XP!", pending_attacker)
            
        else:
            raise Exception("Invalid action")
            
        # Finish steal phase
        self.turn_phase[room_code] = "finishing"
        self.pending_steal_target[room_code] = ""
        self.pending_steal_attacker[room_code] = ""
        
        self._check_winners(room_code)

    def _finish_auction(self, room_code: str) -> None:
        winner = self.auction_highest_bidder.get(room_code) or ""
        if winner and winner != "none":
            bid = int(self.auction_highest_bid.get(room_code) or "0")
            key = f"{room_code}:{winner}"
            
            player_xp = int(self.player_xp.get(key) or "0")
            self.player_xp[key] = str(max(0, player_xp - bid))
            
            mults = int(self.player_multiplier.get(key) or "0")
            self.player_multiplier[key] = str(mults + 1)
            
            self._add_to_log(room_code, f"Auction won for {bid} XP!", winner)
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
        self._check_room(room_code)
        
        phase = self.turn_phase.get(room_code)
        if phase != "acting": raise Exception(f"Not in acting phase (Current: {phase})")
        player_addr = self._get_sender()
        key = f"{room_code}:{player_addr.lower()}"
        
        in_room = self.player_in_room.get(key)
        if not in_room: raise Exception("Not in room")

        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player_addr.lower():
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
        self._check_room(room_code)
        player_addr = self._get_sender().lower()
        
        phase = self.turn_phase.get(room_code)
        if phase != "auctioning":
            raise Exception("No active auction")
            
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        auc_turn_index = int(self.auction_turn_index.get(room_code) or "0")
        current_bidder = players[auc_turn_index].lower()
        
        if player_addr != current_bidder and action != "timeout":
            raise Exception("Not your turn to bid")
            
        if action == "pass" or action == "timeout":
            passed_str = self.auction_passed.get(room_code) or ""
            passed_list = passed_str.split(',') if passed_str else []
            # whoever is the current bidder is the one getting skipped
            skip_addr = current_bidder
            if skip_addr not in passed_list:
                passed_list.append(skip_addr)
                self.auction_passed[room_code] = ",".join(passed_list)
                if action == "timeout":
                    self._add_to_log(room_code, "timed out.", skip_addr)
                else:    
                    self._add_to_log(room_code, "passed.", skip_addr)
            self._next_auction_bidder(room_code)
            return
            
        if action == "bid":
            bid = int(bid_amount)
            current_highest = int(self.auction_highest_bid.get(room_code) or "0")
            
            min_bid = max(2, current_highest + 1)
            if bid < min_bid:
                raise Exception(f"Bid too low. Minimum is {min_bid}")
                
            key = f"{room_code}:{player_addr}"
            player_xp = int(self.player_xp.get(key) or "0")
            if bid > player_xp:
                raise Exception("Not enough XP")
                
            self.auction_highest_bid[room_code] = str(bid)
            self.auction_highest_bidder[room_code] = player_addr
            self._add_to_log(room_code, f"bids {bid} XP.", player_addr)
            
            self._next_auction_bidder(room_code)
            return
            
        raise Exception("Invalid action")

    @gl.public.write
    def handle_end_block(self, room_code: str) -> None:
        self._check_room(room_code)
        player_addr = self._get_sender()
        key = f"{room_code}:{player_addr.lower()}"
        
        phase = self.turn_phase.get(room_code)
        if phase != "acting": raise Exception(f"Not in acting phase (Current: {phase})")

        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player_addr.lower():
            raise Exception("Not your turn")
        # Deduct 10 XP and eliminate player permanently
        self._deduct_xp(room_code, player_addr, 10)
        
        # Immediate explicit elimination
        self.player_eliminated[key] = "true" 
        self.turn_phase[room_code] = "finishing"
        self._add_to_log(room_code, "💀 REACHED THE END - PERMANENTLY ELIMINATED!", player_addr)
        
        # Check if this elimination ends the entire game
        self._check_winners(room_code)

    @gl.public.write
    def handle_danger_block(self, room_code: str) -> None:
        self._check_room(room_code)
        
        phase = self.turn_phase.get(room_code)
        if phase != "acting": raise Exception(f"Not in acting phase (Current: {phase})")
        player_addr = self._get_sender()
        key = f"{room_code}:{player_addr.lower()}"
        
        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player_addr.lower():
            raise Exception("Not your turn")
        current_xp = int(self.player_xp.get(key) or "0")
        
        base_penalty = 2
        active_mult = int(self.turn_active_mult.get(room_code) or "1")
        penalty = base_penalty * active_mult
        
        self._deduct_xp(room_code, player_addr, penalty)
        self.turn_phase[room_code] = "finishing"
        self._add_to_log(room_code, f"lost {penalty} XP", player_addr)
        self._check_winners(room_code)

    @gl.public.write
    def handle_hazard_block(self, room_code: str) -> None:
        self._check_room(room_code)
        
        phase = self.turn_phase.get(room_code)
        if phase != "acting": raise Exception(f"Not in acting phase (Current: {phase})")
        player_addr = self._get_sender()
        key = f"{room_code}:{player_addr.lower()}"
        
        # Validate turn ownership
        players_str = self.players_list.get(room_code)
        players = players_str.split(',')
        turn_index = int(self.current_turn.get(room_code) or "0")
        current_player = players[turn_index % len(players)]
        
        if current_player.lower() != player_addr.lower():
            raise Exception("Not your turn")
        current_xp = int(self.player_xp.get(key) or "0")
        
        base_penalty = 5
        active_mult = int(self.turn_active_mult.get(room_code) or "1")
        penalty = base_penalty * active_mult
        
        self.turn_phase[room_code] = "finishing"
        self._deduct_xp(room_code, player_addr, penalty)
        self._add_to_log(room_code, f"lost {penalty} XP", player_addr)
        self._check_winners(room_code)