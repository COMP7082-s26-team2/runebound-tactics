-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "player" (
    "player_id" BIGSERIAL NOT NULL,
    "username" VARCHAR(255),
    "password_hash" VARCHAR(255),

    CONSTRAINT "player_pkey" PRIMARY KEY ("player_id")
);

-- CreateTable
CREATE TABLE "guild" (
    "guild_id" BIGSERIAL NOT NULL,
    "guild_name" VARCHAR(255),
    "description" TEXT,
    "total_wins" INTEGER DEFAULT 0,
    "total_losses" INTEGER DEFAULT 0,
    "leaderboard_rank" INTEGER,

    CONSTRAINT "guild_pkey" PRIMARY KEY ("guild_id")
);

-- CreateTable
CREATE TABLE "guild_member" (
    "guild_member_id" BIGSERIAL NOT NULL,
    "guild_id" BIGINT,
    "player_id" BIGINT,
    "role" VARCHAR(50),

    CONSTRAINT "guild_member_pkey" PRIMARY KEY ("guild_member_id")
);

-- CreateTable
CREATE TABLE "guild_invite" (
    "guild_invite_id" BIGSERIAL NOT NULL,
    "guild_id" BIGINT,
    "player_id" BIGINT,
    "initiated_by" BIGINT,
    "status" VARCHAR(50) DEFAULT 'pending',

    CONSTRAINT "guild_invite_pkey" PRIMARY KEY ("guild_invite_id")
);

-- CreateTable
CREATE TABLE "game_match" (
    "match_id" BIGSERIAL NOT NULL,
    "status" VARCHAR(50) DEFAULT 'waiting',
    "current_turn_player_id" BIGINT,
    "winner_player_id" BIGINT,
    "turn_number" INTEGER DEFAULT 1,

    CONSTRAINT "game_match_pkey" PRIMARY KEY ("match_id")
);

-- CreateTable
CREATE TABLE "match_player" (
    "match_player_id" BIGSERIAL NOT NULL,
    "match_id" BIGINT,
    "player_id" BIGINT,
    "team_side" INTEGER,
    "is_ready" BOOLEAN DEFAULT false,

    CONSTRAINT "match_player_pkey" PRIMARY KEY ("match_player_id")
);

-- CreateTable
CREATE TABLE "unit_type" (
    "unit_type_id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255),
    "class_type" VARCHAR(100),
    "role_type" VARCHAR(100),
    "base_hp" INTEGER,
    "base_attack" INTEGER,
    "move_range" INTEGER,
    "attack_range" INTEGER,

    CONSTRAINT "unit_type_pkey" PRIMARY KEY ("unit_type_id")
);

-- CreateTable
CREATE TABLE "unit" (
    "unit_id" BIGSERIAL NOT NULL,
    "match_id" BIGINT,
    "owner_player_id" BIGINT,
    "unit_type_id" BIGINT,
    "current_hp" INTEGER,
    "pos_x" INTEGER,
    "pos_y" INTEGER,
    "is_alive" BOOLEAN DEFAULT true,

    CONSTRAINT "unit_pkey" PRIMARY KEY ("unit_id")
);

-- CreateTable
CREATE TABLE "turn" (
    "turn_id" BIGSERIAL NOT NULL,
    "match_id" BIGINT,
    "player_id" BIGINT,
    "turn_number" INTEGER,
    "actions_remaining" INTEGER DEFAULT 2,

    CONSTRAINT "turn_pkey" PRIMARY KEY ("turn_id")
);

-- CreateTable
CREATE TABLE "resource" (
    "resource_id" BIGSERIAL NOT NULL,
    "match_id" BIGINT,
    "player_id" BIGINT,
    "current_gold" INTEGER DEFAULT 0,
    "passive_income" INTEGER DEFAULT 10,

    CONSTRAINT "resource_pkey" PRIMARY KEY ("resource_id")
);

-- CreateTable
CREATE TABLE "card" (
    "card_id" BIGSERIAL NOT NULL,
    "name" VARCHAR(255),
    "effect_type" VARCHAR(100),
    "cost" INTEGER,
    "description" TEXT,

    CONSTRAINT "card_pkey" PRIMARY KEY ("card_id")
);

-- CreateTable
CREATE TABLE "player_deck" (
    "player_deck_id" BIGSERIAL NOT NULL,
    "player_id" BIGINT,
    "card_id" BIGINT,

    CONSTRAINT "player_deck_pkey" PRIMARY KEY ("player_deck_id")
);

-- CreateTable
CREATE TABLE "game_action" (
    "action_id" BIGSERIAL NOT NULL,
    "match_id" BIGINT,
    "player_id" BIGINT,
    "unit_id" BIGINT,
    "target_unit_id" BIGINT,
    "action_type" VARCHAR(50),
    "from_x" INTEGER,
    "from_y" INTEGER,
    "to_x" INTEGER,
    "to_y" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_action_pkey" PRIMARY KEY ("action_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "player_username_key" ON "player"("username");

-- CreateIndex
CREATE UNIQUE INDEX "guild_guild_name_key" ON "guild"("guild_name");

-- AddForeignKey
ALTER TABLE "guild_member" ADD CONSTRAINT "guild_member_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild"("guild_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "guild_member" ADD CONSTRAINT "guild_member_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("player_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "guild_invite" ADD CONSTRAINT "guild_invite_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guild"("guild_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "guild_invite" ADD CONSTRAINT "guild_invite_initiated_by_fkey" FOREIGN KEY ("initiated_by") REFERENCES "player"("player_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "guild_invite" ADD CONSTRAINT "guild_invite_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("player_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "game_match" ADD CONSTRAINT "game_match_current_turn_player_id_fkey" FOREIGN KEY ("current_turn_player_id") REFERENCES "player"("player_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "game_match" ADD CONSTRAINT "game_match_winner_player_id_fkey" FOREIGN KEY ("winner_player_id") REFERENCES "player"("player_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_player" ADD CONSTRAINT "match_player_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "game_match"("match_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "match_player" ADD CONSTRAINT "match_player_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("player_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "game_match"("match_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_owner_player_id_fkey" FOREIGN KEY ("owner_player_id") REFERENCES "player"("player_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "unit" ADD CONSTRAINT "unit_unit_type_id_fkey" FOREIGN KEY ("unit_type_id") REFERENCES "unit_type"("unit_type_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "turn" ADD CONSTRAINT "turn_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "game_match"("match_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "turn" ADD CONSTRAINT "turn_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("player_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "game_match"("match_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "resource" ADD CONSTRAINT "resource_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("player_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_deck" ADD CONSTRAINT "player_deck_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "card"("card_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "player_deck" ADD CONSTRAINT "player_deck_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("player_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "game_action" ADD CONSTRAINT "game_action_match_id_fkey" FOREIGN KEY ("match_id") REFERENCES "game_match"("match_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "game_action" ADD CONSTRAINT "game_action_player_id_fkey" FOREIGN KEY ("player_id") REFERENCES "player"("player_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "game_action" ADD CONSTRAINT "game_action_target_unit_id_fkey" FOREIGN KEY ("target_unit_id") REFERENCES "unit"("unit_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "game_action" ADD CONSTRAINT "game_action_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "unit"("unit_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

