// Colyseus Schema classes (synchronized room state)
export { TestPlayer, ChatMessage, TestRoomState } from "./schemas/TestRoomState";
export { LobbyPlayerSlot, LobbyState } from "./schemas/LobbyState";
export { GameUnit, GamePlayerSlot, GameState } from "./schemas/GameState";

// Plain TypeScript types (metadata, enums, value objects)
export * from "./types";

// Room name constants (shared between client and server)
export * from "./rooms";
