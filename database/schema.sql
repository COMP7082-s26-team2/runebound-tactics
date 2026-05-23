-- ==========================================
-- Runebound Tactic: PostgreSQL Schema & Seed Data
-- ==========================================

-- 1. CLEANUP (Optional: Drops tables in reverse order of dependencies)
DROP TABLE IF EXISTS game_action CASCADE;
DROP TABLE IF EXISTS player_deck CASCADE;
DROP TABLE IF EXISTS card CASCADE;
DROP TABLE IF EXISTS resource CASCADE;
DROP TABLE IF EXISTS turn CASCADE;
DROP TABLE IF EXISTS unit CASCADE;
DROP TABLE IF EXISTS unit_type CASCADE;
DROP TABLE IF EXISTS match_player CASCADE;
DROP TABLE IF EXISTS game_match CASCADE;
DROP TABLE IF EXISTS guild_invite CASCADE;
DROP TABLE IF EXISTS guild_member CASCADE;
DROP TABLE IF EXISTS guild CASCADE;
DROP TABLE IF EXISTS player CASCADE;

-- ==========================================
-- TABLE DEFINITIONS
-- ==========================================

-- Stores each player's account.
CREATE TABLE player (
    player_id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
);

-- Stores guild/clan information.
CREATE TABLE guild (
    guild_id BIGSERIAL PRIMARY KEY,
    guild_name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    total_wins INT DEFAULT 0,
    total_losses INT DEFAULT 0,
    leaderboard_rank INT
);

