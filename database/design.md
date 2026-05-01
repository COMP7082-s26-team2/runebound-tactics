# Runebound Tactic — Database Design

## Overview

The database is designed to support the core systems of **Runebound Tactic**, a multiplayer turn-based tactical strategy game. The schema handles player accounts, guild/clan systems, matchmaking, turn management, units, resources, cards, and gameplay action logging. The design is normalized to reduce redundancy while keeping multiplayer state consistent.

---

# Entity Relationship Diagram (ERD)

```mermaid
erDiagram
    player {
        bigint player_id PK
        varchar username UK
        varchar password_hash
    }

    guild {
        bigint guild_id PK
        varchar guild_name UK
        text description
        int total_wins
        int total_losses
        int leaderboard_rank
    }

    guild_member {
        bigint guild_member_id PK
        bigint guild_id FK
        bigint player_id FK
        varchar role
    }

    guild_invite {
        bigint guild_invite_id PK
        bigint guild_id FK
        bigint player_id FK
        bigint initiated_by FK
        varchar status
    }

    game_match {
        bigint match_id PK
        varchar status
        bigint current_turn_player_id FK
        bigint winner_player_id FK
        int turn_number
    }

    match_player {
        bigint match_player_id PK
        bigint match_id FK
        bigint player_id FK
        int team_side
        boolean is_ready
    }

    unit_type {
        bigint unit_type_id PK
        varchar name
        varchar class_type
        varchar role_type
        int base_hp
        int base_attack
        int move_range
        int attack_range
    }

    unit {
        bigint unit_id PK
        bigint match_id FK
        bigint owner_player_id FK
        bigint unit_type_id FK
        int current_hp
        int pos_x
        int pos_y
        boolean is_alive
    }

    turn {
        bigint turn_id PK
        bigint match_id FK
        bigint player_id FK
        int turn_number
        int actions_remaining
    }

    resource {
        bigint resource_id PK
        bigint match_id FK
        bigint player_id FK
        int current_gold
        int passive_income
    }

    card {
        bigint card_id PK
        varchar name
        varchar effect_type
        int cost
        text description
    }

    player_deck {
        bigint player_deck_id PK
        bigint player_id FK
        bigint card_id FK
    }

    game_action {
        bigint action_id PK
        bigint match_id FK
        bigint player_id FK
        bigint unit_id FK
        bigint target_unit_id FK
        varchar action_type
        int from_x
        int from_y
        int to_x
        int to_y
    }

    guild ||--o{ guild_member : has
    player ||--o{ guild_member : joins

    guild ||--o{ guild_invite : sends
    player ||--o{ guild_invite : receives
    player ||--o{ guild_invite : initiates

    game_match ||--o{ match_player : contains
    player ||--o{ match_player : joins

    game_match ||--o{ unit : contains
    player ||--o{ unit : owns
    unit_type ||--o{ unit : defines

    game_match ||--o{ turn : has
    player ||--o{ turn : takes

    game_match ||--o{ resource : has
    player ||--o{ resource : owns

    player ||--o{ player_deck : builds
    card ||--o{ player_deck : includes

    game_match ||--o{ game_action : records
    player ||--o{ game_action : performs
    unit ||--o{ game_action : acts
```

---

# Table Specifications

## player

Stores each player's account.

Example:

| player_id | username | password_hash |
| --------- | -------- | ------------- |
| 1         | Alex     | hashed_pw     |
| 2         | Ryan     | hashed_pw     |

Used for login, identity, match participation, guild membership, and ownership of units/resources.

---

## guild

Stores guild/clan information.

Example:

| guild_id | guild_name    | description       | total_wins | total_losses | leaderboard_rank |
| -------- | ------------- | ----------------- | ---------- | ------------ | ---------------- |
| 1        | DragonKnights | Competitive guild | 50         | 10           | 1                |

Used for clan membership, guild stats, and leaderboard ranking.

---

## guild_member

Connects players to guilds.

Columns:

* `guild_id` → which guild
* `player_id` → member
* `role` → leader / officer / member