-- Connects players to guilds.
CREATE TABLE guild_member (
    guild_member_id BIGSERIAL PRIMARY KEY,
    guild_id BIGINT REFERENCES guild(guild_id) ON DELETE CASCADE,
    player_id BIGINT REFERENCES player(player_id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL -- leader, officer, member
);

-- Stores pending guild invitations or join requests.
CREATE TABLE guild_invite (
    guild_invite_id BIGSERIAL PRIMARY KEY,
    guild_id BIGINT REFERENCES guild(guild_id) ON DELETE CASCADE,
    player_id BIGINT REFERENCES player(player_id) ON DELETE CASCADE,
    initiated_by BIGINT REFERENCES player(player_id),
    status VARCHAR(50) DEFAULT 'pending' -- pending, accepted, rejected
);

-- Stores one game session.
CREATE TABLE game_match (
    match_id BIGSERIAL PRIMARY KEY,
    status VARCHAR(50) DEFAULT 'waiting', -- waiting, active, finished
    current_turn_player_id BIGINT REFERENCES player(player_id),
    winner_player_id BIGINT REFERENCES player(player_id),
    turn_number INT DEFAULT 1
);

-- Links players to a match.
CREATE TABLE match_player (
    match_player_id BIGSERIAL PRIMARY KEY,
    match_id BIGINT REFERENCES game_match(match_id) ON DELETE CASCADE,
    player_id BIGINT REFERENCES player(player_id) ON DELETE CASCADE,
    team_side INT,
    is_ready BOOLEAN DEFAULT FALSE
);

-- Stores predefined unit definitions.
CREATE TABLE unit_type (
    unit_type_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    class_type VARCHAR(100),
    role_type VARCHAR(100),
    base_hp INT NOT NULL,
    base_attack INT NOT NULL,
    move_range INT NOT NULL,
    attack_range INT NOT NULL
);

-- Stores live units in battle.
CREATE TABLE unit (
    unit_id BIGSERIAL PRIMARY KEY,
    match_id BIGINT REFERENCES game_match(match_id) ON DELETE CASCADE,
    owner_player_id BIGINT REFERENCES player(player_id),
    unit_type_id BIGINT REFERENCES unit_type(unit_type_id),
    current_hp INT NOT NULL,
    pos_x INT NOT NULL,
    pos_y INT NOT NULL,
    is_alive BOOLEAN DEFAULT TRUE
);

-- Tracks turn ownership and remaining actions.
CREATE TABLE turn (
    turn_id BIGSERIAL PRIMARY KEY,
    match_id BIGINT REFERENCES game_match(match_id) ON DELETE CASCADE,
    player_id BIGINT REFERENCES player(player_id),
    turn_number INT NOT NULL,
    actions_remaining INT DEFAULT 2
);

-- Stores player gold during a match.
CREATE TABLE resource (
    resource_id BIGSERIAL PRIMARY KEY,
    match_id BIGINT REFERENCES game_match(match_id) ON DELETE CASCADE,
    player_id BIGINT REFERENCES player(player_id),
    current_gold INT DEFAULT 0,
    passive_income INT DEFAULT 10
);

-- Stores card definitions.
CREATE TABLE card (
    card_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    effect_type VARCHAR(100),
    cost INT NOT NULL,
    description TEXT
);

-- Stores which cards a player selected.
CREATE TABLE player_deck (
    player_deck_id BIGSERIAL PRIMARY KEY,
    player_id BIGINT REFERENCES player(player_id) ON DELETE CASCADE,
    card_id BIGINT REFERENCES card(card_id) ON DELETE CASCADE
);

-- Stores gameplay history.
CREATE TABLE game_action (
    action_id BIGSERIAL PRIMARY KEY,
    match_id BIGINT REFERENCES game_match(match_id) ON DELETE CASCADE,
    player_id BIGINT REFERENCES player(player_id),
    unit_id BIGINT REFERENCES unit(unit_id),
    target_unit_id BIGINT REFERENCES unit(unit_id),
    action_type VARCHAR(50) NOT NULL, -- move, attack, card, end_turn
    from_x INT,
    from_y INT,
    to_x INT,
    to_y INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- SEED DATA
-- ==========================================

-- Players
INSERT INTO player (player_id, username, password_hash) VALUES
(1, 'Alex', 'hashed_pw_alex'),
(2, 'Ryan', 'hashed_pw_ryan');

-- Guilds
INSERT INTO guild (guild_id, guild_name, description, total_wins, total_losses, leaderboard_rank) VALUES
(1, 'DragonKnights', 'Competitive guild for high-level tactics.', 50, 10, 1);

-- Guild Members
INSERT INTO guild_member (guild_member_id, guild_id, player_id, role) VALUES
(1, 1, 1, 'leader');

-- Guild Invites
INSERT INTO guild_invite (guild_invite_id, guild_id, player_id, initiated_by, status) VALUES
(1, 1, 2, 1, 'pending');

-- Matches
INSERT INTO game_match (match_id, status, current_turn_player_id, turn_number) VALUES
(101, 'active', 1, 4);

-- Match Players
INSERT INTO match_player (match_player_id, match_id, player_id, team_side, is_ready) VALUES
(1, 101, 1, 1, TRUE),
(2, 101, 2, 2, TRUE);

-- Unit Types
INSERT INTO unit_type (unit_type_id, name, class_type, role_type, base_hp, base_attack, move_range, attack_range) VALUES
(1, 'Archer', 'range', 'pawn', 70, 20, 2, 3);

-- Units
INSERT INTO unit (unit_id, match_id, owner_player_id, unit_type_id, current_hp, pos_x, pos_y, is_alive) VALUES
(1001, 101, 1, 1, 70, 2, 5, TRUE);

-- Turns
INSERT INTO turn (turn_id, match_id, player_id, turn_number, actions_remaining) VALUES
(1, 101, 1, 4, 2);

-- Resources
INSERT INTO resource (resource_id, match_id, player_id, current_gold, passive_income) VALUES
(1, 101, 1, 30, 5);

-- Cards
INSERT INTO card (card_id, name, effect_type, cost, description) VALUES
(1, 'Reflect', 'defense', 10, 'Reflects incoming damage back to the attacker.');

-- Player Decks
INSERT INTO player_deck (player_deck_id, player_id, card_id) VALUES
(1, 1, 1);

-- Game Actions
INSERT INTO game_action (action_id, match_id, player_id, unit_id, target_unit_id, action_type, from_x, from_y, to_x, to_y) VALUES
(1, 101, 1, 1001, NULL, 'move', 2, 5, 3, 5),
(2, 101, 1, 1001, NULL, 'attack', 3, 5, 3, 5); -- Target NULL as per user example 2, but could be a target_unit_id if attacking 2001

-- Reset sequences (PostgreSQL ONLY)
SELECT setval(pg_get_serial_sequence('player', 'player_id'), (SELECT MAX(player_id) FROM player));
SELECT setval(pg_get_serial_sequence('guild', 'guild_id'), (SELECT MAX(guild_id) FROM guild));
SELECT setval(pg_get_serial_sequence('guild_member', 'guild_member_id'), (SELECT MAX(guild_member_id) FROM guild_member));
SELECT setval(pg_get_serial_sequence('guild_invite', 'guild_invite_id'), (SELECT MAX(guild_invite_id) FROM guild_invite));
SELECT setval(pg_get_serial_sequence('game_match', 'match_id'), (SELECT MAX(match_id) FROM game_match));
SELECT setval(pg_get_serial_sequence('match_player', 'match_player_id'), (SELECT MAX(match_player_id) FROM match_player));
SELECT setval(pg_get_serial_sequence('unit_type', 'unit_type_id'), (SELECT MAX(unit_type_id) FROM unit_type));
SELECT setval(pg_get_serial_sequence('unit', 'unit_id'), (SELECT MAX(unit_id) FROM unit));
SELECT setval(pg_get_serial_sequence('turn', 'turn_id'), (SELECT MAX(turn_id) FROM turn));
SELECT setval(pg_get_serial_sequence('resource', 'resource_id'), (SELECT MAX(resource_id) FROM resource));
SELECT setval(pg_get_serial_sequence('card', 'card_id'), (SELECT MAX(card_id) FROM card));
SELECT setval(pg_get_serial_sequence('player_deck', 'player_deck_id'), (SELECT MAX(player_deck_id) FROM player_deck));
SELECT setval(pg_get_serial_sequence('game_action', 'action_id'), (SELECT MAX(action_id) FROM game_action));