Example:

| guild_member_id | guild_id | player_id | role   |
| --------------- | -------- | --------- | ------ |
| 1               | 1        | 1         | leader |

Used to know who belongs to what guild.

---

## guild_invite

Stores pending guild invitations or join requests.

Columns:

* `guild_id` → inviting guild
* `player_id` → invited player
* `initiated_by` → sender
* `status` → pending / accepted / rejected

Example:

| guild_invite_id | guild_id | player_id | initiated_by | status  |
| --------------- | -------- | --------- | ------------ | ------- |
| 1               | 1        | 2         | 1            | pending |

Used for invite workflows before adding to guild_member.

---

## game_match

Stores one game session.

Columns:

* `status` → waiting / active / finished
* `current_turn_player_id` → whose turn
* `winner_player_id` → winner
* `turn_number` → current round

Example:

| match_id | status | current_turn_player_id | winner_player_id | turn_number |
| -------- | ------ | ---------------------- | ---------------- | ----------- |
| 101      | active | 1                      | NULL             | 4           |

Used as the parent record for the whole match.

---

## match_player

Links players to a match.

Columns:

* `team_side` → 1 or 2
* `is_ready` → ready state before match start

Example:

| match_player_id | match_id | player_id | team_side | is_ready |
| --------------- | -------- | --------- | --------- | -------- |
| 1               | 101      | 1         | 1         | true     |
| 2               | 101      | 2         | 2         | true     |

Used to determine participants and teams.

---

## unit_type

Stores predefined unit definitions.

Example:

| unit_type_id | name   | class_type | role_type | base_hp | base_attack | move_range | attack_range |
| ------------ | ------ | ---------- | --------- | ------- | ----------- | ---------- | ------------ |
| 1            | Archer | range      | pawn      | 70      | 20          | 2          | 3            |

Used as templates for units.

---

## unit

Stores live units in battle.

Example:

| unit_id | match_id | owner_player_id | unit_type_id | current_hp | pos_x | pos_y | is_alive |
| ------- | -------- | --------------- | ------------ | ---------- | ----- | ----- | -------- |
| 1001    | 101      | 1               | 1            | 70         | 2     | 5     | true     |

Used to draw the board and track unit state.

---

## turn

Tracks turn ownership and remaining actions.

Example:

| turn_id | match_id | player_id | turn_number | actions_remaining |
| ------- | -------- | --------- | ----------- | ----------------- |
| 1       | 101      | 1         | 4           | 2                 |

Used to enforce turn-based gameplay.

---

## resource

Stores player gold during a match.

Example:

| resource_id | match_id | player_id | current_gold | passive_income |
| ----------- | -------- | --------- | ------------ | -------------- |
| 1           | 101      | 1         | 30           | 5              |

Used for spawning units and playing cards.

---

## card

Stores card definitions.

Example:

| card_id | name    | effect_type | cost | description              |
| ------- | ------- | ----------- | ---- | ------------------------ |
| 1       | Reflect | defense     | 10   | Reflects incoming damage |

Used as the master list of all cards.

---

## player_deck

Stores which cards a player selected.

Example:

| player_deck_id | player_id | card_id |
| -------------- | --------- | ------- |
| 1              | 1         | 1       |

Used to determine what cards are available in battle.

---

## game_action

Stores gameplay history.

Columns:

* `unit_id` → acting unit
* `target_unit_id` → attacked target (NULL if move)
* `action_type` → move / attack / card / end_turn
* `from_x, from_y` → old position
* `to_x, to_y` → new position

Example:

| action_id | match_id | player_id | unit_id | target_unit_id | action_type | from_x | from_y | to_x | to_y |
| --------- | -------- | --------- | ------- | -------------- | ----------- | ------ | ------ | ---- | ---- |
| 1         | 101      | 1         | 1001    | NULL           | move        | 2      | 5      | 3    | 5    |
| 2         | 101      | 1         | 1001    | 2001           | attack      | 3      | 5      | 3    | 5    |

Used for logging moves, attacks, and debugging match state.
